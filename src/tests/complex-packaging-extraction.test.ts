import {
  decideComplexPackagingQuotePath,
  extractComplexPackagingQuoteRequest,
} from '@/server/packaging/extractComplexPackagingQuote'

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

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

console.log('\n=== 复杂包装抽取与缺参回归测试 ===\n')

test('飞机盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('防火风琴文件包飞机盒，规格365*270*53MM，展开53*52CM，300克牛纸 + A/E加强芯 + 印黑色 + 裱 + 啤，数量1000')
  assert(Boolean(request), '应识别飞机盒复杂包装请求')
  assert(request?.mainItem.productType === 'mailer_box', '主件应识别为飞机盒')
  assert(request?.mainItem.length === 365, '应识别长度 365')
  assert(request?.mainItem.width === 270, '应识别宽度 270')
  assert(request?.mainItem.height === 53, '应识别高度 53')
  assert(request?.mainItem.flatLength === 53, '应识别展开长 53')
  assert(request?.mainItem.flatWidth === 52, '应识别展开宽 52')
  assert(request?.mainItem.material === 'kraft', '应识别牛纸材质')
  assert(request?.mainItem.coreMaterialCode === 'AE', '应识别 A/E 加强芯代码')
  assert(request?.mainItem.printColor === 'black', '应识别黑色印刷')
})

test('双插盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('防火风琴文件包双插盒，规格365*270*53MM，展开52*68CM，300克牛纸 + A/E加强芯 + 印黑色 + 裱 + 啤，数量1000')
  assert(Boolean(request), '应识别双插盒复杂包装请求')
  assert(request?.mainItem.productType === 'tuck_end_box', '主件应识别为双插盒')
  assert(request?.mainItem.quantity === 1000, '应识别数量 1000')
  assert(request?.mainItem.flatLength === 52, '应识别双插盒展开长')
  assert(request?.mainItem.flatWidth === 68, '应识别双插盒展开宽')
})

test('开窗彩盒参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克单铜 + 印四色 + 表面过光胶 + 裱 + 开窗贴0.2厚胶片 23.5*14CM + 啤 + 粘，数量500')
  assert(Boolean(request), '应识别开窗彩盒请求')
  assert(request?.mainItem.productType === 'window_box', '应识别为开窗彩盒')
  assert(request?.mainItem.windowFilmThickness === 0.2, '应识别胶片厚度 0.2')
  assert(request?.mainItem.windowSizeLength === 23.5, '应识别窗长 23.5')
  assert(request?.mainItem.windowSizeWidth === 14, '应识别窗宽 14')
})

