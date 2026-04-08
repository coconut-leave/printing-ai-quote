import { z } from 'zod'

const nonEmptyString = z.string().min(1)
const SUPPORTED_ENV_NAMES = ['DATABASE_URL', 'OPENAI_API_KEY', 'ADMIN_SECRET', 'PORT', 'ALLOW_SEED'] as const
const WEAK_ADMIN_SECRET_VALUES = new Set([
  'admin',
  '123456',
  '12345678',
  'password',
  'change-this-admin-secret',
  'test-secret',
])

type SupportedEnvName = (typeof SUPPORTED_ENV_NAMES)[number]
type GovernanceCheckStatus = 'ok' | 'warning' | 'error'

export type TrialEnvGovernanceSummary = {
  status: 'ready' | 'warning' | 'blocked'
  checks: {
    databaseUrlConfigured: boolean
    openAIKeyConfigured: boolean
    openAIKeyPlaceholder: boolean
    adminSecretConfigured: boolean
    adminSecretStrong: boolean
    adminSecretLength: number
    allowSeedEnabled: boolean
  }
  blockingIssues: string[]
  warnings: string[]
}

function formatMissingEnvError(name: string): string {
  return `Missing required environment variable: ${name}. Please configure ${name} in the project root .env file.`
}

function getTrimmedEnvValue(name: SupportedEnvName): string {
  return typeof process.env[name] === 'string' ? process.env[name]!.trim() : ''
}

function isPlaceholderOpenAIKey(value: string): boolean {
  if (!value) {
    return false
  }

  return value === 'sk-...'
    || value === 'your-openai-api-key'
    || value.toLowerCase().includes('replace-me')
}

function isStrongAdminSecret(value: string): boolean {
  if (!value || value.length < 12) {
    return false
  }

  if (WEAK_ADMIN_SECRET_VALUES.has(value.toLowerCase())) {
    return false
  }

  if (value.toLowerCase().includes('change-this')) {
    return false
  }

  return true
}

function getGovernanceSeverity(blockingIssues: string[], warnings: string[]): TrialEnvGovernanceSummary['status'] {
  if (blockingIssues.length > 0) {
    return 'blocked'
  }

  if (warnings.length > 0) {
    return 'warning'
  }

  return 'ready'
}

function parseEnvVar(name: 'DATABASE_URL' | 'OPENAI_API_KEY', value: string | undefined): string {
  const result = nonEmptyString.safeParse(value)
  if (!result.success) {
    throw new Error(formatMissingEnvError(name))
  }
  return result.data
}

export function requireDatabaseUrl(): string {
  return parseEnvVar('DATABASE_URL', process.env.DATABASE_URL)
}

export function requireOpenAIKey(): string {
  return parseEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY)
}

export function isEnvVarConfigured(name: SupportedEnvName): boolean {
  return typeof process.env[name] === 'string' && process.env[name]!.trim().length > 0
}

export function getLaunchEnvSummary() {
  return {
    databaseUrlConfigured: isEnvVarConfigured('DATABASE_URL'),
    openAIKeyConfigured: isEnvVarConfigured('OPENAI_API_KEY'),
    adminSecretConfigured: isEnvVarConfigured('ADMIN_SECRET'),
    portConfigured: isEnvVarConfigured('PORT'),
    allowSeedEnabled: process.env.ALLOW_SEED === 'true',
  }
}

export function getTrialEnvGovernanceSummary(options?: {
  enforceForDeploy?: boolean
}): TrialEnvGovernanceSummary {
  const databaseUrl = getTrimmedEnvValue('DATABASE_URL')
  const openAIKey = getTrimmedEnvValue('OPENAI_API_KEY')
  const adminSecret = getTrimmedEnvValue('ADMIN_SECRET')
  const allowSeedEnabled = process.env.ALLOW_SEED === 'true'
  const enforceForDeploy = Boolean(options?.enforceForDeploy)
  const blockingIssues: string[] = []
  const warnings: string[] = []

  const checks = {
    databaseUrlConfigured: databaseUrl.length > 0,
    openAIKeyConfigured: openAIKey.length > 0,
    openAIKeyPlaceholder: isPlaceholderOpenAIKey(openAIKey),
    adminSecretConfigured: adminSecret.length > 0,
    adminSecretStrong: isStrongAdminSecret(adminSecret),
    adminSecretLength: adminSecret.length,
    allowSeedEnabled,
  }

  const pushIssue = (status: GovernanceCheckStatus, message: string) => {
    if (status === 'error') {
      blockingIssues.push(message)
      return
    }

    warnings.push(message)
  }

  if (!checks.databaseUrlConfigured) {
    pushIssue('error', 'DATABASE_URL 未配置，当前环境不能进入试运行。')
  }

  if (!checks.openAIKeyConfigured) {
    pushIssue('error', 'OPENAI_API_KEY 未配置，当前环境不能进入试运行。')
  } else if (checks.openAIKeyPlaceholder) {
    pushIssue(enforceForDeploy ? 'error' : 'warning', 'OPENAI_API_KEY 仍是占位值，部署前必须替换为真实密钥。')
  }

  if (!checks.adminSecretConfigured) {
    pushIssue(enforceForDeploy ? 'error' : 'warning', 'ADMIN_SECRET 未配置，后台保护和管理 API 不能作为试运行基线。')
  } else if (!checks.adminSecretStrong) {
    pushIssue(enforceForDeploy ? 'error' : 'warning', 'ADMIN_SECRET 过弱或仍是默认占位值，试运行前必须更换为高强度密钥。')
  }

  if (checks.allowSeedEnabled) {
    pushIssue(enforceForDeploy ? 'error' : 'warning', 'ALLOW_SEED 仍为 true，试运行环境不应保留种子写入开关。')
  }

  return {
    status: getGovernanceSeverity(blockingIssues, warnings),
    checks,
    blockingIssues,
    warnings,
  }
}
