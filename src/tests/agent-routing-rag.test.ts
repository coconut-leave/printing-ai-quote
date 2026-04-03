import { answerKnowledgeQuestion } from '@/server/rag/answerKnowledgeQuestion'
import { routeMessage } from '@/server/ai/routeMessage'

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

async function test(name: string, fn: () => Promise<void> | void) {
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

console.log('\n=== 轻量 Agent Router 与 RAG 回归测试 ===\n')

async function main() {
  await test('工艺解释类问题应路由到 KNOWLEDGE_QA', async () => {
    const result = await routeMessage({
      message: '骑马钉和胶装有什么区别？',
    })

    assert(result.intent === 'KNOWLEDGE_QA', '工艺解释问题应进入 KNOWLEDGE_QA')
    assert(result.shouldUseRAG === true, 'KNOWLEDGE_QA 应启用 RAG')
    assert(result.shouldRunQuoteEngine === false, '知识问答不应进入报价引擎')
  })

  await test('标准询价不应误走 RAG', async () => {
    const result = await routeMessage({
      message: '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，报价',
    })

    assert(result.intent === 'QUOTE_REQUEST', '标准询价应进入 QUOTE_REQUEST')
    assert(result.shouldUseRAG === false, '标准询价不应启用 RAG')
    assert(result.shouldRunQuoteEngine === true, '标准询价应继续走报价引擎')
  })

  await test('模型误判 FILE 时，标准报价应回退到 QUOTE_REQUEST', async () => {
    const result = await routeMessage(
      {
        message: '名片报价，90x54mm，300g铜版纸，双面',
      },
      {
        callModel: async () => `{
  "intent": "FILE_BASED_INQUIRY",
  "confidence": 0.88,
  "shouldUseRAG": false,
  "shouldExtractParams": false,
  "shouldRunQuoteEngine": false,
  "shouldHandoff": true,
  "shouldGenerateAlternativePlan": false,
  "reason": "looks like design file quote"
}`,
      }
    )

    assert(result.intent === 'QUOTE_REQUEST', '标准规格化报价应回退到 QUOTE_REQUEST')
    assert(result.shouldHandoff === false, '标准规格化报价不应被直接 handoff')
    assert(result.shouldRunQuoteEngine === true, '标准规格化报价应继续走报价引擎')
  })

  await test('材质适配问题应路由到 KNOWLEDGE_QA', async () => {
    const result = await routeMessage({
      message: '商务名片用什么材质合适',
    })

    assert(result.intent === 'KNOWLEDGE_QA', '材质适配问题应进入 KNOWLEDGE_QA')
    assert(result.shouldUseRAG === true, '材质适配问题应启用 RAG')
    assert(result.shouldRunQuoteEngine === false, '知识问答不应进入报价引擎')
  })

  await test('文件型询价应路由为 FILE_BASED_INQUIRY', async () => {
    const result = await routeMessage({
      message: '我有 PDF 设计稿，帮我看一下并报价',
    })

    assert(result.intent === 'FILE_BASED_INQUIRY', '文件型询价应进入 FILE_BASED_INQUIRY')
    assert(result.shouldHandoff === true, '文件型询价应继续 handoff')
  })

  await test('路由器输出 JSON 应稳定可解析', async () => {
    const result = await routeMessage(
      {
        message: '胶装和骑马钉怎么选？',
      },
      {
        callModel: async () => `\`\`\`json
{
  "intent": "KNOWLEDGE_QA",
  "confidence": 0.91,
  "shouldUseRAG": true,
  "shouldExtractParams": false,
  "shouldRunQuoteEngine": false,
  "shouldHandoff": false,
  "shouldGenerateAlternativePlan": false,
  "reason": "user is asking explanatory process question"
}
\`\`\``,
      }
    )

    assert(result.intent === 'KNOWLEDGE_QA', '应能稳定解析 intent')
    assert(result.confidence === 0.91, '应能稳定解析 confidence')
    assert(result.reason.includes('process question'), '应能稳定解析 reason')
  })

  await test('知识不足时回答应保守兜底', async () => {
    const result = await answerKnowledgeQuestion('量子隐形油墨和纳米压纹怎么一起做？', {
      rewriteQuery: async () => ({
        searchQuery: '量子隐形油墨 纳米压纹',
        topics: ['special_process'],
      }),
      retrieveKnowledge: () => [],
    })

    assert(result.conservative === true, '知识不足时应进入保守兜底')
    assert(result.reply.includes('当前知识库里没有足够依据'), '应明确说明知识不足')
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