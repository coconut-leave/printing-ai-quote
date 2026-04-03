import { execSync } from 'child_process'
import path from 'path'

interface ModuleResult {
  name: string
  success: boolean
  output: string
}

const results: ModuleResult[] = []
const testModules = [
  { name: '计价引擎测试', file: 'src/tests/pricing-engines.test.ts' },
  { name: '参数合并与检测测试', file: 'src/tests/parameter-merging.test.ts' },
  { name: '人工接管请求校验回归测试', file: 'src/tests/handoff-request.test.ts' },
  { name: 'Poster 闭环测试', file: 'src/tests/poster-flow.test.ts' },
  { name: '统一报价策略四路径回归测试', file: 'src/tests/workflow-policy-regression.test.ts' },
  { name: 'Intent 检测回归测试', file: 'src/tests/intent-detection.test.ts' },
  { name: 'Intent 业务处理回归测试', file: 'src/tests/intent-handlers.test.ts' },
  { name: '知识层与规则层边界回归测试', file: 'src/tests/flow-boundaries.test.ts' },
  { name: '知识层 registry 回归测试', file: 'src/tests/knowledge-registry.test.ts' },
  { name: '咨询命中与推荐转化追踪回归测试', file: 'src/tests/consultation-tracking.test.ts' },
  { name: '咨询回复回归测试', file: 'src/tests/consultation-handler.test.ts' },
  { name: '推荐方案接续报价回归测试', file: 'src/tests/recommendation-confirmation.test.ts' },
  { name: '推荐方案 patch 回归测试', file: 'src/tests/recommended-patch.test.ts' },
  { name: '首页推荐方案可视化回归测试', file: 'src/tests/home-demo-visualization.test.ts' },
  { name: '咨询到推荐到报价正式回归测试', file: 'src/tests/consultation-recommendation-quote-regression.test.ts' },
  { name: '推荐方案正式链路回归测试', file: 'src/tests/recommendation-flow-regression.test.ts' },
  { name: 'Chat API 推荐方案接续报价回归测试', file: 'src/tests/chat-api-recommendation-flow.test.ts' },
  { name: 'Chat API 上下文隔离与短路回归测试', file: 'src/tests/chat-api-context-isolation.test.ts' },
  { name: '轻量 Agent Router 与 RAG 回归测试', file: 'src/tests/agent-routing-rag.test.ts' },
  { name: 'Router / RAG 命中日志回归测试', file: 'src/tests/router-rag-logging.test.ts' },
  { name: 'Chat API 轻量 RAG 分流回归测试', file: 'src/tests/chat-api-rag-routing.test.ts' },
  { name: 'Reflection issueType 中文映射回归测试', file: 'src/tests/reflection-issue-type-labels.test.ts' },
  { name: '会话详情与 Reflection 管理链路回归测试', file: 'src/tests/conversation-reflection-management.test.ts' },
]

console.log('\n')
console.log('╔════════════════════════════════════════════╗')
console.log('║        MVP 回归测试套件                      ║')
console.log('╚════════════════════════════════════════════╝')
console.log('\n')

for (const module of testModules) {
  console.log(`📋 运行: ${module.name}...`)
  console.log('─'.repeat(50))

  try {
    const output = execSync(`tsx ${module.file}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    console.log(output)
    results.push({ name: module.name, success: true, output })
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message: string }
    const message = error.stdout || error.stderr || error.message
    console.error(message)
    results.push({ name: module.name, success: false, output: message })
  }
}

console.log('\n')
console.log('╔════════════════════════════════════════════╗')
console.log('║         测试总结                           ║')
console.log('╚════════════════════════════════════════════╝')
console.log('\n')

const passed = results.filter((r) => r.success).length
const total = results.length

for (const result of results) {
  const status = result.success ? '✓' : '✗'
  console.log(`${status} ${result.name}`)
}

console.log('\n')
console.log(`总计: ${passed}/${total} 个模块通过`)

if (passed < total) {
  console.log('\n❌ 存在失败的测试模块')
  process.exit(1)
} else {
  console.log('\n✅ 所有测试通过！')
}
