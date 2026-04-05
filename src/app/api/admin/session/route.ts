import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_ACTOR_COOKIE_NAME,
  createAdminActorSessionValue,
  getAdminActorCookieOptions,
} from '@/lib/adminActorSession'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  buildAdminRedirectTarget,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  getAdminSecretFromEnv,
  getMissingAdminSecretMessage,
  isProductionEnvironment,
} from '@/lib/adminAccess'

export const dynamic = 'force-dynamic'

function redirectToAdminAccess(request: NextRequest, params: { error?: string; message?: string; next?: string }) {
  const url = new URL('/admin-access', request.url)
  if (params.error) {
    url.searchParams.set('error', params.error)
  }
  if (params.message) {
    url.searchParams.set('message', params.message)
  }
  if (params.next) {
    url.searchParams.set('next', buildAdminRedirectTarget(params.next))
  }
  return NextResponse.redirect(url)
}

async function parseRequest(request: NextRequest): Promise<{
  action: 'login' | 'logout'
  secret?: string
  actorName?: string
  actorEmail?: string
  next?: string
  expectsJson: boolean
}> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({})) as Record<string, any>
    return {
      action: body._action === 'logout' ? 'logout' : 'login',
      secret: typeof body.secret === 'string' ? body.secret : undefined,
      actorName: typeof body.actorName === 'string' ? body.actorName : undefined,
      actorEmail: typeof body.actorEmail === 'string' ? body.actorEmail : undefined,
      next: typeof body.next === 'string' ? body.next : undefined,
      expectsJson: true,
    }
  }

  const formData = await request.formData()
  return {
    action: formData.get('_action') === 'logout' ? 'logout' : 'login',
    secret: typeof formData.get('secret') === 'string' ? String(formData.get('secret')) : undefined,
    actorName: typeof formData.get('actorName') === 'string' ? String(formData.get('actorName')) : undefined,
    actorEmail: typeof formData.get('actorEmail') === 'string' ? String(formData.get('actorEmail')) : undefined,
    next: typeof formData.get('next') === 'string' ? String(formData.get('next')) : undefined,
    expectsJson: false,
  }
}

export async function POST(request: NextRequest) {
  const { action, secret, actorName, actorEmail, next, expectsJson } = await parseRequest(request)

  if (action === 'logout') {
    const response = expectsJson
      ? NextResponse.json({ ok: true, message: '后台访问会话已清除。' })
      : redirectToAdminAccess(request, { message: 'logged_out' })
    response.cookies.delete(ADMIN_ACCESS_COOKIE_NAME)
    response.cookies.delete(ADMIN_ACTOR_COOKIE_NAME)
    return response
  }

  const adminSecret = getAdminSecretFromEnv()

  if (!adminSecret) {
    const errorMessage = getMissingAdminSecretMessage()
    if (expectsJson) {
      return NextResponse.json(
        { ok: false, error: errorMessage },
        { status: isProductionEnvironment() ? 503 : 400 }
      )
    }

    return redirectToAdminAccess(request, {
      error: 'missing_secret',
      next,
    })
  }

  if (!secret || secret !== adminSecret) {
    if (expectsJson) {
      return NextResponse.json({ ok: false, error: 'ADMIN_SECRET 不正确。' }, { status: 401 })
    }

    return redirectToAdminAccess(request, {
      error: 'invalid_secret',
      next,
    })
  }

  const response = expectsJson
    ? NextResponse.json({ ok: true, redirectTo: buildAdminRedirectTarget(next) })
    : NextResponse.redirect(new URL(buildAdminRedirectTarget(next), request.url))

  response.cookies.set(
    ADMIN_ACCESS_COOKIE_NAME,
    await createAdminSessionToken(adminSecret),
    getAdminSessionCookieOptions()
  )
  response.cookies.set(
    ADMIN_ACTOR_COOKIE_NAME,
    createAdminActorSessionValue({ actorName, actorEmail }),
    getAdminActorCookieOptions()
  )

  return response
}