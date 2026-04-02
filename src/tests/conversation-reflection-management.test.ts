import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${error}`)
    })
}

function getNamedExport<T>(module: any, name: string): T {
  const direct = module?.[name]
  if (direct) {
    return direct as T
  }

  const nested = module?.default?.[name]
  if (nested) {
    return nested as T
  }

  throw new Error(`Export ${name} not found`)
}

console.log('\n=== 会话详情与 Reflection 管理链路回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const conversationsRouteModule = await import('@/app/api/conversations/route')
  const conversationDetailRouteModule = await import('@/app/api/conversations/[id]/route')
  const conversationReflectionRouteModule = await import('@/app/api/conversations/[id]/reflection/route')
  const reflectionsRouteModule = await import('@/app/api/reflections/route')
  const learningDashboardRouteModule = await import('@/app/api/learning-dashboard/route')

  const createConversation = getNamedExport<() => Promise<{ id: number }>>(conversationsDbModule, 'createConversation')
  const addMessageToConversation = getNamedExport<(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>>(conversationsDbModule, 'addMessageToConversation')
  const conversationsGet = getNamedExport<() => Promise<Response>>(conversationsRouteModule, 'GET')
  const conversationDetailGet = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationDetailRouteModule, 'GET')
  const conversationReflectionPost = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationReflectionRouteModule, 'POST')
  const reflectionsGet = getNamedExport<(request: Request) => Promise<Response>>(reflectionsRouteModule, 'GET')
  const learningDashboardGet = getNamedExport<() => Promise<Response>>(learningDashboardRouteModule, 'GET')

  await test('会话列表 -> 会话详情 -> Reflection 创建 -> 统计增长', async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const beforeReflectionsResponse = await reflectionsGet(new Request('http://localhost/api/reflections?page=1&limit=20'))
      const beforeReflections = await beforeReflectionsResponse.json()
      assert(beforeReflections.ok, '初始 reflections 列表应可读取')
      const beforeReflectionTotal = beforeReflections.data.pagination.total as number

      const beforeDashboardResponse = await learningDashboardGet()
      const beforeDashboard = await beforeDashboardResponse.json()
      assert(beforeDashboard.ok, '初始 learning dashboard 应可读取')
      const beforeReflectionCount = beforeDashboard.data.totals.reflectionCount as number

      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', '我想印1000本A4画册，先给我报价')
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前信息还不足以生成报价，还缺少页数和内页克重。',
        {
          intent: 'QUOTE_REQUEST',
          responseStatus: 'missing_fields',
          extractedParams: {
            productType: 'album',
            finishedSize: 'A4',
            quantity: 1000,
            coverPaper: 'coated',
            coverWeight: 200,
            bindingType: 'saddle_stitch',
          },
          mergedParams: {
            productType: 'album',
            finishedSize: 'A4',
            quantity: 1000,
            coverPaper: 'coated',
            coverWeight: 200,
            bindingType: 'saddle_stitch',
          },
          missingFields: ['pageCount', 'innerWeight'],
        }
      )

      const conversationsResponse = await conversationsGet()
      const conversationsPayload = await conversationsResponse.json()
      assert(conversationsPayload.ok, '会话列表 API 应返回成功')
      assert(conversationsPayload.data.some((item: { id: number }) => item.id === conversation.id), '新建会话应出现在列表中')

      const detailResponse = await conversationDetailGet(
        new Request(`http://localhost/api/conversations/${conversation.id}`),
        { params: { id: String(conversation.id) } }
      )
      const detailPayload = await detailResponse.json()
      assert(detailPayload.ok, '会话详情 API 应返回成功')
      assert(detailPayload.data.id === conversation.id, '会话详情应返回正确会话')
      assert(Array.isArray(detailPayload.data.messages) && detailPayload.data.messages.length >= 2, '会话详情应包含消息记录')

      const reflectionResponse = await conversationReflectionPost(
        new Request(`http://localhost/api/conversations/${conversation.id}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'PARAM_MISSING',
            correctedParams: {
              pageCount: 32,
              innerWeight: 157,
            },
            correctedQuoteSummary: '人工复核后按 32 页、157g 内页继续报价。',
          }),
        }),
        { params: { id: String(conversation.id) } }
      )
      const reflectionPayload = await reflectionResponse.json()
      assert(reflectionPayload.ok, '会话详情页的 reflection 创建 API 应返回成功')
      assert(reflectionPayload.data.conversationId === conversation.id, '新 reflection 应属于当前会话')
      assert(reflectionPayload.data.issueType === 'PARAM_MISSING', '新 reflection 应保留 issueType')

      const detailAfterResponse = await conversationDetailGet(
        new Request(`http://localhost/api/conversations/${conversation.id}`),
        { params: { id: String(conversation.id) } }
      )
      const detailAfterPayload = await detailAfterResponse.json()
      assert(detailAfterPayload.ok, '创建 reflection 后会话详情应仍可读取')
      assert((detailAfterPayload.data.reflections?.length || 0) >= 1, '会话详情应包含刚创建的 reflection')

      const reflectionsResponse = await reflectionsGet(new Request('http://localhost/api/reflections?page=1&limit=20'))
      const reflectionsPayload = await reflectionsResponse.json()
      assert(reflectionsPayload.ok, 'reflections 列表 API 应返回成功')
      assert(reflectionsPayload.data.pagination.total >= beforeReflectionTotal + 1, '创建 reflection 后 /reflections 总数应增加')
      assert(
        reflectionsPayload.data.records.some((item: { id: number; conversationId: number }) => (
          item.id === reflectionPayload.data.id && item.conversationId === conversation.id
        )),
        '新 reflection 应出现在 /reflections 列表中'
      )

      const dashboardResponse = await learningDashboardGet()
      const dashboardPayload = await dashboardResponse.json()
      assert(dashboardPayload.ok, 'learning dashboard API 应返回成功')
      assert(dashboardPayload.data.totals.reflectionCount >= beforeReflectionCount + 1, '创建 reflection 后 dashboard Reflection 总数应增加')
    } finally {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((r) => r.passed).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})