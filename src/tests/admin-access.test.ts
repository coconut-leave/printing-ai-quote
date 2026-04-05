import {
  buildGovernanceActorHeaders,
  createAdminActorSessionValue,
  GOVERNANCE_ACTOR_EMAIL_HEADER_NAME,
  GOVERNANCE_ACTOR_ID_HEADER_NAME,
  GOVERNANCE_ACTOR_NAME_HEADER_NAME,
  parseGovernanceActorHeaders,
  resolveGovernanceActor,
  parseAdminActorSessionValue,
  resolveAdminSessionActor,
} from '@/lib/adminActorSession'
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

test('后台操作者信息可随 session cookie 一起保存和解析', () => {
  const cookieValue = createAdminActorSessionValue({
    actorName: '测试审批人',
    actorEmail: 'reviewer@factory.test',
  })
  const actor = parseAdminActorSessionValue(cookieValue)

  assert(actor?.actorName === '测试审批人', '应保留操作者姓名')
  assert(actor?.actorEmail === 'reviewer@factory.test', '应保留操作者邮箱')
  assert(actor?.actorSource === 'admin-session', '显式填写信息时应标记为 admin-session')
})

test('缺失操作者信息时应回退到兼容 actor，并保留 legacy 占位来源', () => {
  const fallbackActor = resolveAdminSessionActor({})
  const legacyActor = resolveAdminSessionActor({ legacyActorName: 'governance-dashboard' })

  assert(fallbackActor.actorSource === 'admin-session-fallback', '无操作者元数据时应使用 fallback actor')
  assert(fallbackActor.actorName === '后台管理员', 'fallback actor 应使用保守默认名称')
  assert(legacyActor.actorSource === 'legacy-placeholder', '旧的 governance-dashboard 占位应继续被识别')
})

test('无 session 时可从治理 actor header 解析真实操作者', () => {
  const headers = new Headers(buildGovernanceActorHeaders({
    actorName: '脚本治理员',
    actorEmail: 'script@factory.test',
  }))
  const actor = parseGovernanceActorHeaders(headers)

  assert(headers.get(GOVERNANCE_ACTOR_NAME_HEADER_NAME) === encodeURIComponent('脚本治理员'), '应以 ASCII 安全格式写入 actor name header')
  assert(headers.get(GOVERNANCE_ACTOR_EMAIL_HEADER_NAME) === encodeURIComponent('script@factory.test'), '应以 ASCII 安全格式写入 actor email header')
  assert(Boolean(headers.get(GOVERNANCE_ACTOR_ID_HEADER_NAME)), '应自动生成 actor id header')
  assert(actor?.actorName === '脚本治理员', 'header actor 应保留姓名')
  assert(actor?.actorEmail === 'script@factory.test', 'header actor 应保留邮箱')
  assert(actor?.actorSource === 'actor-header', 'header actor 应标记为 actor-header')
})

test('治理 actor 解析优先级应为 session 高于 header，再高于 fallback', () => {
  const sessionCookieValue = createAdminActorSessionValue({
    actorName: '页面审批人',
    actorEmail: 'session@factory.test',
  })
  const headers = new Headers(buildGovernanceActorHeaders({
    actorName: '脚本治理员',
    actorEmail: 'script@factory.test',
  }))

  const sessionFirstActor = resolveGovernanceActor({
    accessSessionToken: 'active-session-token',
    actorCookieValue: sessionCookieValue,
    headers,
  })
  const headerActor = resolveGovernanceActor({
    headers,
  })
  const fallbackActor = resolveGovernanceActor({})

  assert(sessionFirstActor.actorName === '页面审批人', 'session 和 header 同时存在时应优先使用 session actor')
  assert(sessionFirstActor.actorSource === 'admin-session', 'session actor source 应保持 admin-session')
  assert(headerActor.actorName === '脚本治理员', '无 session 时应使用 header actor')
  assert(headerActor.actorSource === 'actor-header', '无 session 时 actor source 应为 actor-header')
  assert(fallbackActor.actorName === 'governance-dashboard', '两者都没有时应回退到治理占位符')
  assert(fallbackActor.actorSource === 'legacy-placeholder', '最终 fallback 应保持 legacy-placeholder 来源')
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