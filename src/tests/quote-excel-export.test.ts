import dotenv from 'dotenv'
import * as XLSX from 'xlsx'

dotenv.config({ path: './.env' })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: unknown, message: string): asserts condition {
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
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${error}`)
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

function readWorkbookRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as Array<Array<string | number>>
}

function flattenRows(rows: Array<Array<string | number>>) {
  return rows.flat().map((value) => String(value ?? ''))
}

console.log('\n=== 报价单 Excel 导出回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const quoteExportRouteModule = await import('@/app/api/quotes/[id]/export/route')
  const conversationExportRouteModule = await import('@/app/api/conversations/[id]/export/route')

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
  const quoteExportGet = getNamedExport<(request: Request, context: { params: { id?: string } }) => Promise<Response>>(quoteExportRouteModule, 'GET')
  const conversationExportGet = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationExportRouteModule, 'GET')

  await test('accepted quoted path 可导出正式报价单', async () => {
    const conversation = await createConversation({ customerName: '演示客户A' })
    await addMessageToConversation(conversation.id, 'CUSTOMER', '飞机盒，20*12*6cm，300克白卡，四色印刷，5000个')

    const quote = await createQuoteRecord({
      conversationId: conversation.id,
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
          statusLabel: '正式报价',
          statusReasonCode: 'trial_scope_allowed_quoted',
          statusReasonText: '当前路径属于试运行允许正式报价范围。',
          trialGateStatus: 'allowed_quoted_in_trial',
          conciseExplanation: '飞机盒标准路径已进入试运行正式报价范围。',
          requiresHumanReview: false,
          lineItems: [
            {
              itemType: 'mailer_box',
              itemTypeLabel: '飞机盒',
              title: '飞机盒',
              quantity: 5000,
              normalizedSpecSummary: '飞机盒 / 20×12×6cm',
              materialWeightSummary: '白卡 / 300g',
              printColorSummary: '四色',
              processSummary: '啤、粘合',
              setupCost: 120,
              runCost: 2680,
              unitPrice: 0.56,
              lineTotal: 2800,
              reviewFlags: [],
              reviewReasons: [],
              requiresHumanReview: false,
            },
          ],
          reviewFlags: [],
          reviewReasons: [],
          missingDetails: [],
          subtotal: 2800,
          shippingFee: 80,
          finalPrice: 3048,
          totalUnitPrice: 0.56,
          referenceFiles: [],
        },
      },
    })

    const response = await quoteExportGet(
      new Request(`http://localhost/api/quotes/${quote.id}/export?format=xlsx`),
      { params: { id: String(quote.id) } }
    )

    assert(response.status === 200, '正式报价 Excel 导出应成功')
    assert(response.headers.get('Content-Type')?.includes('spreadsheetml.sheet'), '应返回 Excel Content-Type')

    const rows = readWorkbookRows(Buffer.from(await response.arrayBuffer()))
    const flat = flattenRows(rows)

    assert(flat.includes('东莞市彩嘉印刷有限公司'), 'Excel 中应包含业务抬头')
    assert(flat.includes('正式报价单'), 'accepted quoted path 应导出正式报价单')
    assert(flat.includes('报价单号'), 'Excel 中应包含报价单号字段')
    assert(flat.includes('报价拆解'), 'Excel 中应包含拆解区标题')
    assert(flat.includes('正式报价'), '正式报价导出应显示中文状态')
    assert(flat.includes('试运行正式报价范围'), '正式报价导出应体现当前 trial scope 口径')
    assert(flat.some((value) => value.includes('可直接作为正式对客报价与业务归档依据')), '正式报价导出应明确对外使用边界')
    assert(flat.includes('飞机盒'), '产品名称应为中文业务名称')
    assert(!flat.includes('mailer_box'), '导出中不应暴露内部 productType')
    assert(!flat.includes('PENDING'), '导出中不应暴露内部 Quote 状态')
    assert(!flat.includes('allowed_quoted_in_trial'), '导出中不应暴露内部 trial gate 枚举')
    assert(!flat.includes('会话编号'), '单张报价单不应再展示会话编号')
    assert(!flat.includes('会话主题'), '单张报价单不应再展示开发视角字段')
  })

  await test('quoted bundle 导出时主件 子项 subtotal final 展示正确', async () => {
    const conversation = await createConversation({ customerName: '演示客户B' })
    await addMessageToConversation(conversation.id, 'CUSTOMER', '双插盒加说明书一起报价')

    const quote = await createQuoteRecord({
      conversationId: conversation.id,
      productType: 'tuck_end_box',
      summary: '组合报价',
      unitPrice: 1.35,
      totalPrice: 6750,
      shippingFee: 120,
      tax: 405,
      finalPrice: 7275,
      normalizedParams: {
        productType: 'tuck_end_box',
        isBundle: true,
        requiresHumanReview: true,
        mainItem: { productType: 'tuck_end_box', title: '双插盒' },
        subItems: [{ productType: 'leaflet_insert', title: '说明书' }],
      },
      pricingDetails: {
        unitPrice: 1.35,
        totalUnitPrice: 1.35,
        totalPrice: 6750,
        shippingFee: 120,
        tax: 405,
        finalPrice: 7275,
        packagingReview: {
          status: 'quoted',
          statusLabel: '正式报价',
          statusReasonCode: 'trial_standard_bundle_quoted',
          statusReasonText: '当前组合属于试运行允许正式报价范围。',
          trialGateStatus: 'allowed_quoted_in_trial',
          trialBundleGateStatus: 'standard_quoted_bundle_in_trial',
          conciseExplanation: '标准双插盒 + 高频 generic 说明书已在当前 accepted bundle scope 内。',
          requiresHumanReview: true,
          lineItems: [
            {
              itemType: 'tuck_end_box',
              itemTypeLabel: '双插盒',
              title: '双插盒',
              quantity: 5000,
              normalizedSpecSummary: '双插盒 / 7×5×5cm',
              materialWeightSummary: '白卡 / 350g',
              printColorSummary: '正反四色',
              processSummary: '啤、粘合',
              setupCost: 120,
              runCost: 2200,
              unitPrice: 1.1,
              lineTotal: 5500,
              reviewFlags: [],
              reviewReasons: [],
              requiresHumanReview: false,
            },
            {
              itemType: 'leaflet_insert',
              itemTypeLabel: '说明书',
              title: '说明书',
              quantity: 5000,
              normalizedSpecSummary: '说明书 / 20×5cm',
              materialWeightSummary: '双铜 / 80g',
              printColorSummary: '双面四色印',
              processSummary: '折3折',
              setupCost: 60,
              runCost: 1190,
              unitPrice: 0.25,
              lineTotal: 1250,
              reviewFlags: ['bundle_prequote'],
              reviewReasons: [{ code: 'nonstandard_process_combo', label: '组合预估', message: '组合报价建议复核', severity: 'warning' }],
              requiresHumanReview: true,
            },
          ],
          reviewFlags: [],
          reviewReasons: [],
          missingDetails: [],
          subtotal: 6750,
          shippingFee: 120,
          finalPrice: 7275,
          totalUnitPrice: 1.35,
          referenceFiles: [],
        },
        items: [
          {
            itemType: 'tuck_end_box',
            title: '双插盒',
            quantity: 5000,
            normalizedSpecSummary: '双插盒 / 7×5×5cm',
            materialWeightSummary: '白卡 / 350g',
            printColorSummary: '正反四色',
            processSummary: '啤、粘合',
            setupCost: 120,
            runCost: 2200,
            unitPrice: 1.1,
            lineTotal: 5500,
            reviewFlags: [],
            reviewReasons: [],
          },
          {
            itemType: 'leaflet_insert',
            title: '说明书',
            quantity: 5000,
            normalizedSpecSummary: '说明书 / 20×5cm',
            materialWeightSummary: '双铜 / 80g',
            printColorSummary: '双面四色印',
            processSummary: '折3折',
            setupCost: 60,
            runCost: 1190,
            unitPrice: 0.25,
            lineTotal: 1250,
            reviewFlags: ['bundle_prequote'],
            reviewReasons: [{ code: 'nonstandard_process_combo', label: '组合预估', message: '组合报价建议复核', severity: 'warning' }],
          },
        ],
      },
    })

    const response = await quoteExportGet(
      new Request(`http://localhost/api/quotes/${quote.id}/export?format=xlsx`),
      { params: { id: String(quote.id) } }
    )

    const rows = readWorkbookRows(Buffer.from(await response.arrayBuffer()))
    const flat = flattenRows(rows)

    assert(flat.includes('主件｜双插盒'), '组合报价应明确展示主件')
    assert(flat.includes('子项｜说明书'), '组合报价应明确展示子项')
    assert(flat.includes('报价汇总'), '组合报价应包含汇总区')
    assert(flat.includes('产品小计'), '组合报价应明确展示 order subtotal')
    assert(flat.includes('￥6750.00'), '组合报价应展示主件+子项产品小计')
    assert(flat.includes('￥7275.00'), '组合报价应展示最终报价金额')
    assert(flat.includes('试运行正式报价范围'), 'accepted quoted bundle 应展示正式试运行口径')
  })

  await test('查看报价单页面应输出业务版式预览', async () => {
    const conversation = await createConversation({ customerName: '演示客户预览' })
    await addMessageToConversation(conversation.id, 'CUSTOMER', '双插盒，350克白卡，5000个')

    const quote = await createQuoteRecord({
      conversationId: conversation.id,
      productType: 'tuck_end_box',
      summary: '网页预览测试',
      unitPrice: 0.88,
      totalPrice: 4400,
      shippingFee: 120,
      tax: 264,
      finalPrice: 4784,
      normalizedParams: {
        productType: 'tuck_end_box',
        quantity: 5000,
        length: 12,
        width: 6,
        height: 18,
        sizeUnit: 'cm',
        material: 'white_card',
        weight: 350,
        printColor: 'four_color',
      },
      pricingDetails: {
        unitPrice: 0.88,
        totalPrice: 4400,
        shippingFee: 120,
        tax: 264,
        finalPrice: 4784,
        packagingReview: {
          status: 'quoted',
          statusLabel: '正式报价',
          statusReasonCode: 'trial_scope_allowed_quoted',
          statusReasonText: '当前路径属于试运行允许正式报价范围。',
          trialGateStatus: 'allowed_quoted_in_trial',
          conciseExplanation: '双插盒标准路径可按正式报价单交付。',
          requiresHumanReview: false,
          lineItems: [
            {
              itemType: 'tuck_end_box',
              itemTypeLabel: '双插盒',
              title: '双插盒',
              quantity: 5000,
              normalizedSpecSummary: '双插盒 / 12×6×18cm',
              materialWeightSummary: '白卡 / 350g',
              printColorSummary: '四色',
              processSummary: '啤、粘合',
              setupCost: 120,
              runCost: 4280,
              unitPrice: 0.88,
              lineTotal: 4400,
              reviewFlags: [],
              reviewReasons: [],
              requiresHumanReview: false,
            },
          ],
          reviewFlags: [],
          reviewReasons: [],
          missingDetails: [],
          subtotal: 4400,
          shippingFee: 120,
          finalPrice: 4784,
          totalUnitPrice: 0.88,
          referenceFiles: [],
        },
      },
    })

    const response = await quoteExportGet(
      new Request(`http://localhost/api/quotes/${quote.id}/export`),
      { params: { id: String(quote.id) } }
    )

    assert(response.status === 200, '报价预览页应成功返回')
    assert(response.headers.get('Content-Type')?.includes('text/html'), '预览页应返回 HTML')

    const html = await response.text()
    assert(html.includes('东莞市彩嘉印刷有限公司'), '预览页应包含业务抬头')
    assert(html.includes('正式报价单'), '预览页标题应体现正式报价单')
    assert(html.includes('报价拆解区'), '预览页应包含拆解区')
    assert(html.includes('报价汇总'), '预览页应包含汇总区')
    assert(html.includes('试运行正式报价范围'), '预览页应体现当前试运行口径')
    assert(html.includes('对外使用'), '预览页应明确展示对外使用说明')
    assert(html.includes('可直接作为正式对客报价与业务归档依据'), '预览页应明确正式报价可对客使用')
    assert(!html.includes('Quote ID'), '预览页不应展示 Quote ID')
    assert(!html.includes('Conversation ID'), '预览页不应展示 Conversation ID')
    assert(!html.includes('mailer_box'), '预览页不应暴露内部 productType')
  })

  await test('estimated-only path 导出时明确为参考报价单', async () => {
    const conversation = await createConversation({ customerName: '演示客户C' })
    await addMessageToConversation(conversation.id, 'CUSTOMER', '开窗彩盒，21*17*31cm，400克单铜，印四色，过光胶，500个')
    await addMessageToConversation(conversation.id, 'ASSISTANT', '这边先给您一版参考报价。', {
      responseStatus: 'estimated',
      estimatedData: {
        normalizedParams: {
          productType: 'window_box',
          quantity: 500,
        },
        totalPrice: 2650,
        shippingFee: 100,
        tax: 159,
        finalPrice: 2909,
      },
      packagingReview: {
        status: 'estimated',
        statusLabel: '参考报价',
        statusReasonCode: 'trial_scope_estimated_only',
        trialGateStatus: 'estimated_only_in_trial',
        statusReasonText: '当前路径在试运行内只允许参考报价。',
        conciseExplanation: '开窗结构和胶片参数仍建议人工复核。',
        requiresHumanReview: true,
        lineItems: [
          {
            itemType: 'window_box',
            itemTypeLabel: '开窗彩盒',
            title: '开窗彩盒',
            quantity: 500,
            normalizedSpecSummary: '开窗彩盒 / 21×17×31cm',
            materialWeightSummary: '单铜 / 400g',
            printColorSummary: '四色',
            processSummary: '过光胶',
            setupCost: 150,
            runCost: 980,
            unitPrice: 5.3,
            lineTotal: 2650,
            reviewFlags: [],
            reviewReasons: [],
            requiresHumanReview: true,
          },
        ],
        reviewFlags: [],
        reviewReasons: [],
        missingDetails: [],
        subtotal: 2650,
        shippingFee: 100,
        finalPrice: 2909,
        totalUnitPrice: 5.3,
        referenceFiles: [],
      },
      requiresHumanReview: true,
    })

    const response = await conversationExportGet(
      new Request(`http://localhost/api/conversations/${conversation.id}/export`),
      { params: { id: String(conversation.id) } }
    )

    assert(response.status === 200, '参考报价 Excel 导出应成功')

    const rows = readWorkbookRows(Buffer.from(await response.arrayBuffer()))
    const flat = flattenRows(rows)

    assert(flat.includes('参考报价'), 'estimated 导出时应标记为参考报价')
    assert(flat.includes('参考报价单'), 'estimated-only path 应导出参考报价单')
    assert(flat.includes('试运行参考报价范围'), 'estimated-only path 应体现试运行参考报价口径')
    assert(flat.some((value) => value.includes('仅提供参考报价')), 'estimated-only path 应有明显仅供参考提示')
    assert(flat.some((value) => value.includes('不作为正式成交承诺')), '参考报价导出应明确不作为正式成交承诺')
    assert(flat.includes('开窗彩盒'), 'estimated 导出应显示中文品名')
    assert(!flat.includes('estimated'), '导出中不应暴露内部 estimated 状态值')
    assert(!flat.includes('estimated_only_in_trial'), '导出中不应暴露内部 trial gate 状态值')
  })

  await test('handoff-only path 不会误导出正式单据', async () => {
    const conversation = await createConversation({ customerName: '演示客户D' })
    await addMessageToConversation(conversation.id, 'CUSTOMER', '我这边有刀线图和AI源文件，帮我按文件核价')
    await addMessageToConversation(conversation.id, 'ASSISTANT', '当前案例建议先人工处理。', {
      responseStatus: 'handoff_required',
      packagingReview: {
        status: 'handoff_required',
        statusLabel: '人工复核',
        statusReasonCode: 'trial_scope_handoff_only',
        trialGateStatus: 'handoff_only_in_trial',
        statusReasonText: '当前路径在试运行内只允许人工兜底。',
        conciseExplanation: '设计稿与刀线图驱动路径不自动生成正式或参考报价单。',
        requiresHumanReview: true,
        lineItems: [
          {
            itemType: 'tuck_end_box',
            itemTypeLabel: '双插盒',
            title: '双插盒',
            quantity: 5000,
            normalizedSpecSummary: '双插盒 / 7×5×5cm',
            materialWeightSummary: '白卡 / 350g',
            printColorSummary: '四色',
            processSummary: '按文件复核',
            setupCost: 0,
            runCost: 0,
            unitPrice: 0,
            lineTotal: 0,
            reviewFlags: [],
            reviewReasons: [],
            requiresHumanReview: true,
          },
        ],
        reviewFlags: [],
        reviewReasons: [],
        missingDetails: [],
        subtotal: 0,
        shippingFee: 0,
        finalPrice: 0,
        totalUnitPrice: 0,
        referenceFiles: [],
      },
      requiresHumanReview: true,
    })

    const response = await conversationExportGet(
      new Request(`http://localhost/api/conversations/${conversation.id}/export`),
      { params: { id: String(conversation.id) } }
    )

    assert(response.status === 409, 'handoff-only path 不应导出正式或参考报价单')

    const payload = await response.json() as { error?: string }
    assert((payload.error || '').includes('人工处理范围'), 'handoff-only path 应明确提示人工处理')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)

  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})