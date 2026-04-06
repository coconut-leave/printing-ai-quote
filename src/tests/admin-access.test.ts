import { NextRequest } from 'next/server'
import * as adminSessionRouteModule from '../app/api/admin/session/route'
import {
  ADMIN_ACTOR_COOKIE_NAME,
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
  ADMIN_ACCESS_COOKIE_NAME,
  getAdminAccessPageErrorMessage,
  getAdminAccessPageInfoMessage,
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
const tests: Array<{ name: string; fn: () => Promise<void> | void }> = []
const postAdminSession = (
  'POST' in adminSessionRouteModule
    ? adminSessionRouteModule.POST
    : (adminSessionRouteModule as { default?: { POST?: (request: NextRequest) => Promise<Response> } }).default?.POST
)

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn })
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

test('已授权 session 不应继续显示 unauthorized 顶部提示', () => {
  const errorMessage = getAdminAccessPageErrorMessage({
    error: 'unauthorized',
    sessionActive: true,
  })
  const infoMessage = getAdminAccessPageInfoMessage({
    error: 'unauthorized',
    sessionActive: true,
  })

  assert(errorMessage === null, 'session 已有效时应抑制 unauthorized 错误提示')
  assert(infoMessage?.includes('已登录后台'), 'session 已有效时应显示已登录后台提示')
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

test('后台登录成功后应返回 303，并同时写入授权与操作者 cookie', async () => {
  assert(typeof postAdminSession === 'function', '应能加载后台 session route 的 POST 处理器')
  const previousSecret = process.env.ADMIN_SECRET
  process.env.ADMIN_SECRET = 'route-test-secret'

  try {
    const formData = new FormData()
    formData.set('secret', 'route-test-secret')
    formData.set('actorName', '测试后台员')
    formData.set('actorEmail', 'admin@factory.test')
    formData.set('next', '/dashboard')

    const request = new NextRequest('http://localhost:3000/api/admin/session', {
      method: 'POST',
      body: formData,
    })

    const response = await postAdminSession(request)
    const cookieHeaders = Array.from(response.headers.entries())
      .filter(([name]) => name === 'set-cookie' || name === 'x-middleware-set-cookie')
      .map(([, value]) => value)

    assert(response.status === 303, '登录成功后的表单提交应使用 303 跳转')
    assert(response.headers.get('location') === 'http://localhost:3000/dashboard', '登录成功后应跳转到 dashboard')
    assert(cookieHeaders.some((value) => value.includes(ADMIN_ACCESS_COOKIE_NAME)), '响应中应写入后台授权 cookie')
    assert(cookieHeaders.some((value) => value.includes(ADMIN_ACTOR_COOKIE_NAME)), '响应中应写入后台操作者 cookie')
  } finally {
    if (previousSecret === undefined) {
      delete process.env.ADMIN_SECRET
    } else {
      process.env.ADMIN_SECRET = previousSecret
    }
  }
})

test('后台登录失败后应返回 303，并回到 admin-access 错误页', async () => {
  assert(typeof postAdminSession === 'function', '应能加载后台 session route 的 POST 处理器')
  const previousSecret = process.env.ADMIN_SECRET
  process.env.ADMIN_SECRET = 'route-test-secret'

  try {
    const formData = new FormData()
    formData.set('secret', 'wrong-secret')
    formData.set('next', '/dashboard')

    const request = new NextRequest('http://localhost:3000/api/admin/session', {
      method: 'POST',
      body: formData,
    })

    const response = await postAdminSession(request)
    const location = response.headers.get('location') || ''

    assert(response.status === 303, '登录失败后的表单提交也应使用 303 跳转')
    assert(location.includes('/admin-access'), '登录失败后应跳回 admin-access')
    assert(location.includes('error=invalid_secret'), '登录失败后应携带 invalid_secret 错误参数')
  } finally {
    if (previousSecret === undefined) {
      delete process.env.ADMIN_SECRET
    } else {
      process.env.ADMIN_SECRET = previousSecret
    }
  }
})

async function main() {
  for (const item of tests) {
    try {
      await item.fn()
      results.push({ name: item.name, passed: true })
      console.log(`✓ ${item.name}`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name: item.name, passed: false, error })
      console.error(`✗ ${item.name}`)
      console.error(`  └─ ${error}`)
    }
  }

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