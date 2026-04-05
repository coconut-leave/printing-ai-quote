import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

type ExtractedQuoteParams = {
  productType?: string
  finishedSize?: string
  quantity?: number
  coverPaper?: string
  coverWeight?: number
  innerPaper?: string
  innerWeight?: number
  bindingType?: string
  pageCount?: number
  paperType?: string
  paperWeight?: number
  printSides?: string
  finishType?: string
  lamination?: string
  missingFields: string[]
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []
let extractCallCount = 0

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

function buildExtracted(params: Partial<ExtractedQuoteParams>): ExtractedQuoteParams {
  return {
    missingFields: [],
    ...params,
  }
}

function resetExtractCallCount() {
  extractCallCount = 0
}

function getExtractCallCount() {
  return extractCallCount
}

async function mockExtractQuoteParams(message: string): Promise<ExtractedQuoteParams> {
  extractCallCount += 1

  const text = message.toLowerCase()
  const params: Partial<ExtractedQuoteParams> = {}

  if (text.includes('名片')) params.productType = 'business_card'
  else if (text.includes('海报')) params.productType = 'poster'
  else if (text.includes('传单')) params.productType = 'flyer'
  else if (text.includes('画册') || text.includes('册子')) params.productType = 'album'

  if (text.includes('a4')) params.finishedSize = 'A4'
  if (text.includes('a3')) params.finishedSize = 'A3'
  if (text.includes('90x54mm')) params.finishedSize = '90x54mm'

  const quantityMatch = text.match(/(\d+)\s*(本|张|份)/)
  if (quantityMatch?.[1]) {
    params.quantity = Number(quantityMatch[1])
  }

  const pageCountMatch = text.match(/(\d+)\s*页/)
  if (pageCountMatch?.[1]) {
    params.pageCount = Number(pageCountMatch[1])
  }

  if (text.includes('封面200g')) {
    params.coverPaper = 'coated'
    params.coverWeight = 200
  }

  if (text.includes('内页157g')) {
    params.innerPaper = 'coated'
    params.innerWeight = 157
  }

  if (text.includes('内页128g')) {
    params.innerPaper = 'coated'
    params.innerWeight = 128
  }

  if (text.includes('骑马钉')) {
    params.bindingType = 'saddle_stitch'
  }

  if (text.includes('胶装')) {
    params.bindingType = 'perfect_bind'
  }

  if (text.includes('铜版纸')) {
    if (params.productType === 'album') {
      params.coverPaper = params.coverPaper || 'coated'
      params.innerPaper = params.innerPaper || 'coated'
    } else {
      params.paperType = 'coated'
    }
  }

  const paperWeightMatch = text.match(/(\d+)g/)
  if (paperWeightMatch?.[1] && params.productType && params.productType !== 'album') {
    params.paperWeight = Number(paperWeightMatch[1])
  }

  if (text.includes('双面')) params.printSides = 'double'
  if (text.includes('单面')) params.printSides = 'single'

  return buildExtracted(params)
}

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null
let createConversationForTest: (() => Promise<{ id: number }>) | null = null
let addMessageForTest: ((conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>) | null = null

async function initializeTestRuntime() {
  if (sendChat && createConversationForTest && addMessageForTest) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler')
  const conversationModule = await import('@/server/db/conversations')

  const createChatPostHandler = typeof routeModule.createChatPostHandler === 'function'
    ? routeModule.createChatPostHandler
    : typeof routeModule.default?.createChatPostHandler === 'function'
    ? routeModule.default.createChatPostHandler
    : null

  if (!createChatPostHandler) {
    throw new Error('createChatPostHandler export not found')
  }

  const createConversation = typeof conversationModule.createConversation === 'function'
    ? conversationModule.createConversation
    : typeof conversationModule.default?.createConversation === 'function'
    ? conversationModule.default.createConversation
    : null

  const addMessageToConversation = typeof conversationModule.addMessageToConversation === 'function'
    ? conversationModule.addMessageToConversation
    : typeof conversationModule.default?.addMessageToConversation === 'function'
    ? conversationModule.default.addMessageToConversation
    : null

  if (!createConversation || !addMessageToConversation) {
    throw new Error('conversation test helpers not found')
  }

  const postHandler = createChatPostHandler({
    extractQuoteParams: mockExtractQuoteParams,
  })

  sendChat = async (body: Record<string, any>) => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const response = await postHandler(request)
    return response.json()
  }

  createConversationForTest = createConversation
  addMessageForTest = addMessageToConversation
}

console.log('\n=== Chat API 上下文隔离与短路回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('咨询命中后应早返回，不触发抽参', async () => {
    resetExtractCallCount()

    const consultation = await sendChat!({
      message: '铜版纸和哑粉纸有什么区别？',
    })

    assert(consultation.intent === 'MATERIAL_CONSULTATION', '应识别为 MATERIAL_CONSULTATION')
    assert(consultation.status === 'consultation_reply', '应返回 consultation_reply')
    assert(getExtractCallCount() === 0, '咨询命中后不应继续执行抽参')
    assert(!consultation.data, '咨询不应直接返回报价数据')
  })

  await test('名片报价应重置旧画册上下文，并进入 handoff_required', async () => {
    const quotedAlbum = await sendChat!({
      message: '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，32页，报价',
    })

    assert(quotedAlbum.status === 'handoff_required', '前置画册询价应先进入 handoff_required')

    const businessCardQuote = await sendChat!({
      conversationId: quotedAlbum.conversationId,
      message: '名片报价',
    })

    assert(businessCardQuote.intent === 'QUOTE_REQUEST', '新短询价应识别为 QUOTE_REQUEST')
    assert(businessCardQuote.status === 'handoff_required', '名片短询价应进入 handoff_required')
    assert(businessCardQuote.mergedParams.productType === 'business_card', '应重置为名片 productType')
    assert(businessCardQuote.mergedParams.pageCount === undefined, '不应沿用旧画册页数')
    assert(businessCardQuote.mergedParams.bindingType === undefined, '不应沿用旧画册装订方式')
  })

  await test('新产品类型请求应重置旧推荐方案上下文', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    assert(consultation.status === 'consultation_reply', '前置咨询应返回 consultation_reply')

    const businessCardQuote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '名片报价',
    })

    assert(businessCardQuote.intent === 'QUOTE_REQUEST', '切换产品类型后应重新识别为 QUOTE_REQUEST')
    assert(businessCardQuote.status === 'handoff_required', '应进入名片 handoff_required')
    assert(!businessCardQuote.patchParams, '切换产品类型时不应继续沿用旧 patch 上下文')
    assert(businessCardQuote.mergedParams.productType === 'business_card', '应重置为新的产品类型')
  })

  await test('改成胶装再报价不应隐式切换 productType', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '改成胶装再报价，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', '应识别为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'handoff_required', '简单印刷推荐确认后应进入 handoff_required')
    assert(quote.mergedParams.productType === 'album', 'patch 不应隐式切换产品类型')
    assert(quote.mergedParams.bindingType === 'perfect_bind', '应应用胶装 patch')
  })

  await test('多字段 patch 后最终参数应使用最新补丁值', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const baseline = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    const patched = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40页，内页改128g，再算一下，1000本',
    })

    assert(baseline.status === 'handoff_required', '基线报价应进入 handoff_required')
    assert(patched.status === 'handoff_required', '多字段 patch 后应继续进入 handoff_required')
    assert(patched.mergedParams.pageCount === 40, '最终报价应使用最新页数')
    assert(patched.mergedParams.innerWeight === 128, '最终报价应使用最新内页克重')
  })

  await test('我想印A4画册1000本应识别为新的 QUOTE_REQUEST，而不是 patch', async () => {
    const consultation = await sendChat!({
      message: '推荐一个常见标准方案',
    })

    const quoteRequest = await sendChat!({
      conversationId: consultation.conversationId,
      message: '我想印A4画册1000本',
    })

    assert(quoteRequest.intent === 'QUOTE_REQUEST', '新的起手式应识别为 QUOTE_REQUEST')
    assert(quoteRequest.intent !== 'PARAM_SUPPLEMENT', '不应被误识别为 PARAM_SUPPLEMENT')
    assert(quoteRequest.status === 'handoff_required', '简单印刷新询价应进入 handoff_required')
    assert(!quoteRequest.patchParams, '新的询价不应继续沿用旧推荐 patch')
  })

  await test('现在进度怎么样必须强制 short-circuit，不得进入报价主链路', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    resetExtractCallCount()
    const progress = await sendChat!({
      conversationId: consultation.conversationId,
      message: '现在进度怎么样',
    })

    assert(progress.intent === 'PROGRESS_INQUIRY', '应识别为 PROGRESS_INQUIRY')
    assert(progress.status === 'progress_inquiry', '应返回 progress_inquiry')
    assert(getExtractCallCount() === 0, '进度查询不应执行抽参')
    assert(!progress.data && !progress.estimatedData, '进度查询不应进入报价主链路')
  })

  await test('铜版纸怎么卖应进入 consultation_reply，而不是返回旧报价', async () => {
    const quotedAlbum = await sendChat!({
      message: '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，32页，报价',
    })

    resetExtractCallCount()
    const consultation = await sendChat!({
      conversationId: quotedAlbum.conversationId,
      message: '铜版纸怎么卖',
    })

    assert(consultation.intent === 'MATERIAL_CONSULTATION', '应识别为 MATERIAL_CONSULTATION')
    assert(consultation.status === 'consultation_reply', '应返回 consultation_reply')
    assert(getExtractCallCount() === 0, '材料咨询不应继续执行抽参')
    assert(!consultation.data, '材料咨询不应沿用旧正式报价')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((r) => r.passed).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})