test('说明书参数抽取成功', () => {
  const request = extractComplexPackagingQuoteRequest('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(request), '应识别说明书请求')
  assert(request?.mainItem.productType === 'leaflet_insert', '应识别为说明书')
  assert(request?.mainItem.paperWeight === 80, '应识别纸张克重 80')
  assert(request?.mainItem.foldCount === 3, '应识别 3 折')
})

test('内托与贴纸别名参数抽取成功', () => {
  const insertRequest = extractComplexPackagingQuoteRequest('纸内托：20*12CM，500克白卡 + 啤，5000')
  assert(Boolean(insertRequest), '应识别纸内托请求')
  assert(insertRequest?.mainItem.productType === 'box_insert', '纸内托应识别为 box_insert')

  const stickerRequest = extractComplexPackagingQuoteRequest('镭射贴纸：3*3CM 封口贴，镭射贴纸 + 模切，5000')
  assert(Boolean(stickerRequest), '应识别镭射贴纸请求')
  assert(stickerRequest?.mainItem.productType === 'seal_sticker', '镭射贴纸应识别为 seal_sticker')
  assert(stickerRequest?.mainItem.stickerMaterial === 'laser_sticker', '应识别镭射贴纸材质')
})

test('镭射膜贴纸与 g 克重说明书样本抽取稳定', () => {
  const laserStickerRequest = extractComplexPackagingQuoteRequest('镭射膜贴纸：A4纸大小，正面彩色印刷，300')
  assert(Boolean(laserStickerRequest), '应识别镭射膜贴纸请求')
  assert(laserStickerRequest?.mainItem.productType === 'seal_sticker', '镭射膜贴纸应识别为 seal_sticker')
  assert(laserStickerRequest?.mainItem.stickerMaterial === 'laser_sticker', '应识别镭射膜贴纸材质')

  const leafletRequest = extractComplexPackagingQuoteRequest('说明书：220x170mm，80g双胶纸，单面印，6100')
  assert(Boolean(leafletRequest), '应识别真实说明书样本')
  assert(leafletRequest?.mainItem.paperWeight === 80, '应识别 80g 克重')
  assert(leafletRequest?.mainItem.paperType === 'offset_paper', '应识别双胶纸材质')
  assert(leafletRequest?.mainItem.printColor === 'generic_print', '应识别通用印刷信号')
  assert(decideComplexPackagingQuotePath(leafletRequest!).status === 'quoted', '高频通用印刷说明书应提升到 quoted candidate 而非 handoff')
})

test('完整开窗彩盒参数可进入 quoted', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，展开66*47CM，400克单铜，印四色，过光胶 + 裱，开窗贴0.2厚胶片 10*8CM，啤 + 粘，500个')
  assert(Boolean(request), '应识别完整开窗彩盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'quoted', '关键 line-items 齐全的开窗彩盒应允许 quoted')
})

test('Top3 window gloss 样本中的表面过光同义词应命中 glossy 路径', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500')
  assert(Boolean(request), '应识别 image gloss film 样本')
  assert(request?.mainItem.productType === 'window_box', '应继续识别为 window_box')
  assert(request?.mainItem.laminationType === 'glossy', '表面过光应识别为 glossy lamination')
  assert(request?.mainItem.mounting === true, '显式 裱 应继续保留 mounting 信号')
  assert(decideComplexPackagingQuotePath(request!).status === 'quoted', 'gloss film 样本关键项齐全时仍应 quoted')
})

