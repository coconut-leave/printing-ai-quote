import { execFileSync } from 'child_process'
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
  { name: '报价单 Excel 导出回归测试', file: 'src/tests/quote-excel-export.test.ts' },
  { name: '会话筛选与批量导出回归测试', file: 'src/tests/conversation-export-filters.test.ts' },
  { name: '后台交付状态一致性回归测试', file: 'src/tests/delivery-admin-status-consistency.test.ts' },
  { name: '试运行环境治理回归测试', file: 'src/tests/trial-env-governance.test.ts' },
  { name: '试运行复核队列回归测试', file: 'src/tests/trial-review-queue.test.ts' },
  { name: '试运行运行复盘回归测试', file: 'src/tests/pricing-trial-run-review.test.ts' },
  { name: '简单品类自动报价停用回归测试', file: 'src/tests/chat-api-simple-product-deactivation.test.ts' },
  { name: 'Chat API 上下文隔离与短路回归测试', file: 'src/tests/chat-api-context-isolation.test.ts' },
  { name: '轻量 Agent Router 与 RAG 回归测试', file: 'src/tests/agent-routing-rag.test.ts' },
  { name: 'Router / RAG 命中日志回归测试', file: 'src/tests/router-rag-logging.test.ts' },
  { name: 'Chat API 轻量 RAG 分流回归测试', file: 'src/tests/chat-api-rag-routing.test.ts' },
  { name: 'Chat API 咨询式包装问价回归测试', file: 'src/tests/chat-api-consultative-packaging-routing.test.ts' },
  { name: 'Chat API 复杂包装多轮回归测试', file: 'src/tests/chat-api-complex-packaging-context.test.ts' },
  { name: '复杂包装抽取与缺参回归测试', file: 'src/tests/complex-packaging-extraction.test.ts' },
  { name: '复杂包装报价引擎回归测试', file: 'src/tests/complex-packaging-pricing.test.ts' },
  { name: '复杂包装解释层回归测试', file: 'src/tests/packaging-review-summary.test.ts' },
  { name: '复杂包装 reflection 回归测试', file: 'src/tests/packaging-reflection.test.ts' },
  { name: '包装 correctedParams 模板回归测试', file: 'src/tests/packaging-corrected-params-template.test.tsx' },
  { name: '包装 AI vs correctedParams diff 回归测试', file: 'src/tests/packaging-reflection-diff.test.tsx' },
  { name: '包装编辑状态交互回归测试', file: 'src/tests/packaging-editor-interactions.test.ts' },
  { name: '开发期 sample file manifest 回归测试', file: 'src/tests/sample-files.test.ts' },
  { name: 'Reflection issueType 中文映射回归测试', file: 'src/tests/reflection-issue-type-labels.test.ts' },
  { name: '会话详情稳定性回归测试', file: 'src/tests/conversation-detail-stability.test.ts' },
  { name: '会话详情与 Reflection 管理链路回归测试', file: 'src/tests/conversation-reflection-management.test.ts' },
]

console.log('\n')
console.log('╔════════════════════════════════════════════╗')
console.log('║        MVP 回归测试套件                      ║')
console.log('╚════════════════════════════════════════════╝')
console.log('\n')

const tsxCliPath = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs')

for (const module of testModules) {
  console.log(`📋 运行: ${module.name}...`)
  console.log('─'.repeat(50))

  try {
    const output = execFileSync(process.execPath, [tsxCliPath, module.file], {
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
