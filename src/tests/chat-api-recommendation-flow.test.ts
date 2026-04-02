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
  if (message.includes('5000张')) {
    return buildExtracted({ quantity: 5000 })
  }

  if (message.includes('2000本')) {
    return buildExtracted({ quantity: 2000 })
  }

  if (message.includes('2000张')) {
    return buildExtracted({ quantity: 2000 })
  }

  if (message.includes('90x50mm')) {
    return buildExtracted({ finishedSize: '90x50mm', quantity: 1000 })
  }

  if (message.includes('uv上光') || message.includes('改uv')) {
    return buildExtracted({ finishType: 'uv' })
  }

  if (message.includes('哑膜')) {
    return buildExtracted({ lamination: 'matte' })
  }

  if (message.includes('改成胶装')) {
    return buildExtracted({ quantity: 1000, bindingType: 'perfect_bind' })
  }

  if (message.includes('改胶装')) {
    return buildExtracted({ bindingType: 'perfect_bind' })
  }

  if (message.includes('改单面')) {
    return buildExtracted({ quantity: 5000, printSides: 'single' })
  }

  if (message.includes('页数改成40页')) {
    return buildExtracted({ quantity: 1000, pageCount: 40, coverWeight: 200 })
  }

  if (message.includes('页数改成40')) {
    return buildExtracted({ pageCount: 40 })
  }

  if (message.includes('页数改成48')) {
    return buildExtracted({ pageCount: 48 })
  }

  if (message.includes('内页改157g')) {
    return buildExtracted({ quantity: 1000, innerWeight: 157 })
  }

  if (message.includes('内页改128g')) {
    return buildExtracted({ quantity: 1000, innerWeight: 128 })
  }

  if (message.includes('1000本')) {
    return buildExtracted({ quantity: 1000 })
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

  const postHandler = routeModule.createChatPostHandler({
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

  createConversationForTest = conversationModule.createConversation
  addMessageForTest = conversationModule.addMessageToConversation
}

console.log('\n=== Chat API 推荐方案接续报价回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('咨询后直接确认推荐方案，进入 quoted', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    assert(consultation.status === 'consultation_reply', '咨询轮应返回 consultation_reply')
    assert(Boolean(consultation.recommendedParams), '咨询轮应返回 recommendedParams')

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(confirmation.intent === 'RECOMMENDATION_CONFIRMATION', '确认轮应识别为 RECOMMENDATION_CONFIRMATION')
    assert(confirmation.status === 'quoted', '确认轮应进入 quoted')
    assert(confirmation.mergedParams.productType === 'album', '应带入推荐方案 productType')
    assert(confirmation.mergedParams.pageCount === 32, '应带入推荐方案页数')
    assert(confirmation.mergedParams.quantity === 1000, '应合并当前消息数量')
  })

  await test('咨询后确认推荐方案，但参数仍不全，进入 estimated', async () => {
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
          note: '这是用于 estimated 回归测试的最小推荐方案。',
        },
      }
    )

    const confirmation = await sendChat!({
      conversationId: conversation.id,
      message: '按这个方案报价，2000张',
    })

    assert(confirmation.intent === 'RECOMMENDATION_CONFIRMATION', '确认轮应识别为 RECOMMENDATION_CONFIRMATION')
    assert(confirmation.status === 'estimated', '参数仍不全时应进入 estimated')
    assert(Array.isArray(confirmation.missingFields), '应返回 missingFields')
    assert(confirmation.missingFields.includes('printSides'), '应只缺少 printSides')
    assert(confirmation.mergedParams.finishedSize === 'A4', '应带入推荐方案尺寸')
    assert(confirmation.mergedParams.paperWeight === 157, '应带入推荐方案克重')
    assert(confirmation.mergedParams.quantity === 2000, '应合并当前消息数量')
  })

  await test('咨询后确认并修改一个参数，再进入报价链路', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '改成胶装，1000本，再报价',
    })

    assert(confirmation.intent === 'RECOMMENDATION_CONFIRMATION', '确认轮应识别为 RECOMMENDATION_CONFIRMATION')
    assert(confirmation.status === 'quoted', '修改单个参数后应继续进入 quoted')
    assert(confirmation.mergedParams.bindingType === 'perfect_bind', '应覆盖推荐方案中的装订方式')
    assert(confirmation.mergedParams.pageCount === 32, '未修改页数应保留推荐值')
    assert(confirmation.mergedParams.quantity === 1000, '应合并当前消息数量')
  })

  await test('咨询后确认并修改多个参数，再进入报价链路', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40页，封面还是200g，1000本，再算一下',
    })

    assert(confirmation.intent === 'RECOMMENDATION_CONFIRMATION', '确认轮应识别为 RECOMMENDATION_CONFIRMATION')
    assert(confirmation.status === 'quoted', '修改多个参数后应继续进入 quoted')
    assert(confirmation.mergedParams.pageCount === 40, '页数应按当前消息覆盖')
    assert(confirmation.mergedParams.coverWeight === 200, '封面克重应按当前消息保留')
    assert(confirmation.mergedParams.bindingType === 'saddle_stitch', '未修改装订方式应保留推荐值')
    assert(confirmation.mergedParams.quantity === 1000, '应合并当前消息数量')
  })

  await test('推荐方案 patch: 只改一个字段时，不需要重说整套参数', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40，1000本，再报价',
    })

    assert(confirmation.patchParams.pageCount === 40, '应返回页数 patch')
    assert(confirmation.mergedRecommendedParams.pageCount === 40, 'patch 后推荐方案页数应更新')
    assert(confirmation.status === 'quoted', '应继续进入 quoted')
  })

  await test('推荐方案 patch: 同时改多个字段', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40，内页改128g，1000本，再报价',
    })

    assert(confirmation.patchParams.pageCount === 40, '应返回页数 patch')
    assert(confirmation.patchParams.innerWeight === 128, '应返回内页克重 patch')
    assert(confirmation.mergedRecommendedParams.innerWeight === 128, 'patch 后推荐方案应更新内页克重')
  })

  await test('推荐方案 patch: 局部保留 + 局部修改', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const confirmation = await sendChat!({
      conversationId: consultation.conversationId,
      message: '封面还是200g，内页改157g，1000本，再报价',
    })

    assert(confirmation.patchParams.coverWeight === 200, '应返回封面保留 patch')
    assert(confirmation.patchParams.innerWeight === 157, '应返回内页修改 patch')
    assert(confirmation.mergedRecommendedParams.coverWeight === 200, 'patch 后推荐方案应保留封面克重')
  })

  await test('推荐方案 patch: 保留 + 替换表达应自然支持', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const patch = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数不变，改胶装',
    })

    assert(patch.status === 'recommendation_updated', '自然表达 patch 应返回 recommendation_updated')
    assert(patch.mergedRecommendedParams.pageCount === 32, '页数应保持原推荐值')
    assert(patch.mergedRecommendedParams.bindingType === 'perfect_bind', '装订应替换为胶装')
  })

  await test('推荐方案 patch: 相对调整应基于当前方案解释', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '传单常见方案是什么？')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '常见传单方案可先按 A4、157g 铜版纸、双面印刷起步。如果您需要，我也可以按这个方案给您估个价。',
      {
        intent: 'SOLUTION_RECOMMENDATION',
        recommendedParams: {
          productType: 'flyer',
          recommendedParams: {
            finishedSize: 'A4',
            paperType: 'coated',
            paperWeight: 157,
            printSides: 'double',
          },
        },
      }
    )

    const patch = await sendChat!({
      conversationId: conversation.id,
      message: '还是双面，但纸张换薄一点',
    })

    assert(patch.status === 'recommendation_updated', '相对调整应返回 recommendation_updated')
    assert(patch.mergedRecommendedParams.printSides === 'double', '单双面应保持原推荐值')
    assert(patch.mergedRecommendedParams.paperWeight === 128, '纸张克重应下调一档')
  })

  await test('推荐方案重推荐: 更便宜一点应返回新的 recommendedParams', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const rerecommended = await sendChat!({
      conversationId: consultation.conversationId,
      message: '不要这个方案，再推荐一个更便宜的',
    })

    assert(rerecommended.intent === 'BARGAIN_REQUEST', '应识别为 BARGAIN_REQUEST')
    assert(rerecommended.status === 'recommendation_updated', '应返回 recommendation_updated')
    assert(rerecommended.recommendedParams.recommendedParams.pageCount === 24, '应返回更经济的画册页数')
    assert(rerecommended.recommendedParams.recommendedParams.innerWeight === 128, '应返回更经济的内页克重')
  })

  await test('推荐方案重推荐: 更常见一点应返回新的推荐方案', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '推荐一个商务名片方案')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '商务名片常见会先按 90x54mm、300g 铜版纸、双面印刷、UV 起步。',
      {
        intent: 'SOLUTION_RECOMMENDATION',
        recommendedParams: {
          productType: 'business_card',
          recommendedParams: {
            finishedSize: '90x54mm',
            paperType: 'coated',
            paperWeight: 300,
            printSides: 'double',
            finishType: 'uv',
          },
        },
      }
    )

    const rerecommended = await sendChat!({
      conversationId: conversation.id,
      message: '给我一个更常见的方案',
    })

    assert(rerecommended.intent === 'SOLUTION_RECOMMENDATION', '应识别为 SOLUTION_RECOMMENDATION')
    assert(rerecommended.status === 'recommendation_updated', '应返回 recommendation_updated')
    assert(rerecommended.recommendedParams.recommendedParams.finishType == null, '应切回更常见的标准名片方案')
    assert(rerecommended.recommendedParams.recommendedParams.paperWeight === 300, '应返回标准名片方案参数')
  })

  await test('多轮 patch: 连续两轮 patch 后再报价', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const patch1 = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    assert(patch1.status === 'recommendation_updated', '第一轮 patch 不应直接报价')
    assert(patch1.mergedRecommendedParams.pageCount === 40, '第一轮 patch 后应更新页数')

    const patch2 = await sendChat!({
      conversationId: consultation.conversationId,
      message: '改成胶装',
    })

    assert(patch2.status === 'recommendation_updated', '第二轮 patch 不应直接报价')
    assert(patch2.mergedRecommendedParams.pageCount === 40, '第二轮 patch 应继承上一轮页数')
    assert(patch2.mergedRecommendedParams.bindingType === 'perfect_bind', '第二轮 patch 应更新装订方式')

    const quote = await sendChat!({
      conversationId: consultation.conversationId,
      message: '现在算一下，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', '最终触发报价应识别为 RECOMMENDATION_CONFIRMATION')
    assert(quote.status === 'quoted', '最终应进入 quoted')
    assert(quote.mergedParams.pageCount === 40, '最终报价应使用连续 patch 后的页数')
    assert(quote.mergedParams.bindingType === 'perfect_bind', '最终报价应使用连续 patch 后的装订方式')
  })

  await test('多轮 patch: 连续 patch 但未明确报价，不应误进入 quoted', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    const patch1 = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    const patch2 = await sendChat!({
      conversationId: consultation.conversationId,
      message: '内页改128g',
    })

    assert(patch1.status === 'recommendation_updated', 'patch 更新应返回 recommendation_updated')
    assert(patch2.status === 'recommendation_updated', '连续 patch 仍应返回 recommendation_updated')
  })

  await test('多轮 patch: 后一轮 patch 应覆盖前一轮相同字段', async () => {
    const consultation = await sendChat!({
      message: 'A4画册一般多少页比较合适？',
    })

    await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成40',
    })

    const patch2 = await sendChat!({
      conversationId: consultation.conversationId,
      message: '页数改成48',
    })

    assert(patch2.status === 'recommendation_updated', '覆盖 patch 不应直接报价')
    assert(patch2.mergedRecommendedParams.pageCount === 48, '后一轮 patch 应覆盖前一轮同字段值')
  })

  await test('多轮 patch: 最终进入 estimated', async () => {
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
          note: '这是用于多轮 patch estimated 回归测试的最小推荐方案。',
        },
      }
    )

    const patch = await sendChat!({
      conversationId: conversation.id,
      message: '尺寸改成A3',
    })

    assert(patch.status === 'recommendation_updated', 'patch 更新不应直接报价')

    const quote = await sendChat!({
      conversationId: conversation.id,
      message: '现在算一下，2000张',
    })

    assert(quote.status === 'estimated', '多轮 patch 后缺参时应进入 estimated')
    assert(quote.mergedParams.finishedSize === 'A3', '最终应使用 patch 后尺寸')
  })

  await test('推荐方案 patch: 名片工艺可单独修改', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '名片常见方案是什么？')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '常见名片方案可先按 90x54mm、300g 铜版纸、双面印刷。如果您需要，我也可以按这个方案给您估个价。',
      {
        intent: 'SPEC_RECOMMENDATION',
        recommendedParams: {
          productType: 'business_card',
          recommendedParams: {
            finishedSize: '90x54mm',
            paperType: 'coated',
            paperWeight: 300,
            printSides: 'double',
            finishType: 'none',
          },
          note: '这是用于名片工艺 patch 回归测试的推荐方案。',
        },
      }
    )

    const patch = await sendChat!({
      conversationId: conversation.id,
      message: '改成UV上光',
    })

    assert(patch.status === 'recommendation_updated', '名片工艺 patch 不应直接报价')
    assert(patch.mergedRecommendedParams.finishType === 'uv', '应更新名片工艺为 UV')
  })

  await test('推荐方案 patch: 海报覆膜可单独修改', async () => {
    const conversation = await createConversationForTest!()
    await addMessageForTest!(conversation.id, 'CUSTOMER', '海报常见方案是什么？')
    await addMessageForTest!(
      conversation.id,
      'ASSISTANT',
      '常见海报方案可先按 A2、157g 铜版纸、不覆膜起步。如果您需要，我也可以按这个方案给您估个价。',
      {
        intent: 'SPEC_RECOMMENDATION',
        recommendedParams: {
          productType: 'poster',
          recommendedParams: {
            finishedSize: 'A2',
            paperType: 'coated',
            paperWeight: 157,
            lamination: 'none',
            quantity: 200,
          },
          note: '这是用于海报覆膜 patch 回归测试的推荐方案。',
        },
      }
    )

    const patch = await sendChat!({
      conversationId: conversation.id,
      message: '改哑膜',
    })

    assert(patch.status === 'recommendation_updated', '海报覆膜 patch 不应直接报价')
    assert(patch.mergedRecommendedParams.lamination === 'matte', '应更新海报覆膜为哑膜')
  })

  await test('多轮 patch: 推荐方案不存在时，不应误走多轮 patch', async () => {
    const first = await sendChat!({
      message: '页数改成40',
    })

    const second = await sendChat!({
      conversationId: first.conversationId,
      message: '改成胶装',
    })

    assert(first.status !== 'recommendation_updated', '没有推荐方案上下文时不应进入 recommendation_updated')
    assert(!second.patchParams, '没有推荐方案上下文时不应返回 patchParams')
  })

  await test('BARGAIN_REQUEST: 预算倾向场景也应返回 recommendedParams 并可接续报价', async () => {
    const consult = await sendChat!({
      message: '企业宣传册预算有限，推荐一个经济一点的方案',
    })

    assert(consult.intent === 'BARGAIN_REQUEST', '预算倾向场景应识别为 BARGAIN_REQUEST')
    assert(consult.status === 'bargain_request', '应返回 bargain_request')
    assert(Boolean(consult.recommendedParams), '应返回 recommendedParams')
    assert(consult.recommendedParams.recommendedParams.innerWeight === 128, '应返回经济宣传册方案')

    const quote = await sendChat!({
      conversationId: consult.conversationId,
      message: '按这个方案报价，1000本',
    })

    assert(quote.intent === 'RECOMMENDATION_CONFIRMATION', '应允许预算方案接续报价')
    assert(quote.mergedParams.innerWeight === 128, '正式报价应沿用经济方案内页克重')
  })

  await test('推荐方案不存在时，不应误走 patch 合并', async () => {
    const followUp = await sendChat!({
      message: '页数改成40',
    })

    assert(!followUp.patchParams, '没有推荐方案上下文时不应返回 patchParams')
  })

  await test('存在 recommendedParams 时，继续要其他推荐不应进入报价链路', async () => {
    const consultation = await sendChat!({
      message: '推荐一个常见标准方案',
    })

    const followUp = await sendChat!({
      conversationId: consultation.conversationId,
      message: '还有别的推荐方案吗？',
    })

    assert(followUp.intent !== 'RECOMMENDATION_CONFIRMATION', '继续推荐不应识别为 RECOMMENDATION_CONFIRMATION')
    assert(followUp.status === 'consultation_reply', '应继续停留在咨询回复链路')
  })

  await test('没有 recommendedParams 时，按这个来也不应直接进入报价链路', async () => {
    const followUp = await sendChat!({
      message: '按这个来',
    })

    assert(followUp.intent !== 'RECOMMENDATION_CONFIRMATION', '没有推荐方案上下文时不应识别为 RECOMMENDATION_CONFIRMATION')
    assert(followUp.status === 'intent_only', '应回到更安全的兜底分支')
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