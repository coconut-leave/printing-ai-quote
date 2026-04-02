import { NextResponse } from 'next/server'
import { extractQuoteParams } from '@/server/ai/extractQuoteParams'
import { calculateAlbumQuote } from '@/server/pricing/albumQuote'
import { calculateFlyerQuote } from '@/server/pricing/flyerQuote'
import { createConversation, getConversationById, addMessageToConversation, createQuoteRecord, getLatestParametersForConversation, updateConversationStatus, createHandoffRecord } from '@/server/db/conversations'

function generateMissingFieldsReply(missingFields: string[]): string {
  const fieldLabels: Record<string, string> = {
    productType: '产品类型',
    finishedSize: '成品尺寸',
    quantity: '数量',
    coverPaper: '封面纸张',
    coverWeight: '封面克重',
    innerPaper: '内页纸张',
    innerWeight: '内页克重',
    bindingType: '装订方式',
    pageCount: '页数',
    paperType: '纸张类型',
    paperWeight: '纸张克重',
    printSides: '印刷面数',
  }

  const missingLabels = missingFields
    .map((f) => fieldLabels[f] || f)
    .join('、')

  return `我已识别部分参数，但还需要补充：${missingLabels}。请提供这些信息。`
}

function generateQuoteReply(result: any): string {
  const qty = result.normalizedParams?.quantity ?? result.quantity ?? 0
  return `已为您生成报价：单价 ¥${result.unitPrice}/本，${qty}本共 ¥${result.totalPrice}，加上运费 ¥${result.shippingFee}、税费 ¥${result.tax}，最终价格 ¥${result.finalPrice}。`
}

function mergeParameters(historical: Record<string, any> | null, current: Record<string, any>): Record<string, any> {
  const merged = { ...historical }

  // 当前参数覆盖历史参数，只合并有效字段
  const validFields = [
    'productType',
    'finishedSize',
    'quantity',
    'coverPaper',
    'coverWeight',
    'innerPaper',
    'innerWeight',
    'bindingType',
    'pageCount',
  ]

  validFields.forEach(key => {
    if (current[key] !== undefined && current[key] !== null) {
      merged[key] = current[key]
    }
  })

  // 清理可能的嵌套 mergedParams
  delete merged.mergedParams
  delete merged.missingFields

  return merged
}

function checkMissingFields(params: Record<string, any>): string[] {
  const productType = (params.productType || 'album').toLowerCase()
  
  let requiredFields: string[]
  if (productType === 'flyer') {
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'paperType',
      'paperWeight',
      'printSides',
    ]
  } else {
    // album
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'coverPaper',
      'coverWeight',
      'innerPaper',
      'innerWeight',
      'bindingType',
      'pageCount',
    ]
  }

  return requiredFields.filter((key) => {
    const value = params[key]
    if (value === undefined || value === null) {
      return true
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true
    }
    return false
  })
}

function isFileBasedInquiry(message: string): boolean {
  const fileKeywords = [
    'pdf', 'ai', 'cdr', 'psd', 'zip',
    '附件', '设计稿', '文件发你了', '按文件报价', '审稿'
  ]

  const lowerMessage = message.toLowerCase()
  return fileKeywords.some(keyword => lowerMessage.includes(keyword))
}

function generateHandoffReply(): string {
  return '您的询价涉及设计文件或专业审稿需求，已为您转接专业人工服务团队进行核价。请稍候，我们的专业人员将尽快联系您。'
}

