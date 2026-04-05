export type GovernanceActorSource =
  | 'admin-session'
  | 'admin-session-fallback'
  | 'actor-header'
  | 'legacy-placeholder'
  | 'legacy-string'
  | string

export type GovernanceActor = {
  actorId: string
  actorName: string
  actorEmail?: string
  actorSource: GovernanceActorSource
}

export type GovernanceActorAnalyticsIdentity = {
  actorId: string
  actorName: string
  actorSource: GovernanceActorSource
  actorLabel: string
  isFallbackActor: boolean
}

export const DEFAULT_GOVERNANCE_ACTOR_NAME = '后台管理员'

const FALLBACK_GOVERNANCE_SOURCES = new Set<GovernanceActorSource>([
  'admin-session-fallback',
  'legacy-placeholder',
])

function normalizeActorValue(value?: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function normalizeActorId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'admin-session'
}

function resolveActorLabel(actor?: GovernanceActor | null, legacyValue?: string | null): string | undefined {
  const actorName = normalizeActorValue(actor?.actorName)
  const actorEmail = normalizeActorValue(actor?.actorEmail)

  if (actorName && actorEmail && actorName !== actorEmail) {
    return `${actorName} (${actorEmail})`
  }

  return actorName || actorEmail || normalizeActorValue(actor?.actorId) || normalizeActorValue(legacyValue)
}

export function buildGovernanceActor(params: {
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  actorSource?: GovernanceActorSource
}): GovernanceActor {
  const actorEmail = normalizeActorValue(params.actorEmail)
  const actorName = normalizeActorValue(params.actorName) || actorEmail || DEFAULT_GOVERNANCE_ACTOR_NAME
  const actorId = normalizeActorValue(params.actorId)
    || (actorEmail ? `email:${normalizeActorId(actorEmail)}` : `name:${normalizeActorId(actorName)}`)

  return {
    actorId,
    actorName,
    actorEmail,
    actorSource: params.actorSource || 'admin-session',
  }
}

export function buildFallbackGovernanceActor(): GovernanceActor {
  return buildGovernanceActor({
    actorId: 'admin-session',
    actorName: DEFAULT_GOVERNANCE_ACTOR_NAME,
    actorSource: 'admin-session-fallback',
  })
}

export function buildLegacyGovernanceActor(label: string): GovernanceActor {
  const normalizedLabel = normalizeActorValue(label) || 'governance-dashboard'

  return buildGovernanceActor({
    actorId: `legacy:${normalizeActorId(normalizedLabel)}`,
    actorName: normalizedLabel,
    actorSource: normalizedLabel === 'governance-dashboard' ? 'legacy-placeholder' : 'legacy-string',
  })
}

export function getGovernanceActorAuditLabel(actor?: GovernanceActor | null, legacyValue?: string | null): string {
  return resolveActorLabel(actor, legacyValue) || DEFAULT_GOVERNANCE_ACTOR_NAME
}

export function formatGovernanceActorLabel(actor?: GovernanceActor | null, legacyValue?: string | null): string {
  return resolveActorLabel(actor, legacyValue) || '暂无'
}

export function isFallbackGovernanceActor(actor?: GovernanceActor | null, legacyValue?: string | null): boolean {
  if (actor) {
    return FALLBACK_GOVERNANCE_SOURCES.has(actor.actorSource)
  }

  const normalizedLegacyValue = normalizeActorValue(legacyValue)
  if (!normalizedLegacyValue) {
    return true
  }

  return normalizedLegacyValue === 'governance-dashboard'
}

export function toGovernanceActorAnalyticsIdentity(
  actor?: GovernanceActor | null,
  legacyValue?: string | null,
): GovernanceActorAnalyticsIdentity {
  const resolvedActor = actor || buildLegacyGovernanceActor(legacyValue || 'governance-dashboard')

  return {
    actorId: resolvedActor.actorId,
    actorName: resolvedActor.actorName,
    actorSource: resolvedActor.actorSource,
    actorLabel: getGovernanceActorAuditLabel(resolvedActor, legacyValue),
    isFallbackActor: isFallbackGovernanceActor(resolvedActor, legacyValue),
  }
}

export function toGovernanceActor(identity: GovernanceActorAnalyticsIdentity): GovernanceActor {
  return buildGovernanceActor({
    actorId: identity.actorId,
    actorName: identity.actorName,
    actorSource: identity.actorSource,
  })
}