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
