import { createSuccessResponse, logError } from '@/server/api/response'
import { getLaunchEnvSummary, getTrialEnvGovernanceSummary } from '@/server/config/env'

export const dynamic = 'force-dynamic'

type DependencyStatus = 'ok' | 'missing_config' | 'error'

export async function GET() {
  const startedAt = Date.now()
  const envSummary = getLaunchEnvSummary()
  const isProduction = process.env.NODE_ENV === 'production'
  const trialGovernance = getTrialEnvGovernanceSummary({ enforceForDeploy: isProduction })

  let databaseStatus: DependencyStatus = envSummary.databaseUrlConfigured ? 'ok' : 'missing_config'

  if (envSummary.databaseUrlConfigured) {
    try {
      const { prisma } = await import('@/server/db/prisma')
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      databaseStatus = 'error'
      logError(error, 'health-check-database')
    }
  }

  const checks = {
    application: 'ok' as const,
    database: databaseStatus,
    env: {
      databaseUrlConfigured: envSummary.databaseUrlConfigured,
      openAIKeyConfigured: envSummary.openAIKeyConfigured,
      adminSecretConfigured: envSummary.adminSecretConfigured,
      adminSecretRequired: isProduction,
      allowSeedEnabled: envSummary.allowSeedEnabled,
    },
    trialGovernance,
  }

  const isReady = checks.database === 'ok'
    && checks.env.openAIKeyConfigured
    && (!checks.env.adminSecretRequired || checks.env.adminSecretConfigured)
    && checks.trialGovernance.status !== 'blocked'

  return createSuccessResponse(
    {
      service: 'printing-ai-quote',
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      checks,
    },
    undefined,
    isReady ? 200 : 503
  )
}