import dotenv from 'dotenv'
import * as XLSX from 'xlsx'

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

console.log('\n=== 会话筛选与批量导出回归测试 ===\n')

async function main() {
  const { prisma } = await import('@/server/db/prisma')
  const conversationsDbModule = await import('@/server/db/conversations')
  const conversationsRouteModule = await import('@/app/api/conversations/route')
  const conversationsExportRouteModule = await import('@/app/api/conversations/export/route')

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
  const conversationsExportGet = getNamedExport<(request: Request) => Promise<Response>>(conversationsExportRouteModule, 'GET')

  await test('今日 本月 本年筛选能正确缩小范围', async () => {
    const todayConversation = await createConversation()
    const monthConversation = await createConversation()
    const yearConversation = await createConversation()

    const now = new Date()
    const earlierThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 10, 0, 0)
    const earlierThisYear = new Date(now.getFullYear(), 0, 15, 10, 0, 0)

    await prisma.conversation.update({
      where: { id: monthConversation.id },
      data: { updatedAt: earlierThisMonth, createdAt: earlierThisMonth },
    })
    await prisma.conversation.update({
      where: { id: yearConversation.id },
      data: { updatedAt: earlierThisYear, createdAt: earlierThisYear },
    })

    const todayResponse = await conversationsGet(new Request('http://localhost/api/conversations?timePreset=today'))
    const todayPayload = await todayResponse.json()
    const todayIds = todayPayload.data.map((item: { id: number }) => item.id)
    assert(todayIds.includes(todayConversation.id), '今日筛选应包含今天的会话')
    assert(!todayIds.includes(monthConversation.id), '今日筛选不应包含本月更早的会话')

    const monthResponse = await conversationsGet(new Request('http://localhost/api/conversations?timePreset=month'))
    const monthPayload = await monthResponse.json()
    const monthIds = monthPayload.data.map((item: { id: number }) => item.id)
    assert(monthIds.includes(todayConversation.id), '本月筛选应包含今天的会话')
    assert(monthIds.includes(monthConversation.id), '本月筛选应包含本月更早的会话')
    assert(!monthIds.includes(yearConversation.id), '本月筛选不应包含本年其他月份的会话')

    const yearResponse = await conversationsGet(new Request('http://localhost/api/conversations?timePreset=year'))
    const yearPayload = await yearResponse.json()
    const yearIds = yearPayload.data.map((item: { id: number }) => item.id)
    assert(yearIds.includes(todayConversation.id), '本年筛选应包含今天的会话')
    assert(yearIds.includes(monthConversation.id), '本年筛选应包含本月会话')
    assert(yearIds.includes(yearConversation.id), '本年筛选应包含本年更早月份的会话')
  })

  await test('批量导出只包含有报价结果的记录，且字段使用中文业务表达', async () => {
    const quotedConversation = await createConversation({ customerName: '台账客户A' })
    await addMessageToConversation(quotedConversation.id, 'CUSTOMER', '飞机盒，20*12*6cm，300克白卡，四色印刷，5000个')
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
    })

    const estimatedConversation = await createConversation({ customerName: '台账客户B' })
    await addMessageToConversation(estimatedConversation.id, 'CUSTOMER', '开窗彩盒，21*17*31cm，400克单铜，印四色，过光胶，500个')
    await addMessageToConversation(estimatedConversation.id, 'ASSISTANT', '先给您一版参考报价。', {
      responseStatus: 'estimated',
      estimatedData: {
        normalizedParams: { productType: 'window_box', quantity: 500 },
        totalPrice: 2650,
        shippingFee: 100,
        tax: 159,
        finalPrice: 2909,
      },
      packagingReview: {
        status: 'estimated',
        statusLabel: '预报价',
        statusReasonText: '当前先按参考报价处理。',
        conciseExplanation: '开窗结构建议人工复核。',
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

    const handoffConversation = await createConversation({ customerName: '台账客户C' })
    await addMessageToConversation(handoffConversation.id, 'CUSTOMER', '我这边有AI源文件，按文件核价')
    await addMessageToConversation(handoffConversation.id, 'ASSISTANT', '这类需求先转人工处理。', {
      responseStatus: 'handoff_required',
    })

    const response = await conversationsExportGet(new Request('http://localhost/api/conversations/export?timePreset=year'))
    assert(response.status === 200, '批量导出台账应成功')

    const rows = readWorkbookRows(Buffer.from(await response.arrayBuffer()))
    const flat = flattenRows(rows)

    assert(flat.includes(String(quotedConversation.id)), '台账应包含正式报价会话')
    assert(flat.includes(String(estimatedConversation.id)), '台账应包含参考报价会话')
    assert(!flat.includes(String(handoffConversation.id)), '纯人工接管且无报价结果的会话不应进入台账')
    assert(flat.includes('正式报价'), '台账中应显示中文正式报价状态')
    assert(flat.includes('参考报价'), '台账中应显示中文参考报价状态')
    assert(flat.includes('正式报价归档'), '台账中应区分正式报价归档分类')
    assert(flat.includes('参考报价归档'), '台账中应区分参考报价归档分类')
    assert(flat.some((value) => value.includes('对外使用建议')), '台账中应提供对外使用建议字段')
    assert(flat.some((value) => value.includes('不作为正式成交承诺')), '参考报价台账中应明确不作为正式成交承诺')
    assert(!flat.includes('mailer_box'), '台账中不应暴露内部 productType')
    assert(!flat.includes('quoted'), '台账中不应暴露内部 quoted 状态值')
    assert(!flat.includes('PENDING'), '台账中不应暴露内部 PENDING 状态值')
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