test('第二批组件模板中只有 trial 放开的单品可进入 quoted', () => {
  const leaflet = extractComplexPackagingQuoteRequest('说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  const insert = extractComplexPackagingQuoteRequest('纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const sticker = extractComplexPackagingQuoteRequest('透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')

  assert(Boolean(leaflet) && decideComplexPackagingQuotePath(leaflet!).status === 'quoted', '说明书应允许 quoted')
  assert(Boolean(insert) && decideComplexPackagingQuotePath(insert!).status === 'quoted', '显式克重标准内托单品应允许 quoted')
  assert(Boolean(sticker) && decideComplexPackagingQuotePath(sticker!).status === 'quoted', '封口贴应允许 quoted')
})

test('内托 trial gate 应拆分标准 quoted / 高频 proxy quoted / handoff', () => {
  const standardInsert = extractComplexPackagingQuoteRequest('纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const proxyInsert = extractComplexPackagingQuoteRequest('内托：20*12CM左右，WEB特种纸板，5000')
  const complexInsert = extractComplexPackagingQuoteRequest('内托：20*12CM，EVA内托，5000')

  assert(Boolean(standardInsert), '应识别标准内托请求')
  const standardDecision = decideComplexPackagingQuotePath(standardInsert!)
  assert(standardDecision.status === 'quoted', '显式克重标准内托应允许 quoted')
  assert(standardDecision.trialGateStatus === 'allowed_quoted_in_trial', '显式克重标准内托应命中 allowed_quoted_in_trial')

  assert(Boolean(proxyInsert), '应识别 proxy 内托请求')
  const proxyDecision = decideComplexPackagingQuotePath(proxyInsert!)
  assert(proxyDecision.status === 'quoted', '高频 proxy 内托应提升到 quoted')
  assert(proxyDecision.trialGateStatus === 'allowed_quoted_in_trial', '高频 proxy 内托应命中 allowed_quoted_in_trial')

  assert(Boolean(complexInsert), '应识别复杂内托请求')
  const complexDecision = decideComplexPackagingQuotePath(complexInsert!)
  assert(complexDecision.status === 'handoff_required', '复杂内托应继续 handoff_required')
  assert(complexDecision.trialGateStatus === 'handoff_only_in_trial', '复杂内托应命中 handoff_only_in_trial')
})

test('2.5 批铝箔袋与纸箱包装模板可稳定识别', () => {
  const foilBag = extractComplexPackagingQuoteRequest('铝铂袋：12.5*12.5CM，8丝空白铝铂袋，10000个')
  assert(Boolean(foilBag), '应识别铝箔袋请求')
  assert(foilBag?.mainItem.productType === 'foil_bag', '应识别为 foil_bag')
  assert(foilBag?.mainItem.length === 12.5, '应识别铝箔袋长度')
  assert(foilBag?.mainItem.width === 12.5, '应识别铝箔袋宽度')
  assert(foilBag?.mainItem.material === 'foil_bag', '应识别铝箔袋材质')
  assert(decideComplexPackagingQuotePath(foilBag!).status === 'quoted', '空白铝箔袋样本应允许 quoted')

  const carton = extractComplexPackagingQuoteRequest('纸箱+包装费：42*42*35CM，10000套')
  assert(Boolean(carton), '应识别纸箱包装请求')
  assert(carton?.mainItem.productType === 'carton_packaging', '应识别为 carton_packaging')
  assert(carton?.mainItem.length === 42, '应识别纸箱长度')
  assert(carton?.mainItem.width === 42, '应识别纸箱宽度')
  assert(carton?.mainItem.height === 35, '应识别纸箱高度')
  assert(decideComplexPackagingQuotePath(carton!).status === 'quoted', '纸箱+包装费样本应允许 quoted')
})

test('2.5 批标准定制印刷铝箔袋单品可进入窄白名单 quoted，保守与高复杂路径仍继续收紧', () => {
  const standardPrintedFoilBag = extractComplexPackagingQuoteRequest('铝箔袋：12.5*12.5CM，8丝铝箔袋，单面四色印刷，10000个')
  assert(Boolean(standardPrintedFoilBag), '应识别标准定制印刷铝箔袋请求')
  const standardPrintedDecision = decideComplexPackagingQuotePath(standardPrintedFoilBag!)
  assert(standardPrintedDecision.status === 'quoted', '标准 8 丝单面四色铝箔袋单品应允许 quoted')
  assert(standardPrintedDecision.trialGateStatus === 'allowed_quoted_in_trial', '标准 8 丝单面四色铝箔袋单品应命中 allowed_quoted_in_trial')

  const printedFoilBag = extractComplexPackagingQuoteRequest('铝箔袋：12.5*12.5CM，8丝铝箔袋，单面印，10000个')
  assert(Boolean(printedFoilBag), '应识别保守定制印刷铝箔袋请求')
  assert(decideComplexPackagingQuotePath(printedFoilBag!).status === 'estimated', '缺少明确印色的 printed/custom foil bag 应保持 estimated')

  const missingGaugeFoilBag = extractComplexPackagingQuoteRequest('铝箔袋：12.5*12.5CM，铝箔袋，单面四色印刷，10000个')
  assert(Boolean(missingGaugeFoilBag), '应识别缺少厚度的印刷铝箔袋请求')
  assert(decideComplexPackagingQuotePath(missingGaugeFoilBag!).status === 'estimated', '厚度未明确的印刷铝箔袋应保持 estimated')

  const complexPrintedFoilBag = extractComplexPackagingQuoteRequest('铝箔袋：12.5*12.5CM，8丝拉链铝箔袋，单面四色印刷，10000个')
  assert(Boolean(complexPrintedFoilBag), '应识别高复杂 printed foil bag 请求')
  assert(decideComplexPackagingQuotePath(complexPrintedFoilBag!).status === 'handoff_required', '带特殊袋型要素的 printed foil bag 应继续 handoff_required')
})

test('2.5 批标准 printed carton 单品可进入窄白名单 quoted，保守与高复杂路径仍继续收紧', () => {
  const standardPrintedCarton = extractComplexPackagingQuoteRequest('大外箱：42*42*35CM，K636K空白箱，单面四色印刷，啤，10000个')
  assert(Boolean(standardPrintedCarton), '应识别标准 printed carton 请求')
  const standardPrintedCartonDecision = decideComplexPackagingQuotePath(standardPrintedCarton!)
  assert(standardPrintedCartonDecision.status === 'quoted', '标准 K636K 单面四色大外箱单品应允许 quoted')
  assert(standardPrintedCartonDecision.trialGateStatus === 'allowed_quoted_in_trial', '标准 K636K 单面四色大外箱单品应命中 allowed_quoted_in_trial')

  const missingKeyPrintedCarton = extractComplexPackagingQuoteRequest('大外箱：42*42*35CM，单面四色印刷，10000个')
  assert(Boolean(missingKeyPrintedCarton), '应识别缺少材质的 printed carton 请求')
  assert(decideComplexPackagingQuotePath(missingKeyPrintedCarton!).status === 'estimated', '缺少材质信号的 printed carton 应保持 estimated')

  const widerPrintedCarton = extractComplexPackagingQuoteRequest('大外箱：44*24.5*22.5CM，K636K空白箱，四色印刷，160个')
  assert(Boolean(widerPrintedCarton), '应识别更宽 printed carton 请求')
  assert(decideComplexPackagingQuotePath(widerPrintedCarton!).status === 'estimated', '未进入标准 K636K 单面四色大外箱白名单的 printed carton 应保持 estimated')

  const complexPrintedCarton = extractComplexPackagingQuoteRequest('大外箱：42*42*35CM，蜂窝箱，单面四色印刷，10000个')
  assert(Boolean(complexPrintedCarton), '应识别高复杂 printed carton 请求')
  assert(decideComplexPackagingQuotePath(complexPrintedCarton!).status === 'handoff_required', '高复杂 printed carton 应继续 handoff_required')
})

test('第三批主盒 bundle 文本中的共享数量应继续保留在主盒上', () => {
  const request = extractComplexPackagingQuoteRequest('挂钩彩盒，92x28x92mm，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+粘 配内卡*1，5000')
  assert(Boolean(request), '应识别挂钩彩盒 + 配内卡请求')
  assert(request?.isBundle === true, '挂钩彩盒 + 配内卡应识别为 bundle')
  assert(request?.mainItem.productType === 'window_box', '主件仍应识别为 window_box')
  assert(request?.mainItem.quantity === 5000, '共享数量不应只落到配件上')
  assert(request?.subItems[0]?.productType === 'box_insert', '应识别 companion 内卡')
  assert(request?.subItems[0]?.quantity === 5000, 'companion 内卡应保留数量 5000')
})

test('第三批开窗不贴胶片样本应从 handoff 收紧到 estimated', () => {
  const request = extractComplexPackagingQuoteRequest('双插开窗盒，110x120x95mm，纸板+开窗不贴胶片+啤成品+粘盒，2000')
  assert(Boolean(request), '应识别开窗不贴胶片样本')
  assert(request?.mainItem.productType === 'window_box', '开窗双插盒应落到 window_box')
  assert(decideComplexPackagingQuotePath(request!).status !== 'handoff_required', '开窗不贴胶片不应再被直接推到 handoff')
})

test('标准 glossy no-film window 单品在当前 trial gate 下可进入 quoted', () => {
  const request = extractComplexPackagingQuoteRequest('双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，啤成品+粘盒，2000')
  assert(Boolean(request), '应识别标准 glossy no-film window 样本')
  const decision = decideComplexPackagingQuotePath(request!)

  assert(decision.status === 'quoted', '标准 glossy no-film window 单品应允许 quoted')
  assert(decision.trialGateStatus === 'allowed_quoted_in_trial', '标准 glossy no-film window 单品应命中 allowed_quoted_in_trial')
})

test('开窗参数不完整时不允许 quoted', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克单铜，印四色，过光胶，500个')
  assert(Boolean(request), '应识别开窗彩盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status !== 'quoted', '窗口关键 line-item 不完整时不能 quoted')
})

test('trial gate 应放开已验证的两配件标准 bundle quoted，并保留 generic / proxy / 更宽多配件 bundle estimated', () => {
  const completeBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(completeBundle), '应识别完整 bundle')
  const completeDecision = decideComplexPackagingQuotePath(completeBundle!)
  assert(completeDecision.status === 'quoted', '标准双插盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
  assert(completeDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '最简单双标准配件 bundle 应命中标准 quoted bundle gate')

  const insertLeafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(insertLeafletBundle), '应识别主件 + 标准内托 + 标准说明书 bundle')
  const insertLeafletDecision = decideComplexPackagingQuotePath(insertLeafletBundle!)
  assert(insertLeafletDecision.status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书 bundle 应允许 quoted')
  assert(insertLeafletDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准说明书应命中标准 quoted bundle gate')

  const insertStickerBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(insertStickerBundle), '应识别主件 + 标准内托 + 标准贴纸 bundle')
  const insertStickerDecision = decideComplexPackagingQuotePath(insertStickerBundle!)
  assert(insertStickerDecision.status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸 bundle 应允许 quoted')
  assert(insertStickerDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准贴纸应命中标准 quoted bundle gate')

  const leafletCartonBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；纸箱+包装费：42*42*35CM，5000套')
  assert(Boolean(leafletCartonBundle), '应识别主件 + 标准说明书 + simple carton bundle')
  const leafletCartonDecision = decideComplexPackagingQuotePath(leafletCartonBundle!)
  assert(leafletCartonDecision.status === 'quoted', '标准双插盒 + 标准说明书 + simple carton bundle 应允许 quoted')
  assert(leafletCartonDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + simple carton 应命中标准 quoted bundle gate')

  const mailerLeafletStickerBundle = extractComplexPackagingQuoteRequest('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(mailerLeafletStickerBundle), '应识别已验证飞机盒 + 标准说明书 + 标准贴纸 bundle')
  const mailerLeafletStickerDecision = decideComplexPackagingQuotePath(mailerLeafletStickerBundle!)
  assert(mailerLeafletStickerDecision.status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸 bundle 应允许 quoted')
  assert(mailerLeafletStickerDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 标准说明书 + 标准贴纸应命中标准 quoted bundle gate')

  const fullBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000；纸箱+包装费：42*42*35CM，5000套')
  assert(Boolean(fullBundle), '应识别更宽的三配件 bundle')
  const fullBundleDecision = decideComplexPackagingQuotePath(fullBundle!)
  assert(fullBundleDecision.status === 'estimated', '更宽的三配件 bundle 仍应保持 estimated')
  assert(fullBundleDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '更宽的三配件 bundle 应命中 estimated-only bundle gate')

  const printedCartonBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；大外箱：42*42*35CM，K636K空白箱，单面四色印刷，啤，10000个')
  assert(Boolean(printedCartonBundle), '应识别带 printed carton 的 bundle')
  const printedCartonBundleDecision = decideComplexPackagingQuotePath(printedCartonBundle!)
  assert(printedCartonBundleDecision.status === 'estimated', 'printed carton bundle 仍应保持 estimated')
  assert(printedCartonBundleDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'printed carton bundle 应继续命中 estimated-only bundle gate')

  const leafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(leafletBundle), '应识别主件 + 说明书 bundle')
  const leafletDecision = decideComplexPackagingQuotePath(leafletBundle!)
  assert(leafletDecision.status === 'quoted', '标准主件 + 标准说明书 bundle 应允许 quoted')
  assert(leafletDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + 说明书应命中标准 quoted bundle gate')

  const stickerBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(stickerBundle), '应识别主件 + 贴纸 bundle')
  const stickerDecision = decideComplexPackagingQuotePath(stickerBundle!)
  assert(stickerDecision.status === 'quoted', '标准主件 + 标准贴纸 bundle 应允许 quoted')
  assert(stickerDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + 贴纸应命中标准 quoted bundle gate')

  const orderReadyBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸箱+包装费：42*42*35CM，5000套')
  assert(Boolean(orderReadyBundle), '应识别带 carton packaging 的 order-ready bundle')
  const orderReadyDecision = decideComplexPackagingQuotePath(orderReadyBundle!)
  assert(orderReadyDecision.status === 'quoted', '标准主件 + simple carton bundle 应允许 quoted')
  assert(orderReadyDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '主件 + simple carton 应命中标准 quoted bundle gate')

  const standardInsertBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  assert(Boolean(standardInsertBundle), '应识别标准主件 + 标准内托 bundle')
  const standardInsertDecision = decideComplexPackagingQuotePath(standardInsertBundle!)
  assert(standardInsertDecision.status === 'quoted', '标准双插盒 + 标准内托 bundle 应允许 quoted')
  assert(standardInsertDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托应命中标准 quoted bundle gate')

  const insertBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；内托：20*12CM左右，WEB特种纸板，5000')
  assert(Boolean(insertBundle), '应识别主件 + 高频 proxy 内托 bundle')
  const insertDecision = decideComplexPackagingQuotePath(insertBundle!)
  assert(insertDecision.status === 'quoted', '标准双插盒 + 高频 proxy 内托 bundle 应提升到 quoted')
  assert(insertDecision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 高频 proxy 内托应命中标准 quoted bundle gate')

  const handoffInsertBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；内托：20*12CM，EVA内托，5000')
  assert(Boolean(handoffInsertBundle), '应识别主件 + handoff 内托 bundle')
  const handoffInsertDecision = decideComplexPackagingQuotePath(handoffInsertBundle!)
  assert(handoffInsertDecision.status === 'handoff_required', '主件 + handoff-only 内托 bundle 应继续 handoff')
  assert(handoffInsertDecision.trialBundleGateStatus === 'handoff_only_bundle_in_trial', '主件 + handoff-only 内托应命中 handoff bundle gate')

  const incompleteBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(incompleteBundle), '应识别缺参 bundle')
  assert(decideComplexPackagingQuotePath(incompleteBundle!).status !== 'quoted', '只要关键组件缺参，bundle 就不能 quoted')

  const genericLeafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：220x170mm，80g双胶纸，单面印，6100')
  assert(Boolean(genericLeafletBundle), '应识别 generic leaflet bundle')
  const genericLeafletDecision = decideComplexPackagingQuotePath(genericLeafletBundle!)
  assert(genericLeafletDecision.status === 'estimated', '标准双插盒 + 高频 generic leaflet 单配件 bundle 应继续保持 estimated')
  assert(genericLeafletDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '标准双插盒 + 高频 generic leaflet 单配件 bundle 应命中 estimated-only bundle gate')

  const genericLeafletStickerBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')
  assert(Boolean(genericLeafletStickerBundle), '应识别 generic leaflet + 贴纸多配件 bundle')
  const genericLeafletStickerDecision = decideComplexPackagingQuotePath(genericLeafletStickerBundle!)
  assert(genericLeafletStickerDecision.status === 'estimated', 'generic leaflet 参与的多配件 bundle 仍应保持 estimated')
  assert(genericLeafletStickerDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'generic leaflet 参与的多配件 bundle 应命中 estimated-only bundle gate')

  const proxyInsertLeafletBundle = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，展开26*16CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(proxyInsertLeafletBundle), '应识别 proxy 内托 + 说明书多配件 bundle')
  const proxyInsertLeafletDecision = decideComplexPackagingQuotePath(proxyInsertLeafletBundle!)
  assert(proxyInsertLeafletDecision.status === 'estimated', 'proxy 内托参与的多配件 bundle 仍应保持 estimated')
  assert(proxyInsertLeafletDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'proxy 内托参与的多配件 bundle 应命中 estimated-only bundle gate')

  const noFilmWindowBundle = extractComplexPackagingQuoteRequest('双插开窗盒：110x120x95mm，300克白卡，印黑色，开窗不贴胶片，啤成品+粘盒，2000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，2000')
  assert(Boolean(noFilmWindowBundle), '应识别 no-film window bundle')
  const noFilmWindowDecision = decideComplexPackagingQuotePath(noFilmWindowBundle!)
  assert(noFilmWindowDecision.status === 'estimated', 'no-film window bundle 仍应保持 estimated')
  assert(noFilmWindowDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'no-film window bundle 应命中 estimated-only bundle gate')

  const glossyNoFilmWindowBundle = extractComplexPackagingQuoteRequest('双插开窗盒：110x120x95mm，300克白卡，印黑色，过光胶，开窗不贴胶片，啤成品+粘盒，2000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，2000')
  assert(Boolean(glossyNoFilmWindowBundle), '应识别 glossy no-film window bundle')
  const glossyNoFilmWindowDecision = decideComplexPackagingQuotePath(glossyNoFilmWindowBundle!)
  assert(glossyNoFilmWindowDecision.status === 'estimated', 'glossy no-film window bundle 不应随单品一并放开 quoted')
  assert(glossyNoFilmWindowDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'glossy no-film window bundle 应继续命中 estimated-only bundle gate')

  const printedFoilBagBundle = extractComplexPackagingQuoteRequest('铝箔袋：12.5*12.5CM，8丝铝箔袋，单面四色印刷，10000个；纸箱+包装费：42*42*35CM，10000套')
  assert(Boolean(printedFoilBagBundle), '应识别 printed foil bag bundle')
  const printedFoilBagDecision = decideComplexPackagingQuotePath(printedFoilBagBundle!)
  assert(printedFoilBagDecision.status === 'estimated', 'printed/custom foil_bag bundle 仍应保持 estimated')
  assert(printedFoilBagDecision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'printed/custom foil_bag bundle 应命中 estimated-only bundle gate')
})

test('带 PDF 参考文件时可引用 sample files 且不会阻塞复杂包装识别', () => {
  const request = extractComplexPackagingQuoteRequest('我上传了 Battery USB-C color box 的 PDF 设计文件，双插盒：7*5*5CM，350克白卡，正反四色 + 专色，5000')
  assert(Boolean(request), '应识别复杂包装请求')
  assert(request?.hasReferenceFile === true, '应识别参考文件信号')
  assert((request?.referenceFiles.length || 0) > 0, '应附带 sample files 元信息')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'handoff_required', '有文件参考的 trial scope 路径应转人工兜底')
  assert(decision.trialGateStatus === 'handoff_only_in_trial', '文件型路径应命中 handoff-only trial gate')
})

test('高不确定性的开窗彩盒即使参数齐全也应进入 estimated', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克特种纸板，正反四色 + 3个专色，开窗贴0.35厚胶片 18*16CM，啤 + 粘，数量300')
  assert(Boolean(request), '应识别高复杂度开窗彩盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'estimated', '高复杂度开窗彩盒不应强行进入 quoted')
})

test('明确的阻塞坑型术语应直接 handoff_required', () => {
  const request = extractComplexPackagingQuoteRequest('飞机盒，20*12*6CM，300克白卡+Q9坑，四色，裱+啤，1000')
  assert(Boolean(request), '应识别飞机盒请求')
  const decision = decideComplexPackagingQuotePath(request!)
  assert(decision.status === 'handoff_required', '未知阻塞坑型不应继续 quoted/estimated')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}