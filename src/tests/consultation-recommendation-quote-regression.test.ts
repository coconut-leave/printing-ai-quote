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

async function mockExtractQuoteParams(message: string): Promise<ExtractedQuoteParams> {
  if (message.includes('1000本')) {
    return buildExtracted({ quantity: 1000 })
  }

  if (message.includes('2000张')) {
    return buildExtracted({ quantity: 2000 })
  }

  if (message.includes('页数改成40')) {
    return buildExtracted({ pageCount: 40 })
  }

  if (message.includes('改成胶装')) {
    return buildExtracted({ bindingType: 'perfect_bind' })
  }

  if (message.includes('尺寸改成a3') || message.includes('尺寸改成A3')) {
    return buildExtracted({ finishedSize: 'A3' })
  }

  return buildExtracted({})
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

console.log('\n=== 咨询 -> 推荐 -> 报价 正式回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('咨询后仅返回知识回复，不应误进入报价状态', async () => {
    const consultation = await sendChat!({
      message: '铜版纸和哑粉纸有什么区别？',
    })

    assert(consultation.intent === 'MATERIAL_CONSULTATION', 'intent 应为 MATERIAL_CONSULTATION')
    assert(consultation.status === 'consultation_reply', 'status 应为 consultation_reply')
    assert(typeof consultation.reply === 'string' && consultation.reply.length > 0, '应返回知识回复')
    assert(consultation.reply.includes('如果这版方向合适') || consultation.reply.includes('我会先建议按'), '咨询回复应保留客服式承接')
    assert(!consultation.estimatedData, '不应直接进入 estimated')
    assert(!consultation.data, '不应直接进入 quoted 数据结构')
  })

  await test('咨询后可返回 recommendedParams', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    assert(consultation.intent === 'SPEC_RECOMMENDATION', 'intent 应为 SPEC_RECOMMENDATION')
    assert(consultation.status === 'consultation_reply', 'status 应为 consultation_reply')
    assert(Boolean(consultation.recommendedParams), '应返回 recommendedParams')
    assert(consultation.recommendedParams.recommendedParams.pageCount === 32, '应返回常见页数推荐')
  })

  await test('推荐方案确认后进入 estimated', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '传单常见方案是什么？')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '常见传单方案可先按 A4、157g 铜版纸起步。如果您需要，我也可以按这个方案给您估个价。',
      {
        intent: 'SOLUTION_RECOMMENDATION',
        recommendedParams: {
          productType: 'flyer',
          recommendedParams: {
            finishedSize: 'A4',
            paperType: 'coated',
            paperWeight: 157,
          },
        },
      }
    )

    const quote = await sendChat!({
      conversationId: conversation.id,
      message: '按这个估个参考价，2000张',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', 'intent 应为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'estimated', 'status 应为 estimated')
    assert(quote.reply.includes('先给您一个参考价'), 'estimated 回复应采用更自然的客服话术')
    assert(Array.isArray(quote.missingFields) && quote.missingFields.includes('printSides'), '应因缺单双面进入 estimated')
  })

  await test('推荐方案确认后进入 quoted', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', 'intent 应为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'quoted', 'status 应为 quoted')
    assert(quote.reply.includes('这边先按您这版参数算好了'), 'quoted 回复应更像客服发报价')
    assert(quote.mergedParams.pageCount === 32, '应沿用推荐方案页数进入正式报价')
  })

  await test('推荐方案 patch 后再报价', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const patch = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40，改成胶装',
    })

    assert(patch.intent === 'PARAM_SUPPLEMENT', 'patch intent 应为 PARAM_SUPPLEMENT')
    assert(patch.status === 'recommendation_updated', 'patch status 应为 recommendation_updated')
    assert(patch.reply.includes('好的，这版我已经按您的意思改成') || patch.reply.includes('这版方案我已经帮您更新了'), 'patch 回复应明确已更新方案')

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(quote.status === 'quoted', 'patch 后再报价应进入 quoted')
    assert(quote.mergedParams.pageCount === 40, '最终报价应使用 patch 后页数')
    assert(quote.mergedParams.bindingType === 'perfect_bind', '最终报价应使用 patch 后装订')
  })

  await test('文件型询价不应被咨询链路误吞', async () => {
    const consultation = await sendChat!({
      message: '推荐一个常见标准方案',
    })

    const handoff = await sendChat!({
      conversationId: consultation.conversationId,
      message: '我有PDF设计稿，按文件报价',
    })

    assert(handoff.intent === 'FILE_REVIEW_REQUEST', 'intent 应为 FILE_REVIEW_REQUEST')
    assert(handoff.status === 'handoff_required', 'status 应为 handoff_required')
    assert(handoff.reply.includes('人工同事'), 'handoff 回复应明确人工接手')
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