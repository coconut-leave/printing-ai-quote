import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_SECRET_HEADER_NAME,
  buildAdminRedirectTarget,
  getAdminSecretFromEnv,
  getMissingAdminSecretMessage,
  getUnauthorizedAdminMessage,
  hasValidAdminAccess,
  isProductionEnvironment,
  isProtectedAdminApiPath,
} from './lib/adminAccess'

function createAdminLoginUrl(request: NextRequest, errorCode: string) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
  const loginUrl = new URL('/admin-access', request.url)
  loginUrl.searchParams.set('next', buildAdminRedirectTarget(nextPath))
  loginUrl.searchParams.set('error', errorCode)
  return loginUrl
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const adminSecret = getAdminSecretFromEnv()

  if (!adminSecret) {
    if (isProductionEnvironment()) {
      if (isProtectedAdminApiPath(pathname)) {
        return NextResponse.json(
          { ok: false, error: getMissingAdminSecretMessage() },
          { status: 503 }
        )
      }

      return NextResponse.redirect(createAdminLoginUrl(request, 'missing_secret'))
    }

    const response = NextResponse.next()
    response.headers.set('x-admin-protection', 'disabled')
    return response
  }

  const sessionToken = request.cookies.get(ADMIN_ACCESS_COOKIE_NAME)?.value
  const headerSecret = request.headers.get(ADMIN_SECRET_HEADER_NAME)
  const isAuthorized = await hasValidAdminAccess({
    sessionToken,
    headerSecret,
    adminSecret,
  })

  if (isAuthorized) {
    return NextResponse.next()
  }

  if (isProtectedAdminApiPath(pathname)) {
    return NextResponse.json(
      { ok: false, error: getUnauthorizedAdminMessage() },
      { status: 401 }
    )
  }

  return NextResponse.redirect(createAdminLoginUrl(request, 'unauthorized'))
}

export const config = {
  matcher: [
    '/conversations/:path*',
    '/dashboard/:path*',
    '/learning-dashboard/:path*',
    '/reflections/:path*',
    '/improvements/:path*',
    '/actions/:path*',
    '/consultation-tracking/:path*',
    '/api/conversations/:path*',
    '/api/dashboard/:path*',
    '/api/learning-dashboard/:path*',
    '/api/quotes/:path*',
    '/api/reflections/:path*',
    '/api/improvements/:path*',
    '/api/consultation-tracking/:path*',
  ],
}