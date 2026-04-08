import dotenv from 'dotenv'

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

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null

async function initializeTestRuntime() {
  if (sendChat) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler') as Record<string, any>
  const routerModule = await import('@/server/ai/routeMessage')

  const createChatPostHandler = typeof routeModule.createChatPostHandler === 'function'
    ? routeModule.createChatPostHandler
    : typeof routeModule.default?.createChatPostHandler === 'function'
      ? routeModule.default.createChatPostHandler
      : null

  if (!createChatPostHandler || typeof routerModule.routeMessage !== 'function') {
    throw new Error('chat handler or routeMessage export not found')
  }

  const postHandler = createChatPostHandler({
    extractQuoteParams: async () => ({ missingFields: [] }),
    routeMessage: (input: any, _deps?: any, traceContext?: any) => routerModule.routeMessage(input, {
      callModel: async () => {
        throw new Error('force rule fallback')
      },
    }, traceContext),
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

console.log('\n=== Chat API 咨询式包装问价回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('咨询式飞机盒问价不应直接进入 quoted', async () => {
    const response = await sendChat!({
      message: '你们的飞机盒怎么卖',
    })

    assert(response.status === 'consultation_reply', '咨询式飞机盒问价应优先进入 consultation_reply')
    assert(response.intent === 'SOLUTION_RECOMMENDATION', '应优先识别为方案咨询')
    assert(response.productType === 'mailer_box', '应识别为飞机盒咨询承接')
    assert(response.reply.includes('飞机盒'), '回复应包含飞机盒说明')
    assert(response.reply.includes('价格通常主要受'), '回复应先解释价格影响因素')
    assert(response.reply.includes('发货') || response.reply.includes('快递') || response.reply.includes('基础工艺'), '回复应包含更具体的常见做法')
    assert(response.reply.includes('尺寸') && response.reply.includes('材质'), '回复应引导补充关键参数')
    assert(!response.reply.includes('还差') && !response.reply.includes('缺少'), '回复不应退化成缺参模板')
    assert(!response.recommendedParams, '不应伪造已经锁定的完整推荐方案')
    assert(!response.data && !response.estimatedData, '不应直接返回正式报价或预报价')
  })

  await test('泛纸盒方案咨询应优先进入推荐式回复', async () => {
    const response = await sendChat!({
      message: '我想做一个纸盒装护肤品，你们一般推荐什么',
    })

    assert(response.status === 'consultation_reply', '泛纸盒咨询应优先进入 consultation_reply')
    assert(response.reply.includes('双插盒') && response.reply.includes('飞机盒'), '应返回常见盒型方向')
    assert(response.reply.includes('开窗彩盒'), '应返回展示型盒型方向')
    assert(response.reply.includes('预算') && response.reply.includes('展示'), '应继续询问预算和展示倾向')
    assert(!response.productType, '泛需求不应直接锁定单一盒型')
    assert(Array.isArray(response.candidateProductTypes) && response.candidateProductTypes.length === 3, '应返回多个候选盒型')
    assert(!response.recommendedParams, '泛需求阶段不应直接生成单一推荐方案')
    assert(!response.data && !response.estimatedData, '用途咨询阶段不应直接返回价格')
  })

  await test('外包装泛需求不应默认双插盒缺参或直接 estimated', async () => {
    const response = await sendChat!({
      message: '我想要个外包装推荐',
    })

    assert(response.status === 'consultation_reply', '外包装泛需求应优先进入 consultation_reply')
    assert(!response.productType, '泛需求不应直接锁定双插盒或飞机盒')
    assert(Array.isArray(response.candidateProductTypes) && response.candidateProductTypes.length === 3, '应返回多个候选方向')
    assert(response.reply.includes('飞机盒') && response.reply.includes('双插盒') && response.reply.includes('开窗彩盒'), '应给出 2 到 3 个常见方向')
    assert(!response.recommendedParams, '不应伪造单一推荐方案')
    assert(!response.data && !response.estimatedData, '泛咨询阶段不应直接 estimated')
  })

  await test('泛包装推荐问法只要能稳定建议，就不应直接转人工', async () => {
    const response = await sendChat!({
      message: '我想做个包装，你们一般有什么推荐',
    })

    assert(response.status === 'consultation_reply', '泛包装推荐问法应继续 recommendation')
    assert(response.intent === 'SOLUTION_RECOMMENDATION', '应识别为方案推荐')
    assert(!response.data && !response.estimatedData, '不应直接报价')
    assert(response.reply.includes('飞机盒') && response.reply.includes('双插盒'), '应给出常见方向')
  })

  await test('预算受限的外包装咨询应继续 recommendation，而不是直接 handoff', async () => {
    const response = await sendChat!({
      message: '我想做个外包装，预算不要太高',
    })

    assert(response.status === 'consultation_reply', '预算受限的外包装咨询应继续 recommendation')
    assert(response.intent === 'SOLUTION_RECOMMENDATION', '应继续归到推荐层')
    assert(response.reply.includes('双插盒'), '应优先给出控成本方向')
    assert(response.reply.includes('预算区间'), '应继续引导补充预算区间')
    assert(!response.data && !response.estimatedData, '不应直接报价')
  })

  await test('装小卡片和赠品的盒型选择应继续 recommendation，而不是直接 handoff', async () => {
    const response = await sendChat!({
      message: '我要装小卡片和赠品，盒子怎么选',
    })

    assert(response.status === 'consultation_reply', '卡片赠品盒型选择应继续 recommendation')
    assert(response.reply.includes('飞机盒') && response.reply.includes('双插盒') && response.reply.includes('开窗彩盒'), '应给出多个盒型方向')
    assert(!response.data && !response.estimatedData, '不应直接报价')
  })

  await test('超出当前稳定建议范围的礼盒咨询应转人工', async () => {
    const response = await sendChat!({
      message: '我想做磁吸天地盖礼盒，你们一般推荐什么',
    })

    assert(response.status === 'handoff_required', '超范围礼盒咨询应 handoff')
    assert(response.fallbackMode === 'fallback_to_human', '应显式标记 fallback_to_human')
    assert(typeof response.reply === 'string' && response.reply.includes('抱歉'), '应返回自然中文兜底话术')
  })

  await test('高歧义且无上下文的结构咨询应转人工，避免误导', async () => {
    const response = await sendChat!({
      message: '这种结构怎么做',
    })

    assert(response.status === 'handoff_required', '高歧义结构咨询应 handoff')
    assert(response.fallbackMode === 'fallback_to_human', '应显式标记 fallback_to_human')
    assert(typeof response.reply === 'string' && response.reply.includes('抱歉'), '应返回自然中文兜底话术')
  })

  await test('真实完整参数的飞机盒仍可正常 quoted', async () => {
    const response = await sendChat!({
      message: '飞机盒报价，20*12*6cm，300克白卡，四色印刷，5000个',
    })

    assert(response.status === 'quoted', '完整飞机盒样本应继续 quoted')
    assert(response.data?.normalizedParams?.productType === 'mailer_box', '应命中飞机盒报价链路')
  })

  await test('显式克重标准内托单品在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000',
    })

    assert(response.status === 'quoted', '显式克重标准内托单品应允许 quoted')
    assert(response.data?.normalizedParams?.productType === 'box_insert', '应命中内托报价链路')
    assert(response.packagingReview?.trialGateStatus === 'allowed_quoted_in_trial', '应暴露 allowed_quoted_in_trial')
  })

  await test('高频 proxy 内托单品在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '内托：20*12CM左右，WEB特种纸板，5000',
    })

    assert(response.status === 'quoted', '高频 proxy 内托单品应允许 quoted')
    assert(response.data?.normalizedParams?.productType === 'box_insert', 'quoted 结果应继续保留内托 productType')
    assert(response.packagingReview?.trialGateStatus === 'allowed_quoted_in_trial', '应暴露 allowed_quoted_in_trial')
  })

  await test('高频 generic 说明书单品在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '说明书：220x170mm，80g双胶纸，单面印，6100',
    })

    assert(response.status === 'quoted', '高频 generic 说明书单品应允许 quoted')
    assert(response.data?.normalizedParams?.productType === 'leaflet_insert', '应命中说明书报价链路')
    assert(response.packagingReview?.trialGateStatus === 'allowed_quoted_in_trial', '应暴露 allowed_quoted_in_trial')
  })

  await test('标准 glossy no-film window 单品在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，啤成品+粘盒，2000',
    })

    assert(response.status === 'quoted', '标准 glossy no-film window 单品应允许 quoted')
    assert(response.data?.normalizedParams?.productType === 'window_box', '应命中 window_box 报价链路')
    assert(response.packagingReview?.trialGateStatus === 'allowed_quoted_in_trial', '应暴露 allowed_quoted_in_trial')
  })

  await test('文件型询价边界不受影响', async () => {
    const response = await sendChat!({
      message: '我有 PDF 设计稿，帮我看看并报价',
    })

    assert(response.status === 'handoff_required', '文件型询价应继续 handoff')
  })

  await test('chat packaging routing 对两配件标准 bundle 放宽 quoted，并保持多配件 guardrail', async () => {
    const quotedLeafletSticker = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    })

    assert(quotedLeafletSticker.status === 'quoted', '标准双插盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
    assert(quotedLeafletSticker.data?.isBundle === true, 'quoted bundle 结果应保留 isBundle 标记')
    assert(quotedLeafletSticker.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + 标准贴纸应暴露标准 quoted bundle gate')

    const quotedInsertLeaflet = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色+专色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000',
    })

    assert(quotedInsertLeaflet.status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书 bundle 应允许 quoted')
    assert(quotedInsertLeaflet.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准说明书应暴露标准 quoted bundle gate')

    const quotedInsertSticker = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色+专色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    })

    assert(quotedInsertSticker.status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸 bundle 应允许 quoted')
    assert(quotedInsertSticker.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准贴纸应暴露标准 quoted bundle gate')

    const quotedLeafletCarton = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；纸箱+包装费：42*42*35CM，5000套',
    })

    assert(quotedLeafletCarton.status === 'quoted', '标准双插盒 + 标准说明书 + simple carton bundle 应允许 quoted')
    assert(quotedLeafletCarton.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + simple carton 应暴露标准 quoted bundle gate')

    const quotedMailerLeafletSticker = await sendChat!({
      message: '飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    })

    assert(quotedMailerLeafletSticker.status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
    assert(quotedMailerLeafletSticker.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 标准说明书 + 标准贴纸应暴露标准 quoted bundle gate')

    const estimatedFullBundle = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000；纸箱+包装费：42*42*35CM，5000套',
    })

    assert(estimatedFullBundle.status === 'estimated', '更宽的三配件 bundle 应继续 estimated')
    assert(estimatedFullBundle.estimatedData?.isBundle === true, 'estimated bundle 结果应保留 isBundle 标记')
    assert(estimatedFullBundle.packagingReview?.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '更宽的三配件 bundle 应暴露 estimated-only bundle gate')

    const estimatedGenericLeafletSticker = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：220x170mm，80g双胶纸，单面印，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    })

    assert(estimatedGenericLeafletSticker.status === 'estimated', 'generic leaflet 参与的多配件 bundle 应继续 estimated')
    assert(estimatedGenericLeafletSticker.packagingReview?.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'generic leaflet 参与的多配件 bundle 应暴露 estimated-only bundle gate')

    const estimatedProxyInsertLeaflet = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000',
    })

    assert(estimatedProxyInsertLeaflet.status === 'estimated', 'proxy 内托参与的多配件 bundle 应继续 estimated')
    assert(estimatedProxyInsertLeaflet.packagingReview?.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'proxy 内托参与的多配件 bundle 应暴露 estimated-only bundle gate')
  })

  await test('双插盒 + 标准说明书 bundle 可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000',
    })

    assert(response.status === 'quoted', '标准主件 + 标准说明书 bundle 应允许 quoted')
    assert(response.data?.isBundle === true, 'quoted bundle 结果应保留 isBundle 标记')
    assert(response.packagingReview?.statusReasonText.includes('标准主盒 + 标准说明书'), '应返回中文 trial gate 说明')
  })

  await test('双插盒 + 标准贴纸 bundle 可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；透明贴纸：2.4*3cm，透明贴纸，5000',
    })

    assert(response.status === 'quoted', '标准主件 + 标准贴纸 bundle 应允许 quoted')
    assert(response.data?.isBundle === true, 'quoted bundle 结果应保留 isBundle 标记')
    assert(response.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '应暴露标准 quoted bundle gate')
  })

  await test('双插盒 + simple carton bundle 在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；纸箱+包装费：42*42*35CM，5000套',
    })

    assert(response.status === 'quoted', '主件 + simple carton 应允许 quoted')
    assert(response.data?.isBundle === true, 'quoted bundle 结果应保留 isBundle 标记')
    assert(response.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + simple carton 应暴露标准 quoted bundle gate')
  })

  await test('双插盒 + 标准内托 bundle 在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色+专色，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000',
    })

    assert(response.status === 'quoted', '标准双插盒 + 标准内托 bundle 应允许 quoted')
    assert(response.data?.isBundle === true, 'quoted bundle 结果应保留 isBundle 标记')
    assert(response.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托应暴露标准 quoted bundle gate')
  })

  await test('双插盒 + 高频 proxy 内托 bundle 在当前 trial gate 下可进入 quoted', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；内托：20*12CM左右，WEB特种纸板，5000',
    })

    assert(response.status === 'quoted', '双插盒 + 高频 proxy 内托 bundle 应允许 quoted')
    assert(response.packagingReview?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '双插盒 + 高频 proxy 内托应暴露标准 quoted bundle gate')
  })

  await test('双插盒 + 高频 generic 说明书 bundle 在当前 trial gate 下应保持 estimated', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：220x170mm，80g双胶纸，单面印，5000',
    })

    assert(response.status === 'estimated', '双插盒 + 高频 generic 说明书 bundle 应继续保持 estimated')
    assert(response.packagingReview?.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '双插盒 + 高频 generic 说明书应暴露 estimated-only bundle gate')
  })

  await test('双插盒 + handoff-only 内托 bundle 在当前 trial gate 下应继续 handoff', async () => {
    const response = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000个；内托：20*12CM，EVA内托，5000',
    })

    assert(response.status === 'handoff_required', '双插盒 + handoff-only 内托 bundle 应继续 handoff')
    assert(response.packagingReview?.trialBundleGateStatus === 'handoff_only_bundle_in_trial', '双插盒 + handoff-only 内托应继续暴露 handoff bundle gate')
  })

  await test('明确产品类型但缺关键字段的双插盒仍应 missing_fields，不被新兜底误伤', async () => {
    const response = await sendChat!({
      message: '双插盒，7*5*5CM，350克白卡，5000个',
    })

    assert(response.status === 'missing_fields', '明确产品类型但缺关键字段时仍应 missing_fields')
  })

  await test('双插开窗盒缺核心参数时不能直接 quoted', async () => {
    const response = await sendChat!({
      message: '双插开窗盒，带胶片，正反四色+专色，报价',
    })

    assert(response.status === 'estimated' || response.status === 'missing_fields', '双插开窗盒缺核心参数时应 estimated 或 missing_fields')
    assert(response.status !== 'quoted', '双插开窗盒缺核心参数时不能直接 quoted')
    assert(response.productType === undefined || response.data?.normalizedParams?.productType === 'window_box' || response.complexPackagingState?.mainItem?.productType === 'window_box', '应落在 window_box 边界而不是直接正式报价')
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