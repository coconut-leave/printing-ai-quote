import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const requiredEnvNames = ['DATABASE_URL', 'OPENAI_API_KEY', 'ADMIN_SECRET'] as const

const missingEnvNames = requiredEnvNames.filter((name) => {
  const value = process.env[name]
  return typeof value !== 'string' || value.trim().length === 0
})

if (missingEnvNames.length > 0) {
  console.error('Launch env check failed.')
  console.error(`Missing required deploy env vars: ${missingEnvNames.join(', ')}`)
  console.error('For deploy rehearsal and production, DATABASE_URL, OPENAI_API_KEY, and ADMIN_SECRET must all be non-empty.')
  process.exit(1)
}

console.log('Launch env check passed.')

if (!process.env.PORT || process.env.PORT.trim().length === 0) {
  console.log('PORT is not set; next start will use the default port 3000.')
}

if (process.env.ALLOW_SEED === 'true') {
  console.warn('ALLOW_SEED is enabled. Keep it empty for normal deploys.')
}