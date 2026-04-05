import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

type ExtractedQuoteParams = {
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

function buildExtracted(): ExtractedQuoteParams {
  return { missingFields: [] }
}

async function mockExtractQuoteParams(): Promise<ExtractedQuoteParams> {
  return buildExtracted()
}

let sendChat: ((body: Record<string, any>) => Promise<any>) | null = null
let getConversationWithDetailsFn: ((conversationId: number) => Promise<any>) | null = null

async function initializeTestRuntime() {
  if (sendChat) {
    return
  }

  const routeModule = await import('@/server/chat/createChatPostHandler')
  const conversationModule = await import('@/server/db/conversations')

  const createChatPostHandler = typeof routeModule.createChatPostHandler === 'function'
    ? routeModule.createChatPostHandler
    : typeof routeModule.default?.createChatPostHandler === 'function'
      ? routeModule.default.createChatPostHandler
      : null

  if (!createChatPostHandler) {
    throw new Error('createChatPostHandler export not found')
  }

  if (typeof conversationModule.getConversationWithDetails !== 'function') {
    throw new Error('getConversationWithDetails export not found')
  }

  getConversationWithDetailsFn = conversationModule.getConversationWithDetails

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

function getPackagingQuote(response: any) {
  return response.data || response.estimatedData
}

function findItem(response: any, itemType: string) {
  return getPackagingQuote(response)?.items?.find((item: any) => item.itemType === itemType)
}

async function getLatestAssistantMetadata(conversationId: string) {
  if (!getConversationWithDetailsFn) {
    throw new Error('getConversationWithDetails is not initialized')
  }

  const conversation = await getConversationWithDetailsFn(Number(conversationId))
  const assistantMessages = conversation.messages.filter((message) => message.sender === 'ASSISTANT')
  return assistantMessages[assistantMessages.length - 1]?.metadata || null
}

async function createBundleConversation() {
  const initial = await sendChat!({
    message: '双插盒：7*5*5CM，350克白卡，正反四色，5000；内托：20*12CM，白卡，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
  })

  assert(initial.status === 'estimated', '完整 bundle 初始化应进入 estimated')
  assert(initial.estimatedData?.items?.length === 4, '初始化 bundle 应包含 4 个 item')
  assert(initial.packagingReview?.status === 'estimated', '初始化 bundle 应返回包装解释摘要')
  assert(initial.packagingReview?.lineItems?.length === 4, '包装解释摘要应覆盖全部 bundle item')
  return initial
}

console.log('\n=== Chat API 复杂包装多轮回归测试 ===\n')

async function main() {
  await initializeTestRuntime()

  await test('多轮可逐步创建复杂包装 bundle，并继承主件上下文', async () => {
    const turn1 = await sendChat!({
      message: '双插盒，7*5*5CM，5000个',
    })

    assert(turn1.status === 'missing_fields', '首轮主件信息不全时应进入 missing_fields')
    assert(turn1.complexPackagingState?.mainItem?.productType === 'tuck_end_box', '主件应保持为双插盒')
    assert(turn1.reply.includes('这边先帮您对了一下'), 'missing_fields 回复应更像客服补参引导')

    const turn2 = await sendChat!({
      conversationId: turn1.conversationId,
      message: '350克白卡，正反四色，正面过哑胶',
    })

    assert(turn2.status === 'quoted', '补齐主件参数后应进入 quoted')
    assert(turn2.conversationAction === 'supplement_params', '补参转 quoted 时应标记 supplement_params')
    assert(turn2.data?.mainItem?.normalizedParams?.productType === 'tuck_end_box', '补参后主件仍应为双插盒')
    assert(turn2.packagingReview?.status === 'quoted', 'quoted 响应应返回包装解释摘要')
    assert(turn2.packagingReview?.mainItem?.setupCost > 0, '包装解释摘要应包含开机费')
    assert(turn2.reply.includes('这边先按您这版'), 'quoted 回复应采用客服式报价话术')

    const turn3 = await sendChat!({
      conversationId: turn2.conversationId,
      message: '再加一个说明书，20*5CM，80克双铜纸，双面四色印，折3折',
    })

    assert(turn3.status === 'estimated', '添加说明书后 bundle 应进入 estimated')
    assert(turn3.conversationAction === 'add_sub_item', '新增子项应标记 add_sub_item')
    assert(turn3.estimatedData?.isBundle === true, '添加说明书后应成为 bundle')
    assert(turn3.estimatedData?.items?.length === 2, '添加说明书后应包含 2 个 item')
    assert(findItem(turn3, 'leaflet_insert')?.normalizedParams?.quantity === 5000, '说明书应继承主件数量 5000')
    assert(turn3.reply.includes('组合预估'), 'estimated 回复应明确是预估而不是正式报价')

    const turn4 = await sendChat!({
      conversationId: turn3.conversationId,
      message: '再加透明贴纸，2.4*3cm',
    })

    assert(turn4.status === 'estimated', '添加贴纸后应继续维持 bundle estimated')
    assert(turn4.conversationAction === 'add_sub_item', '新增贴纸应标记 add_sub_item')
    assert(turn4.estimatedData?.items?.length === 3, '添加贴纸后应包含 3 个 item')
    assert(Boolean(findItem(turn4, 'seal_sticker')), 'bundle 中应新增 seal_sticker')
    assert(findItem(turn4, 'seal_sticker')?.normalizedParams?.quantity === 5000, '贴纸应继承主件数量 5000')
  })

  await test('已 quoted 的主件再改参数时必须按 modify_existing_item 重算，而不是沿用旧结果', async () => {
    const quoted = await sendChat!({
      message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
    })

    assert(quoted.status === 'quoted', '首轮完整双插盒应先 quoted')
    const previousFinalPrice = quoted.data?.finalPrice

    const modified = await sendChat!({
      conversationId: quoted.conversationId,
      message: '350克白卡，正面过哑胶',
    })

    assert(modified.status === 'quoted', '完整参数上改单后仍应 quoted')
    assert(modified.conversationAction === 'modify_existing_item', '改单应标记 modify_existing_item')
    assert(modified.reply.includes('重算'), '改单回复应明确说明已重算')
    assert(typeof previousFinalPrice === 'number' && modified.data?.finalPrice > previousFinalPrice, '改单后价格应按新参数重算')
  })

  await test('已 quoted 的主件明确改数量时，仍应按 modify_existing_item 重算', async () => {
    const quoted = await sendChat!({
      message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
    })

    assert(quoted.status === 'quoted', '首轮完整双插盒应先 quoted')
    const previousFinalPrice = quoted.data?.finalPrice

    const modified = await sendChat!({
      conversationId: quoted.conversationId,
      message: '数量改成10000',
    })

    assert(modified.status === 'quoted', '明确改数量后仍应 quoted')
    assert(modified.conversationAction === 'modify_existing_item', '改数量应标记 modify_existing_item')
    assert(modified.reply.includes('重算'), '改数量回复应明确说明已重算')
    assert(typeof previousFinalPrice === 'number' && modified.data?.finalPrice > previousFinalPrice, '数量调整后价格应按新数量重算')
  })

  await test('已有正式报价后，明显乱码或无关输入不能继续沿用旧报价', async () => {
    const quoted = await sendChat!({
      message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
    })

    assert(quoted.status === 'quoted', '前置双插盒应先形成 quoted')

    const noisy = await sendChat!({
      conversationId: quoted.conversationId,
      message: 'asdjkl;;;qwezzz',
    })

    assert(noisy.status !== 'quoted', '乱码输入不应继续 quoted')
    assert(noisy.status !== 'estimated', '乱码输入不应继续 estimated')
    assert(noisy.status !== 'missing_fields', '乱码输入不应继续 missing_fields')
    assert(noisy.status === 'intent_only' || noisy.status === 'handoff_required', '乱码输入应进入澄清或人工')
    assert(!noisy.data && !noisy.estimatedData, '乱码输入不应继续返回旧报价数据')
    assert(noisy.blockedContextReuse === true, '乱码输入应显式阻断旧报价上下文复用')
  })

  await test('已有会话后，和当前报价无关的新模糊问题不应继续复用旧报价', async () => {
    const quoted = await sendChat!({
      message: '双插盒，7*5*5CM，300克白卡，正反四色，5000个',
    })

    assert(quoted.status === 'quoted', '前置双插盒应先形成 quoted')

    const unrelated = await sendChat!({
      conversationId: quoted.conversationId,
      message: '你们一般还有什么推荐',
    })

    assert(unrelated.status !== 'quoted', '无关新问题不应继续 quoted')
    assert(unrelated.status !== 'estimated', '无关新问题不应继续 estimated')
    assert(unrelated.status !== 'missing_fields', '无关新问题不应继续 missing_fields')
    assert(
      unrelated.status === 'consultation_reply'
        || unrelated.status === 'intent_only'
        || unrelated.status === 'handoff_required',
      '无关新问题应落到 recommendation、clarification 或 handoff'
    )
    assert(!unrelated.data && !unrelated.estimatedData, '无关新问题不应继续返回旧报价结果')
  })

  await test('按这个方案报价应复用上一轮复杂包装上下文，而不是从空状态重来', async () => {
    const initial = await sendChat!({
      message: '双插盒，7*5*5CM，5000个',
    })

    const confirmation = await sendChat!({
      conversationId: initial.conversationId,
      message: '按这个方案报价',
    })

    assert(confirmation.status === 'missing_fields', '缺参状态下确认方案应继续缺参，而不是重置')
    assert(confirmation.complexPackagingState?.mainItem?.productType === 'tuck_end_box', '应复用上一轮双插盒上下文')
    assert(Array.isArray(confirmation.missingDetails) && confirmation.missingDetails.length === 1, '应只返回当前主件的缺参')
    assert(confirmation.missingDetails[0].itemLabel === '双插盒', '缺参项应指向双插盒')
    assert(confirmation.reply.includes('还差这些信息'), '确认后缺参回复应继续引导补信息')
  })

  await test('可以在后续轮次单独新增 leaflet_insert 与 seal_sticker', async () => {
    const base = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000',
    })

    const withLeaflet = await sendChat!({
      conversationId: base.conversationId,
      message: '再加一个说明书，20*5CM，80克双铜纸，双面四色印，折3折',
    })

    assert(Boolean(findItem(withLeaflet, 'leaflet_insert')), '后续轮次应能新增说明书')
    assert(withLeaflet.estimatedData?.items?.length === 2, '新增说明书后应有 2 个 item')

    const withSticker = await sendChat!({
      conversationId: withLeaflet.conversationId,
      message: '再加透明贴纸，2.4*3cm',
    })

    assert(Boolean(findItem(withSticker, 'seal_sticker')), '后续轮次应能新增贴纸')
    assert(withSticker.estimatedData?.items?.length === 3, '新增贴纸后应有 3 个 item')
  })

  await test('可以定向更新某个 subItem，而不会破坏其他组件', async () => {
    const bundle = await createBundleConversation()

    const updatedLeaflet = await sendChat!({
      conversationId: bundle.conversationId,
      message: '说明书改成双面黑白',
    })

    assert(updatedLeaflet.status === 'estimated', '更新说明书后应继续返回 estimated')
    assert(findItem(updatedLeaflet, 'leaflet_insert')?.normalizedParams?.printSides === 'double', '说明书应更新为双面')
    assert(findItem(updatedLeaflet, 'leaflet_insert')?.normalizedParams?.printColor === 'black', '说明书印色应改为黑白')
    assert(findItem(updatedLeaflet, 'box_insert')?.normalizedParams?.insertMaterial === 'white_card', '内托不应被说明书更新污染')
    assert(findItem(updatedLeaflet, 'seal_sticker')?.normalizedParams?.stickerMaterial === 'clear_sticker', '贴纸不应被说明书更新污染')

    const updatedInsert = await sendChat!({
      conversationId: updatedLeaflet.conversationId,
      message: '内托改成 WEB 特种纸板',
    })

    assert(findItem(updatedInsert, 'box_insert')?.normalizedParams?.insertMaterial === 'specialty_board', '内托材质应更新为 WEB 特种纸板')
    assert(findItem(updatedInsert, 'leaflet_insert')?.normalizedParams?.printColor === 'black', '内托更新不应破坏说明书状态')
  })

  await test('可以移除某个 subItem，并重新计算 bundle 总价', async () => {
    const bundle = await createBundleConversation()
    const beforeRemoval = bundle.estimatedData?.finalPrice

    const removedSticker = await sendChat!({
      conversationId: bundle.conversationId,
      message: '贴纸不要了',
    })

    assert(removedSticker.status === 'estimated', '移除贴纸后剩余 bundle 仍应为 estimated')
    assert(removedSticker.conversationAction === 'remove_sub_item', '删除子项应标记 remove_sub_item')
    assert(removedSticker.estimatedData?.items?.length === 3, '移除贴纸后 item 数量应减少到 3')
    assert(!findItem(removedSticker, 'seal_sticker'), 'bundle 中不应再包含贴纸')
    assert(typeof beforeRemoval === 'number' && removedSticker.estimatedData?.finalPrice < beforeRemoval, '移除组件后总价应下降')
  })

  await test('说明书不要这类删除表达也必须触发 bundle 更新', async () => {
    const bundle = await createBundleConversation()

    const removedLeaflet = await sendChat!({
      conversationId: bundle.conversationId,
      message: '说明书不要',
    })

    assert(removedLeaflet.status === 'estimated', '移除说明书后剩余 bundle 仍应 estimated')
    assert(removedLeaflet.conversationAction === 'remove_sub_item', '说明书删除应标记 remove_sub_item')
    assert(!findItem(removedLeaflet, 'leaflet_insert'), 'bundle 中不应再包含说明书')
    assert(removedLeaflet.estimatedData?.items?.length === 3, '移除说明书后 item 数量应减少到 3')
  })

  await test('bundle 缺参应只作用在对应 item 上，不应混入其他品类字段', async () => {
    const base = await sendChat!({
      message: '双插盒：7*5*5CM，350克白卡，正反四色，5000',
    })

    const addIncompleteInsert = await sendChat!({
      conversationId: base.conversationId,
      message: '再加一个内托',
    })

    assert(addIncompleteInsert.status === 'missing_fields', '新增缺参内托时应进入 missing_fields')
    assert(Array.isArray(addIncompleteInsert.missingDetails) && addIncompleteInsert.missingDetails.length === 1, '缺参应只落在一个 item 上')
    assert(addIncompleteInsert.missingDetails[0].itemLabel === '内托', '缺参项应只指向内托')
    assert(addIncompleteInsert.missingDetails[0].fields.includes('insertMaterial'), '内托缺参应包含 insertMaterial')
    assert(addIncompleteInsert.missingDetails[0].fields.includes('insertLength'), '内托缺参应包含 insertLength')
    assert(addIncompleteInsert.missingDetails[0].fields.includes('insertWidth'), '内托缺参应包含 insertWidth')
    assert(!addIncompleteInsert.missingDetails[0].fields.includes('material'), '不应把主盒字段错误混入内托缺参')
    assert((addIncompleteInsert.missingFields || []).every((field: string) => field.startsWith('内托')), '用户可见缺参应只标记内托字段')
    assert(addIncompleteInsert.packagingReview?.status === 'missing_fields', '缺参响应应附带包装解释摘要')
    assert(addIncompleteInsert.packagingReview?.missingDetails?.[0]?.itemLabel === '内托', '包装解释摘要应对齐缺参 item')
  })

  await test('高复杂度包装预报价应暴露结构化复核原因', async () => {
    const response = await sendChat!({
      message: '开窗彩盒，规格21*17*31cm，400克特种纸板，正反四色 + 3个专色，开窗贴0.35厚胶片 18*16CM，啤 + 粘，数量300',
    })

    assert(response.status === 'estimated', '高复杂度包装应保持 estimated')
    assert(Array.isArray(response.packagingReview?.reviewReasons) && response.packagingReview.reviewReasons.length > 0, '应返回结构化复核原因')
    assert(response.packagingReview.reviewReasons.some((reason: any) => reason.code === 'thick_window_film'), '应包含厚胶片原因')
    assert(response.packagingReview.reviewReasons.some((reason: any) => reason.code === 'large_window_ratio'), '应包含大开窗比例原因')
  })

  await test('second-phase shadow 接入后，live 响应保持不变且 assistant metadata 挂有 shadow payload', async () => {
    const response = await sendChat!({
      message: '双插盒，7*5*5CM，350克白卡，正反四色，5000个',
    })

    assert(response.status === 'quoted', 'live phase-one 仍应保持 quoted')
    assert(response.data?.mainItem?.normalizedParams?.productType === 'tuck_end_box', 'live 主结果不应被 shadow 替换')

    const metadata = await getLatestAssistantMetadata(response.conversationId)
    assert(Boolean(metadata?.complexPackagingShadow), 'assistant metadata 应附带 second-phase shadow payload')
    assert(metadata?.complexPackagingShadow?.usedForResponse === false, 'shadow payload 不应直接用于对外响应')
    assert(typeof metadata?.complexPackagingShadow?.diffSummary?.familyMergeAligned === 'boolean', '应保留 family merge 差异字段')
    assert(metadata?.complexPackagingShadow?.diffSummary?.packagingTypeAligned === true, '应保留 phase-one vs second-phase 主类差异摘要')
  })

  await test('开窗彩盒仍保持 live estimated，但 metadata 中可看到 deferred shadow payload', async () => {
    const response = await sendChat!({
      message: '开窗彩盒，规格21*17*31cm，400克单铜，印四色，过光胶，500个',
    })

    assert(response.status === 'estimated', '开窗彩盒 live 行为应继续保持 estimated')

    const metadata = await getLatestAssistantMetadata(response.conversationId)
    assert(Boolean(metadata?.complexPackagingShadow), 'assistant metadata 应附带 second-phase shadow payload')
    assert(metadata?.complexPackagingShadow?.deferred === true, 'deferred 结构应在 shadow payload 中标记')
    assert(metadata?.complexPackagingShadow?.shadowStatus === 'handoff_required', 'deferred 结构的 shadow 状态应为 handoff_required')
    assert(metadata?.complexPackagingShadow?.diffSummary?.enteredDeferredOrHandoff === true, '应显式记录 deferred/handoff 观察标记')
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