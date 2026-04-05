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

console.log('\n=== 会话详情稳定性回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const conversationDetailRouteModule = await import('@/app/api/conversations/[id]/route')

  const createConversation = getNamedExport<() => Promise<{ id: number }>>(conversationsDbModule, 'createConversation')
  const addMessageToConversation = getNamedExport<(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>>(conversationsDbModule, 'addMessageToConversation')
  const createHandoffRecord = getNamedExport<(conversationId: number, reason: string, assignedTo?: string) => Promise<any>>(conversationsDbModule, 'createHandoffRecord')
  const conversationDetailGet = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationDetailRouteModule, 'GET')

  await test('正常复杂包装详情可打开', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '飞机盒报价，20*12*6cm，300克白卡，四色印刷，5000个')
    await addMessageToConversation(conversation.id, 'ASSISTANT', '这边先按您这版复杂包装参数核了一下。', {
      responseStatus: 'quoted',
      packagingReview: {
        status: 'quoted',
        lineItems: [
          {
            itemType: 'mailer_box',
            title: '飞机盒',
            quantity: 5000,
            normalizedSpecSummary: '飞机盒 / 20×12×6cm',
            materialWeightSummary: '白卡 / 300g',
            printColorSummary: '四色',
            processSummary: '基础工序',
            setupCost: 120,
            runCost: 880,
            unitPrice: 0.56,
            lineTotal: 2800,
            reviewFlags: [],
            reviewReasons: [],
            requiresHumanReview: false,
          },
        ],
        subItems: [],
        reviewFlags: [],
        reviewReasons: [],
        missingDetails: [],
      },
    })

    const response = await conversationDetailGet(new Request(`http://localhost/api/conversations/${conversation.id}`), {
      params: { id: String(conversation.id) },
    })
    const payload = await response.json()

    assert(response.status === 200, '正常复杂包装详情不应 500')
    assert(payload.ok === true, '复杂包装详情应返回成功')
    assert(Array.isArray(payload.data.messages), '详情应返回消息数组')
    assert(Array.isArray(payload.data.messages[1].metadata.packagingReview.lineItems), 'packagingReview 应已标准化')
  })

  await test('文件型人工接管详情可打开', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '我有 PDF 设计稿，帮我看看并报价')
    await addMessageToConversation(conversation.id, 'ASSISTANT', '这类需求我先帮您转给人工同事继续核一下。', {
      responseStatus: 'handoff_required',
    })
    await createHandoffRecord(conversation.id, '涉及设计文件或专业审稿需求', 'design_team')

    const response = await conversationDetailGet(new Request(`http://localhost/api/conversations/${conversation.id}`), {
      params: { id: String(conversation.id) },
    })
    const payload = await response.json()

    assert(response.status === 200, '文件型人工接管详情不应 500')
    assert(payload.ok === true, '文件型详情应返回成功')
    assert(Array.isArray(payload.data.handoffs) && payload.data.handoffs.length >= 1, '详情应返回人工接管记录')
  })

  await test('字段残缺的旧会话详情也不会 500', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '这种包装一般多少钱')
    await addMessageToConversation(conversation.id, 'ASSISTANT', '先给您一个方向参考。', {
      responseStatus: 'estimated',
      packagingReview: {
        status: 'estimated',
      },
    })

    const response = await conversationDetailGet(new Request(`http://localhost/api/conversations/${conversation.id}`), {
      params: { id: String(conversation.id) },
    })
    const payload = await response.json()

    assert(response.status === 200, '字段残缺旧会话详情不应 500')
    assert(payload.ok === true, '字段残缺旧会话详情应返回成功')
    assert(Array.isArray(payload.data.messages), '旧会话详情应返回消息数组')
    assert(Array.isArray(payload.data.messages[1].metadata.packagingReview.lineItems), '残缺 packagingReview 应被兜底成安全结构')
    assert(Array.isArray(payload.data.messages[1].metadata.packagingReview.missingDetails), '残缺 packagingReview 缺参字段应被兜底成数组')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)

  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})