import { cookies } from 'next/headers'
import { ADMIN_ACTOR_COOKIE_NAME, parseAdminActorSessionValue } from '@/lib/adminActorSession'
import { formatGovernanceActorLabel } from '@/lib/actorIdentity'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_SECRET_HEADER_NAME,
  buildAdminRedirectTarget,
  getAdminAccessPageErrorMessage,
  getAdminAccessPageInfoMessage,
  getAdminSecretFromEnv,
  hasValidAdminAccess,
  isProductionEnvironment,
} from '@/lib/adminAccess'

export const dynamic = 'force-dynamic'

type AdminAccessPageProps = {
  searchParams?: {
    next?: string
    error?: string
    message?: string
  }
}

export default async function AdminAccessPage({ searchParams }: AdminAccessPageProps) {
  const adminSecret = getAdminSecretFromEnv()
  const nextPath = buildAdminRedirectTarget(searchParams?.next)
  const cookieStore = cookies()
  const sessionToken = cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value
  const actorCookieValue = cookieStore.get(ADMIN_ACTOR_COOKIE_NAME)?.value
  const currentActor = parseAdminActorSessionValue(actorCookieValue)
  const sessionActive = adminSecret
    ? await hasValidAdminAccess({ sessionToken, adminSecret })
    : false
  const errorMessage = getAdminAccessPageErrorMessage({
    error: searchParams?.error,
    message: searchParams?.message,
    sessionActive,
  })
  const infoMessage = getAdminAccessPageInfoMessage({
    error: searchParams?.error,
    message: searchParams?.message,
    sessionActive,
  })
  const protectionEnabled = Boolean(adminSecret)
  const hasAccessCookie = Boolean(sessionToken)
  const hasActorCookie = Boolean(actorCookieValue)
  const activeActor = sessionActive ? currentActor : null
  const actorStatusText = activeActor
    ? formatGovernanceActorLabel(activeActor)
    : hasActorCookie
      ? '已写入，但当前未与有效后台会话绑定'
      : '未记录'
  const sessionStatusText = sessionActive
    ? '已授权'
    : hasAccessCookie
      ? '检测到 Cookie，但未通过校验'
      : '未授权'
  const quickLinks = [
    { href: nextPath, label: nextPath === '/dashboard' ? '进入 Dashboard' : `继续前往 ${nextPath}` },
    { href: '/dashboard', label: '打开 Dashboard' },
    { href: '/conversations', label: '打开 Conversations' },
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index)

  return (
    <main className='mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12'>
      <div className='rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
        <p className='text-sm font-medium text-slate-500'>Admin Access</p>
        <h1 className='mt-2 text-3xl font-semibold text-slate-900'>后台访问入口</h1>
        <p className='mt-3 text-sm leading-6 text-slate-600'>
          当前页面用于保护内部后台页面和管理 API。公开链路如首页和 <code>/api/chat</code> 不受影响。
        </p>

        {errorMessage && (
          <div className='mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className='mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
            {infoMessage}
          </div>
        )}

        {sessionActive && (
          <div className='mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4'>
            <p className='text-sm font-semibold text-emerald-900'>已登录后台</p>
            <p className='mt-2 text-sm leading-6 text-emerald-800'>
              当前授权会话已被服务器识别，页面提示、状态栏和后台 cookie 会按同一份 session 状态展示。
            </p>
            <div className='mt-4 flex flex-wrap gap-3'>
              {quickLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className='rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white'
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {!protectionEnabled && !isProductionEnvironment() && (
          <div className='mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800'>
            当前是开发环境，且没有配置 <code>ADMIN_SECRET</code>，所以后台保护默认关闭，方便本地调试。若要验证未授权/已授权流程，请先在 <code>.env</code> 中补上 <code>ADMIN_SECRET</code>。
          </div>
        )}

        {!protectionEnabled && isProductionEnvironment() && (
          <div className='mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
            生产环境必须配置 <code>ADMIN_SECRET</code>，否则后台和管理 API 会被拒绝访问。
          </div>
        )}

        <div className='mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]'>
          <section className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <h2 className='text-sm font-semibold text-slate-900'>{sessionActive ? '更新后台访问会话' : '建立后台访问会话'}</h2>
            <form action='/api/admin/session' method='post' className='mt-4 space-y-4'>
              <input type='hidden' name='next' value={nextPath} />
              <label className='block text-sm text-slate-700'>
                <span className='mb-2 block font-medium'>操作者姓名</span>
                <input
                  type='text'
                  name='actorName'
                  defaultValue={currentActor?.actorSource === 'admin-session' ? currentActor.actorName : ''}
                  className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400'
                  placeholder='建议填写真实姓名或工号名称'
                  autoComplete='name'
                  disabled={!protectionEnabled}
                />
              </label>
              <label className='block text-sm text-slate-700'>
                <span className='mb-2 block font-medium'>操作者邮箱</span>
                <input
                  type='email'
                  name='actorEmail'
                  defaultValue={currentActor?.actorEmail || ''}
                  className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400'
                  placeholder='可选，用于更清晰的留痕'
                  autoComplete='email'
                  disabled={!protectionEnabled}
                />
              </label>
              <label className='block text-sm text-slate-700'>
                <span className='mb-2 block font-medium'>ADMIN_SECRET</span>
                <input
                  type='password'
                  name='secret'
                  className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400'
                  placeholder='输入后台访问密钥'
                  autoComplete='off'
                  disabled={!protectionEnabled}
                />
              </label>
              <p className='text-xs leading-5 text-slate-500'>
                建议填写真实操作者信息。未填写时，治理动作会回退记录为“后台管理员”，以兼容旧会话和脚本调用。
              </p>
              <button
                type='submit'
                disabled={!protectionEnabled}
                className='rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                {sessionActive ? '更新授权并进入后台' : '进入后台'}
              </button>
            </form>

            <form action='/api/admin/session' method='post' className='mt-4'>
              <input type='hidden' name='_action' value='logout' />
              <button
                type='submit'
                className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700'
              >
                清除后台会话
              </button>
            </form>
          </section>

          <aside className='rounded-2xl border border-slate-200 p-5'>
            <h2 className='text-sm font-semibold text-slate-900'>当前状态</h2>
            <dl className='mt-4 space-y-3 text-sm text-slate-600'>
              <div>
                <dt className='font-medium text-slate-900'>保护状态</dt>
                <dd>{protectionEnabled ? '已启用' : '未启用'}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>后台会话</dt>
                <dd>{sessionStatusText}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>当前操作者</dt>
                <dd>{actorStatusText}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>授权 Cookie</dt>
                <dd>{hasAccessCookie ? '已写入' : '未写入'}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>操作者 Cookie</dt>
                <dd>{hasActorCookie ? '已写入' : '未写入'}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>授权后默认跳转</dt>
                <dd>{nextPath}</dd>
              </div>
              <div>
                <dt className='font-medium text-slate-900'>脚本 Header</dt>
                <dd>
                  <code>{ADMIN_SECRET_HEADER_NAME}</code>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  )
}