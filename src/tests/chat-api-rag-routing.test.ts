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
let ragCallCount = 0

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

function resetCounts() {
  extractCallCount = 0
  ragCallCount = 0
}

async function mockExtractQuoteParams(_message: string): Promise<ExtractedQuoteParams> {
  extractCallCount += 1
  return buildExtracted({
    productType: 'album',
    finishedSize: 'A4',
    quantity: 1000,
    pageCount: 32,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
  })
}

async function mockRouteMessage(input: { message: string }) {
  const text = input.message.toLowerCase()

  if (text.includes('pdf') || text.includes('设计稿')) {
    return {
      intent: 'FILE_BASED_INQUIRY' as const,
      confidence: 0.99,
      shouldUseRAG: false,
      shouldExtractParams: false,
      shouldRunQuoteEngine: false,
      shouldHandoff: true,
      shouldGenerateAlternativePlan: false,
      reason: 'file-based inquiry',
    }
  }

  if (text.includes('胶装') || text.includes('骑马钉')) {
    return {
      intent: 'KNOWLEDGE_QA' as const,
      confidence: 0.96,
      shouldUseRAG: true,
      shouldExtractParams: false,
      shouldRunQuoteEngine: false,
      shouldHandoff: false,
      shouldGenerateAlternativePlan: false,
      reason: 'process explanation question',
    }
  }

  return {
    intent: 'QUOTE_REQUEST' as const,
    confidence: 0.95,
    shouldUseRAG: false,
    shouldExtractParams: true,
    shouldRunQuoteEngine: true,
    shouldHandoff: false,
    shouldGenerateAlternativePlan: false,
    reason: 'standard quote request',
  }
}

async function mockAnswerKnowledgeQuestion() {
  ragCallCount += 1
  return {
    reply: '胶装更适合页数较多、整体感更正式的资料册；骑马钉更适合页数较少、希望控成本的版本。以上仅用于工艺说明，不用于最终价格判断。',
    rewrittenQuery: '胶装 骑马钉 区别',
    snippets: [
      {
        id: 'process-binding',
        title: '装订说明',
        source: 'test',
      },
    ],
    conservative: false,
  }
}

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null

async function initializeTestRuntime() {
  if (sendChat) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler')

  const createChatPostHandler = typeof routeModule.createChatPostHandler === 'function'
    ? routeModule.createChatPostHandler
    : typeof routeModule.default?.createChatPostHandler === 'function'
    ? routeModule.default.createChatPostHandler
    : null

  if (!createChatPostHandler) {
    throw new Error('createChatPostHandler export not found')
  }

  const postHandler = createChatPostHandler({
    extractQuoteParams: mockExtractQuoteParams,
    routeMessage: mockRouteMessage,
    answerKnowledgeQuestion: mockAnswerKnowledgeQuestion,
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
}

console.log('\n=== Chat API 轻量 RAG 分流回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('工艺解释问题应走 RAG 短路分支', async () => {
    resetCounts()

    const response = await sendChat!({
      message: '胶装和骑马钉有什么区别？',
    })

    assert(response.status === 'consultation_reply', '知识问题应保留 consultation_reply 兼容响应')
    assert(response.intent === 'PROCESS_CONSULTATION', '工艺解释问题应保留 PROCESS_CONSULTATION intent')
    assert(ragCallCount === 1, '应调用 RAG 回答器')
    assert(extractCallCount === 0, '知识问题不应进入抽参')
  })

  await test('标准询价不应误走 RAG', async () => {
    resetCounts()

    const response = await sendChat!({
      message: '我想印1000本A4画册，报价',
    })

    assert(response.status === 'quoted', '标准询价应继续进入报价链路')
    assert(ragCallCount === 0, '标准询价不应调用 RAG')
    assert(extractCallCount === 1, '标准询价应继续抽参')
  })

  await test('文件型询价应继续走 handoff', async () => {
    resetCounts()

    const response = await sendChat!({
      message: '我有 PDF 设计稿，帮我看看并报价',
    })

    assert(response.status === 'handoff_required', '文件型询价应继续 handoff')
    assert(ragCallCount === 0, '文件型询价不应调用 RAG')
    assert(extractCallCount === 0, '文件型询价不应进入抽参')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)

  if (passed < total) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})