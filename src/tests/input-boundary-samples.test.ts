import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

import { detectIntent } from '@/server/intent/detectIntent'
import {
  AMBIGUOUS_CONSULTATION_SAMPLES,
  BOUNDARY_NO_CONTEXT_SAMPLES,
  BOUNDARY_RECOMMENDATION_CONTEXT_SAMPLES,
  IRRELEVANT_FOLLOW_UP_SAMPLES,
  PURE_NOISE_INPUT_SAMPLES,
  SHORT_PATCH_SAMPLES,
  WEAK_BUSINESS_INPUT_SAMPLES,
} from '@/tests/fixtures/inputBoundarySamples'

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

function resetExtractCallCount() {
  extractCallCount = 0
}

async function mockExtractQuoteParams(): Promise<{ missingFields: string[] }> {
  extractCallCount += 1
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

async function createQuotedMainPackagingConversation() {
  const response = await sendChat!({
    message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
  })

  assert(response.status === 'quoted', 'quoted 主件上下文初始化应成功')
  return response
}

async function createEstimatedBundleConversation() {
  const response = await sendChat!({
    message: '双插盒：7*5*5CM，350克白卡，正反四色，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
  })

  assert(response.status === 'estimated', 'estimated bundle 上下文初始化应成功')
  return response
}

console.log('\n=== 输入边界样本回归测试 ===\n')

async function main() {
  await initializeRuntime()

  await test('纯噪声输入样本应进入澄清兜底', async () => {
    for (const sample of PURE_NOISE_INPUT_SAMPLES) {
      resetExtractCallCount()
      const response = await sendChat!({ message: sample.message })
      const metadata = await getLatestAssistantMetadata(response.conversationId)

      assert(response.status === 'intent_only', `${sample.message} 应进入 intent_only`)
      assert(extractCallCount === 0, `${sample.message} 不应继续抽参`)
      assert(metadata?.clarificationTriggered === true, `${sample.message} 应写入 clarificationTriggered`)
      assert(metadata?.clarificationReason === sample.expectedClarificationReason, `${sample.message} 应写入期望澄清原因`) 
    }
  })

  await test('弱业务输入样本应澄清，但不能误判为噪声垃圾', async () => {
    for (const sample of WEAK_BUSINESS_INPUT_SAMPLES) {
      resetExtractCallCount()
      const response = await sendChat!({ message: sample.message })
      const metadata = await getLatestAssistantMetadata(response.conversationId)

      assert(response.status === 'intent_only', `${sample.message} 应先澄清`) 
      assert(extractCallCount === 0, `${sample.message} 不应继续抽参`) 
      assert(metadata?.clarificationReason === 'unstable_intent', `${sample.message} 应归为意图不稳定`) 
    }
  })

  await test('模糊咨询样本应按预期落到推荐或澄清', async () => {
    for (const sample of AMBIGUOUS_CONSULTATION_SAMPLES) {
      const response = await sendChat!({ message: sample.message })

      if (sample.expectedBehavior === 'recommendation') {
        assert(response.status === 'consultation_reply', `${sample.message} 应进入 recommendation / consultation_reply`) 
        assert(response.intent === sample.expectedIntent, `${sample.message} 应命中 ${sample.expectedIntent}`)
      } else {
        const metadata = await getLatestAssistantMetadata(response.conversationId)
        assert(response.status === 'intent_only', `${sample.message} 应进入澄清`) 
        assert(metadata?.clarificationReason === sample.expectedClarificationReason, `${sample.message} 应写入期望澄清原因`) 
      }
    }
  })

  await test('已有正式报价后，无关输入样本不应继续复用旧报价', async () => {
    for (const sample of IRRELEVANT_FOLLOW_UP_SAMPLES) {
      const quoted = await createQuotedMainPackagingConversation()
      const response = await sendChat!({
        conversationId: quoted.conversationId,
        message: sample.message,
      })
      const metadata = await getLatestAssistantMetadata(response.conversationId)

      assert(response.status === 'intent_only', `${sample.message} 在旧报价后应进入澄清`) 
      assert(response.blockedContextReuse === true, `${sample.message} 应阻断旧报价上下文复用`) 
      assert(!response.data && !response.estimatedData, `${sample.message} 不应继续返回旧报价数据`) 
      assert(metadata?.clarificationReason === sample.expectedClarificationReason, `${sample.message} 应写入 blocked_context_reuse`) 
    }
  })

  await test('真正的补参/改单短句不能被 guardrail 误拦', async () => {
    for (const sample of SHORT_PATCH_SAMPLES) {
      const baseConversation = sample.setup === 'quoted_main_packaging'
        ? await createQuotedMainPackagingConversation()
        : await createEstimatedBundleConversation()

      const response = await sendChat!({
        conversationId: baseConversation.conversationId,
        message: sample.message,
      })

      assert(response.status === sample.expectedBehavior, `${sample.message} 应继续进入 ${sample.expectedBehavior}`)
      assert(response.status !== 'intent_only', `${sample.message} 不应被误拦到 intent_only`) 
    }
  })

  await test('无上下文的难判断边界句应进入合理澄清', async () => {
    for (const sample of BOUNDARY_NO_CONTEXT_SAMPLES) {
      const response = await sendChat!({ message: sample.message })
      const metadata = await getLatestAssistantMetadata(response.conversationId)

      assert(response.status === 'intent_only', `${sample.message} 应进入澄清`) 
      assert(metadata?.clarificationReason === sample.expectedClarificationReason, `${sample.message} 应归为意图不稳定`) 
    }
  })

  await test('推荐上下文中的边界确认句应继续识别为 recommendation confirmation', async () => {
    for (const sample of BOUNDARY_RECOMMENDATION_CONTEXT_SAMPLES) {
      const result = detectIntent({
        message: sample.message,
        hasRecommendedParams: true,
      })

      assert(result.intent === sample.expectedIntent, `${sample.message} 在推荐上下文中应命中 ${sample.expectedIntent}`)
    }
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