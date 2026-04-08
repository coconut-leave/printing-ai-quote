import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decideComplexPackagingQuotePath, extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { buildPricingAcceptanceGateEntries } from '@/server/pricing/pricingAcceptanceGateDraft'
import {
  PRICING_TRIAL_RELEASE_ENTRIES,
  PRICING_TRIAL_SCOPE_CANONICAL_DOC_PATH,
  PRICING_TRIAL_SCOPE_SUPERSEDED_RELEASE_DOCS,
  getPricingTrialReleaseEntries,
} from '@/server/pricing/pricingTrialReleaseGateDraft'

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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, error: message })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${message}`)
  }
}

function getDecision(message: string) {
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), `应能识别试运行 scope 样本: ${message}`)
  return decideComplexPackagingQuotePath(request!)
}

console.log('\n=== Trial Source-Of-Truth 回归测试 ===\n')

test('accepted quoted path 在 runtime 中应继续允许 quoted', () => {
  getPricingTrialReleaseEntries('allowed_quoted_in_trial').forEach((entry) => {
    const decision = getDecision(entry.representativeMessage)
    assert(decision.status === 'quoted', `${entry.label} 当前应继续 quoted`) 
  })
})

test('estimated-only path 在 runtime 中不应误升 quoted', () => {
  getPricingTrialReleaseEntries('estimated_only_in_trial').forEach((entry) => {
    const decision = getDecision(entry.representativeMessage)
    assert(decision.status === 'estimated', `${entry.label} 当前应继续 estimated`) 
  })
})

test('handoff-only path 在 runtime 中应继续 handoff_required', () => {
  const handoffEntries = getPricingTrialReleaseEntries('handoff_only_in_trial').filter((entry) => entry.id !== 'template_outside_scope')

  handoffEntries.forEach((entry) => {
    const decision = getDecision(entry.representativeMessage)
    assert(decision.status === 'handoff_required', `${entry.label} 当前应继续 handoff_required`) 
  })
})

test('source-of-truth 文档应覆盖结构化 draft 的关键口径', () => {
  const markdown = readFileSync(resolve(process.cwd(), PRICING_TRIAL_SCOPE_CANONICAL_DOC_PATH), 'utf8')

  PRICING_TRIAL_RELEASE_ENTRIES.forEach((entry) => {
    assert(markdown.includes(entry.label), `markdown 应覆盖 ${entry.label}`)
  })

  PRICING_TRIAL_SCOPE_SUPERSEDED_RELEASE_DOCS.forEach((path) => {
    assert(markdown.includes(path), `markdown 应标注 ${path} 已降级为 supporting doc`)
  })

  assert(markdown.includes('extended_main_plus_insert_quoted_candidate'), 'markdown 应覆盖第一步扩张的 quoted candidate 分类')
  assert(markdown.includes('extended_main_plus_insert_estimated_only'), 'markdown 应覆盖第一步扩张的 estimated-only 分类')
  assert(markdown.includes('extended_main_plus_insert_handoff_only'), 'markdown 应覆盖第一步扩张的 handoff-only 分类')
  assert(markdown.includes('multi_accessory_standard_bundle_quoted_candidate'), 'markdown 应覆盖本轮多配件 quoted candidate 分类')
  assert(markdown.includes('multi_accessory_standard_bundle_estimated_only'), 'markdown 应覆盖本轮多配件 estimated-only 分类')
  assert(markdown.includes('multi_accessory_standard_bundle_handoff_only'), 'markdown 应覆盖本轮多配件 handoff-only 分类')
})

test('acceptance gate 与结构化 source-of-truth 应一致', () => {
  const acceptanceGates = new Map(buildPricingAcceptanceGateEntries().map((entry) => [entry.gate_id, entry]))

  PRICING_TRIAL_RELEASE_ENTRIES.forEach((entry) => {
    entry.acceptanceGateIds.forEach((gateId) => {
      const gate = acceptanceGates.get(gateId)
      assert(Boolean(gate), `应存在 acceptance gate: ${gateId}`)
      assert(
        gate?.acceptance_status === 'accepted' || (gateId === 'window_box_no_film_estimated' && gate?.acceptance_status === 'guardrailed'),
        `${gateId} 当前应保持 accepted，或在 no-film 保守边界下保持 guardrailed`,
      )

      if (entry.runtimeExpectation === 'quoted') {
        assert(gate?.release_mode === 'quoted', `${gateId} 应与 quoted release 对齐`)
      }

      if (entry.runtimeExpectation === 'estimated') {
        assert(gate?.release_mode === 'estimated_only', `${gateId} 应与 estimated-only release 对齐`)
      }
    })
  })
})

test('标准双插盒 + 标准内托 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托应继续命中标准 quoted bundle gate')
})

test('标准双插盒 + 高频 generic 说明书单配件 bundle 应保持 estimated source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000')

  assert(decision.status === 'estimated', '标准双插盒 + 高频 generic 说明书当前应继续 estimated')
  assert(decision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', '标准双插盒 + 高频 generic 说明书应继续命中 estimated bundle gate')
})

test('标准双插盒 + 标准说明书 + 标准贴纸 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')

  assert(decision.status === 'quoted', '标准双插盒 + 标准说明书 + 标准贴纸当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + 标准贴纸应继续命中标准 quoted bundle gate')
})

test('标准双插盒 + 标准内托 + 标准说明书 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000')

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托 + 标准说明书当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准说明书应继续命中标准 quoted bundle gate')
})

test('标准双插盒 + 标准内托 + 标准贴纸 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')

  assert(decision.status === 'quoted', '标准双插盒 + 标准内托 + 标准贴纸当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准内托 + 标准贴纸应继续命中标准 quoted bundle gate')
})

test('标准双插盒 + 标准说明书 + simple carton quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；纸箱+包装费：42*42*35CM，5000套')

  assert(decision.status === 'quoted', '标准双插盒 + 标准说明书 + simple carton 当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '标准双插盒 + 标准说明书 + simple carton 应继续命中标准 quoted bundle gate')
})

test('已验证飞机盒 + 标准内托 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')

  assert(decision.status === 'quoted', '已验证飞机盒 + 标准内托当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 标准内托应继续命中标准 quoted bundle gate')
})

test('已验证飞机盒 + 高频 proxy 内托 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；内托：20*12CM左右，WEB特种纸板，5000')

  assert(decision.status === 'quoted', '已验证飞机盒 + 高频 proxy 内托当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 高频 proxy 内托应继续命中标准 quoted bundle gate')
})

test('已验证飞机盒 + 标准说明书 + 标准贴纸 quoted bundle 应保持 source-of-truth 对齐', () => {
  const decision = getDecision('飞机盒：20*12*6CM，300克白卡，四色印刷，5000个；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')

  assert(decision.status === 'quoted', '已验证飞机盒 + 标准说明书 + 标准贴纸当前应继续 quoted')
  assert(decision.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '已验证飞机盒 + 标准说明书 + 标准贴纸应继续命中标准 quoted bundle gate')
})

test('generic leaflet 参与的多配件 bundle 应继续 estimated', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：220x170mm，80g双胶纸，单面印，5000；透明贴纸：2.4*3CM 封口贴，透明贴纸 + 模切，5000')

  assert(decision.status === 'estimated', 'generic leaflet 参与的多配件 bundle 当前应继续 estimated')
  assert(decision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'generic leaflet 参与的多配件 bundle 应继续命中 estimated bundle gate')
})

test('proxy 内托参与的多配件 bundle 应继续 estimated', () => {
  const decision = getDecision('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；内托：20*12CM左右，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000')

  assert(decision.status === 'estimated', 'proxy 内托参与的多配件 bundle 当前应继续 estimated')
  assert(decision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'proxy 内托参与的多配件 bundle 应继续命中 estimated bundle gate')
})

test('window_box + 内托保守子集应继续 estimated', () => {
  const decision = getDecision('开窗彩盒，21*17*31cm，400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘，500；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，500')

  assert(decision.status === 'estimated', 'window_box + 标准内托当前应继续 estimated')
  assert(decision.trialBundleGateStatus === 'estimated_only_bundle_in_trial', 'window_box + 标准内托应继续命中 estimated bundle gate')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)

if (passed < total) {
  process.exit(1)
}