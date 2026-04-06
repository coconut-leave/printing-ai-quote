import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

import { buildMinimalDashboardStats } from '@/server/analytics/dashboard'
import { detectIntent } from '@/server/intent/detectIntent'
import { getClarificationReasonLabel, getClarificationResolvedToLabel } from '@/lib/admin/presentation'

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

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
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

async function mockExtractQuoteParams(): Promise<{ missingFields: string[] }> {
  return { missingFields: [] }
}

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null
let getConversationWithDetailsFn: ((conversationId: number) => Promise<any>) | null = null

async function initializeRuntime() {
  if (sendChat && getConversationWithDetailsFn) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler')
  const conversationModule = await import('@/server/db/conversations')

  if (typeof routeModule.createChatPostHandler !== 'function') {
    throw new Error('createChatPostHandler export not found')
  }

  if (typeof conversationModule.getConversationWithDetails !== 'function') {
    throw new Error('getConversationWithDetails export not found')
  }

  getConversationWithDetailsFn = conversationModule.getConversationWithDetails

  const postHandler = routeModule.createChatPostHandler({
    extractQuoteParams: mockExtractQuoteParams,
  })

  sendChat = async (body: Record<string, any>) => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const response = await postHandler(request)
    return response.json()
  }
}

async function getLatestAssistantMetadata(conversationId: number) {
  if (!getConversationWithDetailsFn) {
    throw new Error('runtime not initialized')
  }

  const conversation = await getConversationWithDetailsFn(conversationId)
  const assistantMessages = conversation.messages.filter((message: { sender: string }) => message.sender === 'ASSISTANT')
  return assistantMessages[assistantMessages.length - 1]?.metadata || null
}

console.log('\n=== 澄清统计与 metadata 回归测试 ===\n')

