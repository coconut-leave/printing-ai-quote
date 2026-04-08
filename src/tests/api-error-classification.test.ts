import { ErrorCode, safeErrorMessage, withErrorHandler } from '@/server/api/response'

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

async function main() {
  console.log('\n=== API 错误分类回归测试 ===\n')

  await test('Prisma Invalid invocation 应归类为 DATABASE_ERROR', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const response = await withErrorHandler(async () => {
        throw new Error('Invalid `prisma.conversation.create()` invocation: The table `Conversation` does not exist in the current database.')
      }, 'api-error-classification-test')

      const payload = await response.json()
      assert(response.status === 500, '数据库错误应返回 500')
      assert(payload.code === ErrorCode.DATABASE_ERROR, 'Prisma Invalid invocation 不应再误标为 VALIDATION_ERROR')
      assert(payload.error === '数据库暂时不可用，请检查 DATABASE_URL 与 Prisma 迁移状态。', '生产环境数据库错误提示应可直接定位迁移/连接问题')
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  await test('缺少环境变量应归类为 CONFIG_ERROR', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const response = await withErrorHandler(async () => {
        throw new Error('Missing required environment variable: OPENAI_API_KEY. Please configure OPENAI_API_KEY in the project root .env file.')
      }, 'api-error-classification-test')

      const payload = await response.json()
      assert(response.status === 500, '配置错误应返回 500')
      assert(payload.code === ErrorCode.CONFIG_ERROR, '缺少环境变量应返回 CONFIG_ERROR')
      assert(payload.error === '服务配置不完整，请检查 Railway 环境变量是否已配置。', '生产环境配置错误提示应引导检查 Railway 环境变量')
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  await test('开发环境 safeErrorMessage 仍保留原始配置错误信息', () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const message = safeErrorMessage(new Error('Missing required environment variable: DATABASE_URL. Please configure DATABASE_URL in the project root .env file.'))
      assert(message.includes('DATABASE_URL'), '开发环境应保留原始缺失变量信息')
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  const passed = results.filter((item) => item.passed).length
  console.log(`\n总计: ${passed}/${results.length} 通过`)

  if (passed !== results.length) {
    process.exit(1)
  }
}

void main()