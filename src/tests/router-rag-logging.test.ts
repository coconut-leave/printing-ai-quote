import { answerKnowledgeQuestion } from '@/server/rag/answerKnowledgeQuestion'
import { routeMessageWithTrace } from '@/server/ai/routeMessage'

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

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

async function captureLogs(fn: () => Promise<void>): Promise<string[]> {
  const originalConsoleInfo = console.info
  const logs: string[] = []
  process.env.ENABLE_TRACE_TEST_LOGS = 'true'

  console.info = (...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(' '))
  }

  try {
    await fn()
    return logs
  } finally {
    console.info = originalConsoleInfo
    delete process.env.ENABLE_TRACE_TEST_LOGS
  }
}

console.log('\n=== Router / RAG 命中日志回归测试 ===\n')

async function main() {
  await test('consultation 命中会产生日志', async () => {
    const logs = await captureLogs(async () => {
      await routeMessageWithTrace(
        { message: '铜版纸和哑粉纸有什么区别？' },
        {},
        { conversationId: 101, requestId: 'req_consult' }
      )
    })

    const line = logs.find((log) => log.includes('"stage":"router_hit"'))
    assert(Boolean(line), '应输出 router_hit 日志')
    assert(line!.includes('"intent":"KNOWLEDGE_QA"'), 'consultation 应记录 KNOWLEDGE_QA')
    assert(line!.includes('"conversationId":101'), '应记录 conversationId')
    assert(line!.includes('"requestId":"req_consult"'), '应记录 requestId')
  })

  await test('quote request 命中会产生日志', async () => {
    const logs = await captureLogs(async () => {
      await routeMessageWithTrace(
        { message: '我想印1000本A4画册，报价' },
        {},
        { requestId: 'req_quote' }
      )
    })

    const line = logs.find((log) => log.includes('"stage":"router_hit"'))
    assert(Boolean(line), '应输出 router_hit 日志')
    assert(line!.includes('"intent":"QUOTE_REQUEST"'), 'quote request 应记录 QUOTE_REQUEST')
    assert(line!.includes('"shouldRunQuoteEngine":true'), 'quote request 应记录 shouldRunQuoteEngine=true')
    assert(line!.includes('"reason"'), '应记录 reason')
  })

  await test('handoff 命中会产生日志', async () => {
    const logs = await captureLogs(async () => {
      await routeMessageWithTrace(
        { message: '我有PDF设计稿，帮我看一下并报价' },
        {},
        { requestId: 'req_handoff' }
      )
    })

    const line = logs.find((log) => log.includes('"stage":"router_hit"'))
    assert(Boolean(line), '应输出 router_hit 日志')
    assert(line!.includes('"intent":"FILE_BASED_INQUIRY"'), 'handoff 问题应记录 FILE_BASED_INQUIRY')
    assert(line!.includes('"shouldHandoff":true'), 'handoff 问题应记录 shouldHandoff=true')
  })

  await test('RAG rewrite / retrieve / fallback / insufficient knowledge 都能看到对应日志', async () => {
    const logs = await captureLogs(async () => {
      await answerKnowledgeQuestion(
        '量子隐形油墨和纳米压纹怎么一起做？',
        {
          rewriteQuery: async () => ({
            searchQuery: '量子隐形油墨 纳米压纹',
            topics: ['special_process'],
            rewriteStrategy: 'custom',
            fallbackUsed: false,
          }),
        },
        { conversationId: 202, requestId: 'req_rag' }
      )
    })

    const hitLine = logs.find((log) => log.includes('"stage":"rag_hit"'))

    assert(Boolean(hitLine), '应输出 rag_hit 日志')
    assert(hitLine!.includes('"rewrittenQuery":"量子隐形油墨 纳米压纹"'), '应记录 rewrite 后 query')
    assert(hitLine!.includes('"topK":3'), '应记录 top-k 配置')
    assert(hitLine!.includes('"fallbackUsed":true'), '知识不足时应记录 fallbackUsed=true')
    assert(hitLine!.includes('"fallbackReason":"no_retrieved_snippets"'), '应记录 fallbackReason')
    assert(hitLine!.includes('"insufficientKnowledge":true'), '应记录 insufficientKnowledge=true')
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