async function main() {
  await initializeRuntime()

  await test('触发 intent_only 后应写入 clarification metadata', async () => {
    const response = await sendChat!({ message: '111222' })
    const metadata = await getLatestAssistantMetadata(response.conversationId)

    assert(metadata?.responseStatus === 'intent_only', '应保存 intent_only 响应状态')
    assert(metadata?.clarificationTriggered === true, '应写入 clarificationTriggered')
    assert(metadata?.clarificationReason === 'noisy_input', '纯数字串应归为 noisy_input')
    assert(metadata?.clarificationReasonDetail === 'unstable_or_noise_input', '应保留原始触发细节')
  })

  await test('澄清后恢复成 recommendation / missing_fields / estimated / quoted / handoff 时应更新 metadata', async () => {
    const recommendationConversation = await sendChat!({ message: '111222' })
    const recommendation = await sendChat!({
      conversationId: recommendationConversation.conversationId,
      message: '我想做个包装',
    })
    const recommendationMetadata = await getLatestAssistantMetadata(recommendation.conversationId)
    assert(recommendation.status === 'consultation_reply', '应恢复为 recommendation')
    assert(recommendationMetadata?.clarificationRecovered === true, 'recommendation 应标记 recovered')
    assert(recommendationMetadata?.clarificationResolvedTo === 'recommendation', '应写入 recommendation resolvedTo')

    const missingConversation = await sendChat!({ message: '111222' })
    const missingFields = await sendChat!({
      conversationId: missingConversation.conversationId,
      message: '双插盒，7*5*5CM，5000个',
    })
    const missingMetadata = await getLatestAssistantMetadata(missingFields.conversationId)
    assert(missingFields.status === 'missing_fields', '应恢复为 missing_fields')
    assert(missingMetadata?.clarificationRecovered === true, 'missing_fields 应标记 recovered')
    assert(missingMetadata?.clarificationResolvedTo === 'missing_fields', '应写入 missing_fields resolvedTo')

    const estimatedConversation = await sendChat!({ message: '111222' })
    const estimated = await sendChat!({
      conversationId: estimatedConversation.conversationId,
      message: '开窗彩盒，规格21*17*31cm，400克单铜，印四色，过光胶，500个',
    })
    const estimatedMetadata = await getLatestAssistantMetadata(estimated.conversationId)
    assert(estimated.status === 'estimated', '应恢复为 estimated')
    assert(estimatedMetadata?.clarificationRecovered === true, 'estimated 应标记 recovered')
    assert(estimatedMetadata?.clarificationResolvedTo === 'estimated', '应写入 estimated resolvedTo')

    const quotedConversation = await sendChat!({ message: '111222' })
    const quoted = await sendChat!({
      conversationId: quotedConversation.conversationId,
      message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
    })
    const quotedMetadata = await getLatestAssistantMetadata(quoted.conversationId)
    assert(quoted.status === 'quoted', '应恢复为 quoted')
    assert(quotedMetadata?.clarificationRecovered === true, 'quoted 应标记 recovered')
    assert(quotedMetadata?.clarificationResolvedTo === 'quoted', '应写入 quoted resolvedTo')

    const handoffConversation = await sendChat!({ message: '111222' })
    const handoff = await sendChat!({
      conversationId: handoffConversation.conversationId,
      message: '我有PDF设计稿，按文件报价',
    })
    const handoffMetadata = await getLatestAssistantMetadata(handoff.conversationId)
    assert(handoff.status === 'handoff_required', '应恢复为 handoff_required')
    assert(handoffMetadata?.clarificationRecovered === false, 'handoff 不应记为 recovered')
    assert(handoffMetadata?.clarificationResolvedTo === 'handoff_required', '应写入 handoff_required resolvedTo')
  })

  await test('dashboard 应正确统计澄清触发、恢复、转人工和无后续', () => {
    const now = new Date('2026-04-06T12:00:00.000Z')
    const stats = buildMinimalDashboardStats({
      now,
      period: '7d',
      conversations: [
        {
          id: 1,
          status: 'OPEN',
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          messages: [
            { id: 11, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T10:00:00.000Z'), metadata: { responseStatus: 'intent_only', clarificationTriggered: true, clarificationReason: 'noisy_input', clarificationReasonDetail: 'unstable_or_noise_input' } },
          ],
          quotes: [],
          handoffs: [],
        },
        {
          id: 2,
          status: 'QUOTED',
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          messages: [
            { id: 21, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T09:00:00.000Z'), metadata: { responseStatus: 'intent_only', clarificationTriggered: true, clarificationReason: 'unstable_intent', clarificationReasonDetail: 'weak_business_input' } },
            { id: 22, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T09:05:00.000Z'), metadata: { responseStatus: 'quoted', clarificationRecovered: true, clarificationResolvedTo: 'quoted' } },
          ],
          quotes: [{ id: 201 }],
          handoffs: [],
        },
        {
          id: 3,
          status: 'PENDING_HUMAN',
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          messages: [
            { id: 31, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T08:00:00.000Z'), metadata: { responseStatus: 'intent_only', clarificationTriggered: true, clarificationReason: 'blocked_context_reuse', clarificationReasonDetail: 'complex_packaging_context_not_stably_matched', blockedContextReuse: true } },
            { id: 32, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T08:05:00.000Z'), metadata: { responseStatus: 'handoff_required', clarificationRecovered: false, clarificationResolvedTo: 'handoff_required' } },
          ],
          quotes: [],
          handoffs: [{ reason: '需要人工接管', createdAt: new Date('2026-04-05T08:05:00.000Z') }],
        },
        {
          id: 4,
          status: 'MISSING_FIELDS',
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          messages: [
            { id: 41, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T07:00:00.000Z'), metadata: { responseStatus: 'intent_only', clarificationTriggered: true, clarificationReason: 'unstable_intent', clarificationReasonDetail: 'cannot_stably_answer_input' } },
            { id: 42, sender: 'ASSISTANT', createdAt: new Date('2026-04-05T07:05:00.000Z'), metadata: { responseStatus: 'missing_fields', clarificationRecovered: true, clarificationResolvedTo: 'missing_fields', mergedParams: { productType: 'tuck_end_box' }, missingFields: ['length'] } },
          ],
          quotes: [],
          handoffs: [],
        },
      ],
      reflections: [],
      approvedReflections: [],
    })

    assert(stats.clarificationOverview.clarificationConversationCount === 4, '应统计触发澄清的会话数')
    assert(stats.clarificationOverview.clarificationTriggerCount === 4, '应统计澄清触发次数')
    assert(stats.clarificationOverview.recoveredConversationCount === 2, '应统计澄清后恢复成功的会话数')
    assert(stats.clarificationOverview.handoffConversationCount === 1, '应统计澄清后转人工的会话数')
    assert(stats.clarificationOverview.noFollowupConversationCount === 1, '应统计澄清后无后续的会话数')
    assert(stats.clarificationResolvedBreakdown.find((item) => item.resolvedTo === 'quoted')?.count === 1, '应统计恢复到 quoted 的数量')
    assert(stats.clarificationResolvedBreakdown.find((item) => item.resolvedTo === 'no_followup')?.count === 1, '应统计 no_followup 的数量')
    assert(stats.clarificationReasonBreakdown.find((item) => item.reason === 'blocked_context_reuse')?.handoffCount === 1, '应按原因统计转人工')
  })

  await test('中文展示映射应输出业务化标签', () => {
    assert(getClarificationReasonLabel('noisy_input') === '噪声输入', 'reason 标签应中文化')
    assert(getClarificationReasonLabel('blocked_context_reuse') === '阻止沿用旧报价', 'blocked_context_reuse 应中文化')
    assert(getClarificationResolvedToLabel('recommendation') === '恢复为推荐方案', 'recommendation 去向应中文化')
    assert(getClarificationResolvedToLabel('no_followup') === '无后续消息', 'no_followup 去向应中文化')
  })

  await test('推荐上下文中的确认句仍应保持 recommendation confirmation', () => {
    const result = detectIntent({ message: '按这个做', hasRecommendedParams: true })
    assert(result.intent === 'RECOMMENDATION_CONFIRMATION', '按这个做在推荐上下文中应继续命中 recommendation confirmation')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((item) => item.passed).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})