import { z } from 'zod'

const nonEmptyString = z.string().min(1)
const SUPPORTED_ENV_NAMES = ['DATABASE_URL', 'OPENAI_API_KEY', 'ADMIN_SECRET', 'PORT', 'ALLOW_SEED'] as const

type SupportedEnvName = (typeof SUPPORTED_ENV_NAMES)[number]

function formatMissingEnvError(name: string): string {
  return `Missing required environment variable: ${name}. Please configure ${name} in the project root .env file.`
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
