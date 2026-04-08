import dotenv from 'dotenv'
import { getTrialEnvGovernanceSummary } from '@/server/config/env'

dotenv.config({ path: './.env' })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ name, passed: false, error: message })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${message}`)
    })
}

console.log('\n=== 试运行环境治理回归测试 ===\n')

async function main() {
  const healthRouteModule = await import('@/app/api/health/route')
  const healthGet = healthRouteModule.GET as () => Promise<Response>

  await test('deploy 级治理检查应拦截占位 key、弱口令和 seed 开关', () => {
    const previousEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      ALLOW_SEED: process.env.ALLOW_SEED,
    }

    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/printing_ai_quote'
    process.env.OPENAI_API_KEY = 'sk-...'
    process.env.ADMIN_SECRET = 'change-this-admin-secret'
    process.env.ALLOW_SEED = 'true'

    try {
      const summary = getTrialEnvGovernanceSummary({ enforceForDeploy: true })
      assert(summary.status === 'blocked', 'deploy 级检查应返回 blocked')
      assert(summary.blockingIssues.some((item) => item.includes('OPENAI_API_KEY')), '应提示 OpenAI key 仍是占位值')
      assert(summary.blockingIssues.some((item) => item.includes('ADMIN_SECRET')), '应提示 ADMIN_SECRET 过弱')
      assert(summary.blockingIssues.some((item) => item.includes('ALLOW_SEED')), '应提示 ALLOW_SEED 不能开启')
    } finally {
      process.env.DATABASE_URL = previousEnv.DATABASE_URL
      process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY
      process.env.ADMIN_SECRET = previousEnv.ADMIN_SECRET
      process.env.ALLOW_SEED = previousEnv.ALLOW_SEED
    }
  })

  await test('health endpoint 在生产治理阻塞时应返回 not_ready', async () => {
    const previousEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      ALLOW_SEED: process.env.ALLOW_SEED,
    }

    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/printing_ai_quote'
    process.env.OPENAI_API_KEY = 'sk-live-valid-key'
    process.env.ADMIN_SECRET = 'weak-secret'
    process.env.ALLOW_SEED = ''

    try {
      const response = await healthGet()
      const payload = await response.json()
      assert(response.status === 503, '治理阻塞时 health 应返回 503')
      assert(payload.data.status === 'not_ready', '治理阻塞时 health 应标记为 not_ready')
      assert(payload.data.checks.trialGovernance.status === 'blocked', 'health 应暴露治理阻塞状态')
    } finally {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = previousEnv.NODE_ENV
      process.env.DATABASE_URL = previousEnv.DATABASE_URL
      process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY
      process.env.ADMIN_SECRET = previousEnv.ADMIN_SECRET
      process.env.ALLOW_SEED = previousEnv.ALLOW_SEED
    }
  })

  await test('强密钥且关闭 seed 时治理检查应通过', () => {
    const previousEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      ALLOW_SEED: process.env.ALLOW_SEED,
    }

    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/printing_ai_quote'
    process.env.OPENAI_API_KEY = 'sk-live-valid-key'
    process.env.ADMIN_SECRET = 'trial-admin-secret-2026'
    process.env.ALLOW_SEED = ''

    try {
      const summary = getTrialEnvGovernanceSummary({ enforceForDeploy: true })
      assert(summary.status === 'ready', '完整配置下治理检查应通过')
      assert(summary.blockingIssues.length === 0, '通过场景不应保留阻塞项')
    } finally {
      process.env.DATABASE_URL = previousEnv.DATABASE_URL
      process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY
      process.env.ADMIN_SECRET = previousEnv.ADMIN_SECRET
      process.env.ALLOW_SEED = previousEnv.ALLOW_SEED
    }
  })

  const passed = results.filter((item) => item.passed).length
  console.log(`\n总计: ${passed}/${results.length} 通过`)

  if (passed !== results.length) {
    process.exit(1)
  }
}

void main()