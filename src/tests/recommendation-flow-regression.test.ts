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

console.log('\n=== 推荐方案正式链路回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('consultation_reply: 咨询后返回推荐方案', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    assert(consultation.intent === 'SPEC_RECOMMENDATION', 'intent 应为 SPEC_RECOMMENDATION')
    assert(consultation.status === 'consultation_reply', 'status 应为 consultation_reply')
    assert(Boolean(consultation.recommendedParams), '应返回 recommendedParams')
  })

  await test('recommendation_updated: 单轮 patch 后应仅更新方案', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const patch = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    assert(patch.intent === 'PARAM_SUPPLEMENT', 'intent 应为 PARAM_SUPPLEMENT')
    assert(patch.status === 'recommendation_updated', 'status 应为 recommendation_updated')
    assert(patch.recommendedParams, '应保留 recommendedParams')
    assert(patch.mergedRecommendedParams.pageCount === 40, 'mergedRecommendedParams 应更新页数')
  })

  await test('recommendation_updated: 多轮 patch 后应保留连续修改结果', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    const patch = await sendChat!({
      conversationId: consultation.conversationId,
      message: '改成胶装',
    })

    assert(patch.intent === 'PARAM_SUPPLEMENT', 'intent 应为 PARAM_SUPPLEMENT')
    assert(patch.status === 'recommendation_updated', 'status 应为 recommendation_updated')
    assert(patch.mergedRecommendedParams.pageCount === 40, '应保留前一轮页数 patch')
    assert(patch.mergedRecommendedParams.bindingType === 'perfect_bind', '应叠加当前装订 patch')
  })

  await test('estimated: 明确报价后进入参考报价链路', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '传单常见方案是什么？')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '常见传单方案可先按 A4、157g 铜版纸起步。如果您需要，我也可以按这个方案给您估个价。',
      {
        intent: 'SPEC_RECOMMENDATION',
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

    await sendChat!({
      conversationId: conversation.id,
      message: '尺寸改成A3',
    })

    const quote = await sendChat!({
      conversationId: conversation.id,
      message: '按这个估个参考价，2000张',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', 'intent 应为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'estimated', 'status 应为 estimated')
    assert(quote.mergedParams.finishedSize === 'A3', '最终应保留 patch 后尺寸')
  })

  await test('quoted: 明确报价后进入正式报价链路', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', 'intent 应为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'quoted', 'status 应为 quoted')
    assert(quote.mergedParams.pageCount === 40, '最终正式报价应使用 patch 后页数')
  })

  await test('handoff_required: 文件型询价不应被推荐链路误吞', async () => {
    const consultation = await sendChat!({
      message: '推荐一个常见标准方案',
    })

    const handoff = await sendChat!({
      conversationId: consultation.conversationId,
      message: '我有PDF设计稿，按文件报价',
    })

    assert(handoff.intent === 'FILE_REVIEW_REQUEST', 'intent 应为 FILE_REVIEW_REQUEST')
    assert(handoff.status === 'handoff_required', 'status 应为 handoff_required')
  })

  await test('patch 失败时不破坏主链路', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const noPatch = await sendChat!({
      conversationId: consultation.conversationId,
      message: '我再想想',
    })

    assert(noPatch.status === 'intent_only', '无法识别 patch 时应进入更安全的兜底状态')

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', '后续仍应识别为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'quoted', 'patch 失败后不应破坏正式报价主链路')
    assert(quote.mergedParams.pageCount === 32, '仍应使用最近有效推荐方案')
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