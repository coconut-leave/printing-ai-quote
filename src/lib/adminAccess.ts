export const ADMIN_ACCESS_COOKIE_NAME = 'printing_ai_quote_admin_access'
export const ADMIN_SECRET_HEADER_NAME = 'x-admin-secret'

export const PROTECTED_ADMIN_PAGE_PREFIXES = [
  '/conversations',
  '/dashboard',
  '/learning-dashboard',
  '/reflections',
  '/improvements',
  '/actions',
  '/consultation-tracking',
]

export const PROTECTED_ADMIN_API_PREFIXES = [
  '/api/conversations',
  '/api/dashboard',
  '/api/learning-dashboard',
  '/api/quotes',
  '/api/reflections',
  '/api/improvements',
  '/api/consultation-tracking',
]

const DEFAULT_ADMIN_REDIRECT_PATH = '/dashboard'

export function getAdminSecretFromEnv(): string | null {
  const secret = process.env.ADMIN_SECRET?.trim()
  return secret ? secret : null
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isAdminProtectionEnabled(): boolean {
  return Boolean(getAdminSecretFromEnv())
}

export function isProtectedAdminPagePath(pathname: string): boolean {
  return PROTECTED_ADMIN_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isProtectedAdminApiPath(pathname: string): boolean {
  return PROTECTED_ADMIN_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function buildAdminRedirectTarget(nextPath?: string | null): string {
  if (!nextPath || !nextPath.startsWith('/')) {
    return DEFAULT_ADMIN_REDIRECT_PATH
  }

  if (nextPath.startsWith('/admin-access')) {
    return DEFAULT_ADMIN_REDIRECT_PATH
  }

  return nextPath
}

export function getMissingAdminSecretMessage(): string {
  return 'ADMIN_SECRET 未配置。生产环境下后台页面和管理 API 将保持关闭，需先配置 ADMIN_SECRET。'
}

export function getUnauthorizedAdminMessage(): string {
  return '后台访问需要授权。请先通过 /admin-access 建立后台访问会话，或在脚本请求中传入 x-admin-secret。'
}

export async function createAdminSessionToken(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export async function hasValidAdminAccess(params: {
  sessionToken?: string | null
  headerSecret?: string | null
  adminSecret?: string | null
}): Promise<boolean> {
  const adminSecret = params.adminSecret?.trim()
  if (!adminSecret) {
    return false
  }

  if (params.headerSecret && params.headerSecret === adminSecret) {
    return true
  }

  if (!params.sessionToken) {
    return false
  }

  return params.sessionToken === await createAdminSessionToken(adminSecret)
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProductionEnvironment(),
    path: '/',
    maxAge: 60 * 60 * 8,
  }
}