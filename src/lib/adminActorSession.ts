import {
  buildFallbackGovernanceActor,
  buildGovernanceActor,
  buildLegacyGovernanceActor,
  type GovernanceActor,
} from '@/lib/actorIdentity'
import { getAdminSessionCookieOptions } from '@/lib/adminAccess'

export const ADMIN_ACTOR_COOKIE_NAME = 'printing_ai_quote_admin_actor'
export const GOVERNANCE_ACTOR_ID_HEADER_NAME = 'x-governance-actor-id'
export const GOVERNANCE_ACTOR_NAME_HEADER_NAME = 'x-governance-actor-name'
export const GOVERNANCE_ACTOR_EMAIL_HEADER_NAME = 'x-governance-actor-email'

type HeaderCarrier = Headers | Pick<Headers, 'get'> | null | undefined

function normalizeHeaderValue(value?: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function encodeHeaderValue(value?: string | null): string | undefined {
  const normalized = normalizeHeaderValue(value)
  return normalized ? encodeURIComponent(normalized) : undefined
}

function decodeHeaderValue(value?: string | null): string | undefined {
  const normalized = normalizeHeaderValue(value)
  if (!normalized) {
    return undefined
  }

  try {
    return normalizeHeaderValue(decodeURIComponent(normalized)) || normalized
  } catch {
    return normalized
  }
}

function getHeaderValue(headers: HeaderCarrier, name: string): string | undefined {
  if (!headers || typeof headers.get !== 'function') {
    return undefined
  }

  return decodeHeaderValue(headers.get(name))
}

function hasActorIdentity(params: { actorName?: string | null; actorEmail?: string | null }): boolean {
  return Boolean(params.actorName?.trim() || params.actorEmail?.trim())
}

export function buildAdminSessionActor(params: {
  actorName?: string | null
  actorEmail?: string | null
}): GovernanceActor {
  if (!hasActorIdentity(params)) {
    return buildFallbackGovernanceActor()
  }

  return buildGovernanceActor({
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actorSource: 'admin-session',
  })
}

export function createAdminActorSessionValue(params: {
  actorName?: string | null
  actorEmail?: string | null
}): string {
  return Buffer.from(JSON.stringify(buildAdminSessionActor(params)), 'utf8').toString('base64url')
}

export function parseAdminActorSessionValue(value?: string | null): GovernanceActor | null {
  if (!value) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<GovernanceActor>

    if (typeof payload.actorName !== 'string' || typeof payload.actorSource !== 'string') {
      return null
    }

    return buildGovernanceActor({
      actorId: typeof payload.actorId === 'string' ? payload.actorId : undefined,
      actorName: payload.actorName,
      actorEmail: typeof payload.actorEmail === 'string' ? payload.actorEmail : undefined,
      actorSource: payload.actorSource,
    })
  } catch {
    return null
  }
}

export function parseGovernanceActorHeaders(headers?: HeaderCarrier): GovernanceActor | null {
  const actorId = getHeaderValue(headers, GOVERNANCE_ACTOR_ID_HEADER_NAME)
  const actorName = getHeaderValue(headers, GOVERNANCE_ACTOR_NAME_HEADER_NAME)
  const actorEmail = getHeaderValue(headers, GOVERNANCE_ACTOR_EMAIL_HEADER_NAME)

  if (!actorId && !actorName && !actorEmail) {
    return null
  }

  return buildGovernanceActor({
    actorId,
    actorName,
    actorEmail,
    actorSource: 'actor-header',
  })
}

export function buildGovernanceActorHeaders(params: {
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
}): Record<string, string> {
  const actor = buildGovernanceActor({
    actorId: params.actorId,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actorSource: 'actor-header',
  })

  return {
    [GOVERNANCE_ACTOR_ID_HEADER_NAME]: encodeHeaderValue(actor.actorId) || actor.actorId,
    [GOVERNANCE_ACTOR_NAME_HEADER_NAME]: encodeHeaderValue(actor.actorName) || actor.actorName,
    ...(actor.actorEmail ? {
      [GOVERNANCE_ACTOR_EMAIL_HEADER_NAME]: encodeHeaderValue(actor.actorEmail) || actor.actorEmail,
    } : {}),
  }
}

export function resolveAdminSessionActor(params: {
  actorCookieValue?: string | null
  legacyActorName?: string | null
}): GovernanceActor {
  const actorFromCookie = parseAdminActorSessionValue(params.actorCookieValue)
  if (actorFromCookie) {
    return actorFromCookie
  }

  if (params.legacyActorName?.trim()) {
    return buildLegacyGovernanceActor(params.legacyActorName)
  }

  return buildFallbackGovernanceActor()
}

export function resolveGovernanceActor(params: {
  accessSessionToken?: string | null
  actorCookieValue?: string | null
  headers?: HeaderCarrier
  legacyActorName?: string | null
}): GovernanceActor {
  if (params.accessSessionToken?.trim()) {
    return parseAdminActorSessionValue(params.actorCookieValue) || buildFallbackGovernanceActor()
  }

  const headerActor = parseGovernanceActorHeaders(params.headers)
  if (headerActor) {
    return headerActor
  }

  if (params.legacyActorName?.trim()) {
    return buildLegacyGovernanceActor(params.legacyActorName)
  }

  return buildLegacyGovernanceActor('governance-dashboard')
}

export function getAdminActorCookieOptions(params?: {
  secure?: boolean
}) {
  return getAdminSessionCookieOptions(params)
}