import {
  createAdminSessionToken,
  hasValidAdminAccess,
  isProtectedAdminApiPath,
  isProtectedAdminPagePath,
} from '@/lib/adminAccess'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []
const testRuns: Array<Promise<void>> = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  const run = Promise.resolve()
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

  testRuns.push(run)
}

console.log('\n=== 后台访问控制回归测试 ===\n')

test('应识别受保护的后台页面路径', () => {
  assert(isProtectedAdminPagePath('/dashboard'), 'dashboard 应受保护')
  assert(isProtectedAdminPagePath('/conversations/1'), 'conversations 详情应受保护')
  assert(!isProtectedAdminPagePath('/'), '首页不应受保护')
})

test('应识别受保护的管理 API 路径', () => {
  assert(isProtectedAdminApiPath('/api/dashboard'), 'dashboard API 应受保护')
  assert(isProtectedAdminApiPath('/api/quotes/1/export'), 'quote export API 应受保护')
  assert(isProtectedAdminApiPath('/api/reflections/stats'), 'reflection stats API 应受保护')
  assert(!isProtectedAdminApiPath('/api/chat'), 'chat API 不应受保护')
})

test('session token 和 header secret 都可以建立授权', async () => {
  const secret = 'demo-admin-secret'
  const token = await createAdminSessionToken(secret)

  assert(await hasValidAdminAccess({ sessionToken: token, adminSecret: secret }), '有效 session token 应通过校验')
  assert(await hasValidAdminAccess({ headerSecret: secret, adminSecret: secret }), '有效 header secret 应通过校验')
  assert(!(await hasValidAdminAccess({ sessionToken: 'wrong-token', adminSecret: secret })), '错误 token 不应通过校验')
})

async function main() {
  await Promise.all(testRuns)

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((item) => item.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})