export async function POST(request: Request) {
  let payload: any

  try {
    payload = await request.json()
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: 'error', message: 'Invalid JSON payload' },
      { status: 400 },
    )
  }

  if (!payload.message || typeof payload.message !== 'string' || payload.message.trim().length === 0) {
    return NextResponse.json(
      { ok: false, status: 'error', message: 'message field is required and must be non-empty' },
      { status: 400 },
    )
  }

  try {
    // conversation 复用/创建
    let conversationId: number
    if (payload.conversationId && typeof payload.conversationId === 'number') {
      const existing = await getConversationById(payload.conversationId)
      if (!existing) {
        const conv = await createConversation()
        conversationId = conv.id
      } else {
        conversationId = existing.id
      }
    } else {
      const conv = await createConversation()
      conversationId = conv.id
    }

    // 记录用户消息
    await addMessageToConversation(conversationId, 'CUSTOMER', payload.message)

    // 1. 检查是否为文件型询价（优先级最高）
    if (isFileBasedInquiry(payload.message)) {
      const reply = generateHandoffReply()

      // 更新会话状态为人工接管
      await updateConversationStatus(conversationId, 'PENDING_HUMAN')

      // 创建人工接管记录
      await createHandoffRecord(conversationId, '涉及设计文件或专业审稿需求', 'design_team')

      // 保存助手消息
      await addMessageToConversation(conversationId, 'ASSISTANT', reply)

      return NextResponse.json({
        ok: true,
        status: 'handoff_required',
        conversationId,
        reply,
      })
    }

    // 2. 抽取当前消息的参数
    const currentExtracted = await extractQuoteParams(payload.message)

    // 2. 如果有 conversationId，获取历史参数并合并
    let mergedParams: Record<string, any> = { ...currentExtracted }
    if (payload.conversationId) {
      const historicalParams = await getLatestParametersForConversation(conversationId)
      if (historicalParams) {
        mergedParams = mergeParameters(historicalParams, currentExtracted)
      }
    }

    // 3. 检查合并后的参数是否完整
    const missingFields = checkMissingFields(mergedParams)

    // 4. 如果仍缺参数
    if (missingFields.length > 0) {
      const reply = generateMissingFieldsReply(missingFields)
      
      // 更新会话状态为缺参
      await updateConversationStatus(conversationId, 'MISSING_FIELDS')
      
      await addMessageToConversation(conversationId, 'ASSISTANT', reply, { 
        extractedParams: currentExtracted,
        mergedParams,
        missingFields,
      })

      return NextResponse.json({
        ok: true,
        status: 'missing_fields',
        conversationId,
        missingFields,
        reply,
        extractedParams: currentExtracted,
        mergedParams,
      })
    }

    // 5. 参数齐全，选择报价引擎
    let quoteResult: any
    let productType = (mergedParams.productType || 'album').toLowerCase()

    if (productType === 'flyer') {
      quoteResult = calculateFlyerQuote({
        finishedSize: mergedParams.finishedSize!,
        quantity: mergedParams.quantity!,
        paperType: (mergedParams.paperType as any) || 'coated',
        paperWeight: mergedParams.paperWeight!,
        printSides: (mergedParams.printSides as any) || 'double',
        taxRate: mergedParams.taxRate ?? 0,
        shippingRegion: mergedParams.shippingRegion ?? 'domestic',
      })
    } else {
      productType = 'album'
      quoteResult = calculateAlbumQuote({
        finishedSize: mergedParams.finishedSize!,
        pageCount: mergedParams.pageCount ?? 24,
        coverPaper: (mergedParams.coverPaper as any) || 'standard',
        coverWeight: mergedParams.coverWeight!,
        innerPaper: (mergedParams.innerPaper as any) || 'standard',
        innerWeight: mergedParams.innerWeight!,
        bindingType: (mergedParams.bindingType as any) || 'saddle_stitch',
        quantity: mergedParams.quantity!,
        taxRate: mergedParams.taxRate ?? 0,
        shippingRegion: mergedParams.shippingRegion ?? 'domestic',
      })
    }

    const reply = generateQuoteReply(quoteResult)

    // 保存 quote 记录
    await createQuoteRecord({
      conversationId,
      productType,
      summary: productType === 'flyer'
        ? `传单询价 ${mergedParams.quantity}份 ${mergedParams.finishedSize}`
        : `画册询价 ${mergedParams.quantity}本 ${mergedParams.finishedSize}`,
      unitPrice: quoteResult.unitPrice,
      totalPrice: quoteResult.totalPrice,
      shippingFee: quoteResult.shippingFee,
      tax: quoteResult.tax,
      finalPrice: quoteResult.finalPrice,
      normalizedParams: quoteResult.normalizedParams,
      pricingDetails: {
        notes: quoteResult.notes,
      },
    })

    // 更新会话状态为已报价
    await updateConversationStatus(conversationId, 'QUOTED')

    // 保存助手消息，包含参数提取和合并信息
    await addMessageToConversation(conversationId, 'ASSISTANT', reply, {
      extractedParams: currentExtracted,
      mergedParams,
      quoteParams: quoteResult.normalizedParams,
      missingFields: [],
    })

    return NextResponse.json({
      ok: true,
      status: 'quoted',
      conversationId,
      data: quoteResult,
      reply,
      extractedParams: currentExtracted,
      mergedParams,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, status: 'error', message }, { status: 500 })
  }
}

