import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

type ExtractedQuoteParams = {
  productType?: string
  finishedSize?: string
  quantity?: number
  coverPaper?: string
  coverWeight?: number
  innerPaper?: string
  innerWeight?: number
  bindingType?: string
  pageCount?: number
  paperType?: string
  paperWeight?: number
  printSides?: string
  finishType?: string
  lamination?: string
  missingFields: string[]
}

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

function buildExtracted(params: Partial<ExtractedQuoteParams>): ExtractedQuoteParams {
  return {
    missingFields: [],
    ...params,
  }
}

async function mockExtractQuoteParams(message: string): Promise<ExtractedQuoteParams> {
  if (message.includes('画册')) {
    return buildExtracted({
      productType: 'album',
      finishedSize: 'A4',
      quantity: 1000,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
      pageCount: 32,
    })
  }

  if (message.includes('传单')) {
    return buildExtracted({
      productType: 'flyer',
      finishedSize: 'A4',
      quantity: 5000,
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
    })
  }

  if (message.includes('名片')) {
    return buildExtracted({
      productType: 'business_card',
      finishedSize: '90x54mm',
      quantity: 2000,
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
      finishType: 'uv',
    })
  }

  if (message.includes('海报')) {
    return buildExtracted({
      productType: 'poster',
      finishedSize: 'A2',
      quantity: 100,
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'none',
    })
  }

  return buildExtracted({})
}

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null

async function initializeTestRuntime() {
  if (sendChat) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler')

  const createChatPostHandler = typeof routeModule.createChatPostHandler === 'function'
    ? routeModule.createChatPostHandler
    : typeof routeModule.default?.createChatPostHandler === 'function'
      ? routeModule.default.createChatPostHandler
      : null

  if (!createChatPostHandler) {
    throw new Error('createChatPostHandler export not found')
  }

  const postHandler = createChatPostHandler({
    extractQuoteParams: mockExtractQuoteParams,
  })

  sendChat = async (body: Record<string, any>) => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const response = await postHandler(request)
    return response.json()
  }
}

console.log('\n=== 简单品类自动报价停用回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('我想印1000本A4画册时不应返回正式简单品类报价', async () => {
    const response = await sendChat!({
      message: '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，32页',
    })

    assert(response.status === 'handoff_required', '画册自动报价应停用并转人工')
    assert(response.reply.includes('目前自动报价主要支持一期复杂包装'), '应提示当前自动报价范围已切换')
    assert(!response.data, '不应返回正式 simple-product quote data')
  })

  await test('我要5000份A4传单时不应返回正式简单品类报价', async () => {
    const response = await sendChat!({
      message: '我要5000份A4传单，157g铜版纸，双面彩印',
    })

    assert(response.status === 'handoff_required', '传单自动报价应停用并转人工')
    assert(response.reply.includes('一期复杂包装'), '应提示当前是复杂包装活跃范围')
    assert(!response.estimatedData && !response.data, '不应返回 simple-product 估价或正式报价')
  })

  await test('我想做商务名片时不应返回正式简单品类报价', async () => {
    const response = await sendChat!({
      message: '我想做商务名片，90x54mm，300g铜版纸，双面，UV',
    })

    assert(response.status === 'handoff_required', '名片自动报价应停用并转人工')
    assert(response.reply.includes('先走人工核价'), '应明确提示当前先走人工核价')
  })

  await test('支持的一期复杂包装请求仍应正常工作', async () => {
    const response = await sendChat!({
      message: '飞机盒报价，20*12*6cm，300克白卡，四色印刷，5000个',
    })

    assert(response.status === 'quoted', '支持的飞机盒请求应继续正常报价')
    assert(response.data?.normalizedParams?.productType === 'mailer_box', '应优先进入复杂包装链路')
  })

  await test('复杂包装路由应继续优先于旧简单品类链路', async () => {
    const response = await sendChat!({
      message: '双插盒报价，7*5*5CM，350克白卡，正反四色，5000',
    })

    assert(response.status === 'quoted', '双插盒应继续走复杂包装报价')
    assert(response.data?.normalizedParams?.productType === 'tuck_end_box', '应命中 complex packaging productType')
    assert(!response.reply.includes('暂不走自动报价'), '复杂包装不应误触简单品类停用提示')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((item) => item.passed).length
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