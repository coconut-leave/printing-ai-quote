import {
  buildBargainRequestReply,
  buildProgressInquiryReply,
  buildSampleRequestReply,
  buildUnknownIntentReply,
} from '@/server/intent/handleIntent'

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

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

console.log('\n=== Intent 业务处理回归测试 ===\n')

test('PROGRESS_INQUIRY: MISSING_FIELDS 应提示缺参', () => {
  const result = buildProgressInquiryReply({
    status: 'MISSING_FIELDS',
    quotes: [],
    handoffs: [],
    messages: [
      {
        sender: 'ASSISTANT',
        metadata: {
          mergedParams: { productType: 'album' },
          missingFields: ['pageCount', 'bindingType'],
        },
      },
    ],
  })
  assert(result.status === 'progress_inquiry', 'status 应为 progress_inquiry')
  assert(result.reply.includes('页数') && result.reply.includes('装订方式'), '应明确提示缺失字段中文名')
})

test('PROGRESS_INQUIRY: QUOTED 应提示已生成报价', () => {
  const result = buildProgressInquiryReply({ status: 'QUOTED', quotes: [{ id: 1 }], handoffs: [] })
  assert(result.reply.includes('已生成报价'), '应提示已生成报价')
  assert(result.reply.includes('报价单导出入口'), '应提示可导出报价单')
})

test('PROGRESS_INQUIRY: PENDING_HUMAN 应提示已转人工', () => {
  const result = buildProgressInquiryReply({ status: 'PENDING_HUMAN', quotes: [], handoffs: [{ id: 1, resolved: false }] })
  assert(result.reply.includes('已转人工处理'), '应提示已转人工')
})

test('SAMPLE_REQUEST: 应返回标准样品咨询话术', () => {
  const result = buildSampleRequestReply()
  assert(result.status === 'sample_request', 'status 应为 sample_request')
  assert(result.reply.includes('打样') || result.reply.includes('样品'), '应包含样品咨询说明')
})

test('BARGAIN_REQUEST: 已有报价时不应直接改正式报价', () => {
  const result = buildBargainRequestReply('这个价格能不能再便宜点', { status: 'QUOTED', quotes: [{ id: 1 }], handoffs: [] })
  assert(result.status === 'bargain_request', 'status 应为 bargain_request')
  assert(result.reply.includes('不会直接修改'), '应明确不直接修改正式报价')
})

test('BARGAIN_REQUEST: 带品类和预算倾向时应返回推荐方案', () => {
  const result = buildBargainRequestReply('企业宣传册预算有限，推荐一个经济一点的方案')
  assert(result.status === 'bargain_request', 'status 应为 bargain_request')
  assert(Boolean(result.recommendedParams), '应返回结构化推荐方案')
  assert(result.recommendedParams?.productType === 'album', '应返回宣传册方案')
  assert(result.recommendedParams?.recommendedParams?.innerWeight === 128, '应返回更经济的内页克重')
})

test('UNKNOWN: 应返回更自然的兜底回复', () => {
  const result = buildUnknownIntentReply()
  assert(result.reply.includes('已收到您的消息'), '应包含更自然的开头')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}