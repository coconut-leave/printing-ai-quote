import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ name, passed: false, error: message })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${message}`)
    })
}

function getNamedExport<T>(module: any, name: string): T {
  const direct = module?.[name]
  if (direct) {
    return direct as T
  }

  const nested = module?.default?.[name]
  if (nested) {
    return nested as T
  }

  throw new Error(`Export ${name} not found`)
}

console.log('\n=== 后台交付状态一致性回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const conversationsRouteModule = await import('@/app/api/conversations/route')
  const decisionRouteModule = await import('@/app/api/trial-reviews/[conversationId]/route')

  const createConversation = getNamedExport<(options?: { customerName?: string }) => Promise<{ id: number }>>(conversationsDbModule, 'createConversation')
  const addMessageToConversation = getNamedExport<(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>>(conversationsDbModule, 'addMessageToConversation')
  const createQuoteRecord = getNamedExport<(params: {
    conversationId: number
    productType: string
    summary: string
    unitPrice: number
    totalPrice: number
    shippingFee: number
    tax: number
    finalPrice: number
    normalizedParams: Record<string, any>
    pricingDetails?: Record<string, any>
  }) => Promise<{ id: number }>>(conversationsDbModule, 'createQuoteRecord')
  const conversationsGet = getNamedExport<(request: Request) => Promise<Response>>(conversationsRouteModule, 'GET')
  const decisionPatch = getNamedExport<(request: Request, context: { params: { conversationId: string } }) => Promise<Response>>(decisionRouteModule, 'PATCH')

  await test('后台列表应对 quoted / estimated / handoff 展示一致的交付与复核状态', async () => {
    const quotedConversation = await createConversation({ customerName: '后台客户A' })
    await addMessageToConversation(quotedConversation.id, 'CUSTOMER', '飞机盒报价，20*12*6cm，300克白卡，四色印刷，5000个')
    await createQuoteRecord({
      conversationId: quotedConversation.id,
      productType: 'mailer_box',
      summary: '飞机盒正式报价',
      unitPrice: 0.56,
      totalPrice: 2800,
      shippingFee: 80,
      tax: 168,
      finalPrice: 3048,
      normalizedParams: {
        productType: 'mailer_box',
        quantity: 5000,
        length: 20,
        width: 12,
        height: 6,
        sizeUnit: 'cm',
        material: 'white_card',
        weight: 300,
        printColor: 'four_color',
      },
      pricingDetails: {
        unitPrice: 0.56,
        totalPrice: 2800,
        shippingFee: 80,
        tax: 168,
        finalPrice: 3048,
        packagingReview: {
          status: 'quoted',
          trialGateStatus: 'allowed_quoted_in_trial',
          statusReasonText: '当前路径属于试运行允许正式报价范围。',
        },
      },
    })

    const estimatedConversation = await createConversation({ customerName: '后台客户B' })
    await addMessageToConversation(estimatedConversation.id, 'CUSTOMER', '双插盒 3000 个，先给我参考报价')
    await addMessageToConversation(
      estimatedConversation.id,
      'ASSISTANT',
      '当前先给参考报价。',
      {
        responseStatus: 'estimated',
        mergedParams: {
          productType: 'tuck_end_box',
          quantity: 3000,
          length: 18,
          width: 6,
          height: 4,
          sizeUnit: 'cm',
        },
        estimatedData: {
          totalPrice: 1320,
          shippingFee: 100,
          finalPrice: 1420,
          unitPrice: 0.44,
        },
        packagingReview: {
          status: 'estimated',
          trialGateStatus: 'estimated_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许参考报价。',
        },
      }
    )

    await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${estimatedConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'MANUAL_CONFIRMED',
          operatorName: '销售C',
          note: '已人工确认，可继续按参考价跟进。',
        }),
      }),
      { params: { conversationId: String(estimatedConversation.id) } }
    )

    const handoffConversation = await createConversation({ customerName: '后台客户C' })
    await addMessageToConversation(handoffConversation.id, 'CUSTOMER', '开窗彩盒带胶片，麻烦看下')
    await addMessageToConversation(
      handoffConversation.id,
      'ASSISTANT',
      '当前案例建议先人工处理。',
      {
        responseStatus: 'handoff_required',
        mergedParams: {
          productType: 'window_box',
          quantity: 800,
          length: 21,
          width: 17,
          height: 31,
          sizeUnit: 'cm',
        },
        packagingReview: {
          status: 'handoff_required',
          trialGateStatus: 'handoff_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许人工兜底。',
          requiresHumanReview: true,
        },
      }
    )

    await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${handoffConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'HANDOFF_TO_HUMAN',
          operatorName: '陈工',
          note: '需要人工确认开窗结构与胶片厚度。',
        }),
      }),
      { params: { conversationId: String(handoffConversation.id) } }
    )

    const response = await conversationsGet(new Request('http://localhost/api/conversations'))
    const payload = await response.json()

    assert(response.status === 200, '后台列表接口应返回 200')
    assert(payload.ok, '后台列表接口应返回成功')

    const quotedItem = payload.data.find((item: { id: number }) => item.id === quotedConversation.id)
    const estimatedItem = payload.data.find((item: { id: number }) => item.id === estimatedConversation.id)
    const handoffItem = payload.data.find((item: { id: number }) => item.id === handoffConversation.id)

    assert(Boolean(quotedItem), '后台列表应包含正式报价会话')
    assert(Boolean(estimatedItem), '后台列表应包含参考报价会话')
    assert(Boolean(handoffItem), '后台列表应包含人工处理会话')

    assert(quotedItem.hasExportableResult === true, 'quoted 会话应可导出')
    assert(quotedItem.exportableResultStatus === '正式报价', 'quoted 会话应显示正式报价交付状态')

    assert(estimatedItem.hasExportableResult === true, 'estimated 会话应仍可导出参考报价单')
    assert(estimatedItem.exportableResultStatus === '参考报价', 'estimated 会话应显示参考报价交付状态')
    assert(estimatedItem.trialReviewStatusLabel === '已人工确认', 'estimated 会话应显示已人工确认')
    assert(estimatedItem.trialReviewLatestActionLabel === '人工确认', 'estimated 会话应显示最新人工确认动作')

    assert(handoffItem.hasExportableResult === false, 'handoff 会话不应显示可导出结果')
    assert(handoffItem.exportableResultStatus === null, 'handoff 会话不应显示导出结果状态')
    assert(handoffItem.trialReviewStatusLabel === '已转人工', 'handoff 会话应显示已转人工')
    assert(handoffItem.trialReviewLatestActionLabel === '转人工处理', 'handoff 会话应显示最新转人工动作')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((item) => item.passed).length
  console.log(`总计: ${passed}/${results.length} 通过`)

  if (passed !== results.length) {
    process.exit(1)
  }
}

void main()