import { buildPackagingReviewSummary, buildPackagingReviewSummaryFromQuoteRecord } from '@/lib/packaging/reviewSummary'
import { decideComplexPackagingQuotePath, extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { calculateBundleQuote } from '@/server/pricing/complexPackagingQuote'

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

console.log('\n=== 复杂包装解释层回归测试 ===\n')

test('高风险开窗彩盒应输出结构化复核原因', () => {
  const request = extractComplexPackagingQuoteRequest('开窗彩盒，规格21*17*31cm，400克特种纸板，正反四色 + 3个专色，开窗贴0.35厚胶片 18*16CM，啤 + 粘，数量300')
  assert(Boolean(request), '应识别高复杂度开窗彩盒请求')

  const decision = decideComplexPackagingQuotePath(request!)
  const quoteResult = calculateBundleQuote(request!)
  const summary = buildPackagingReviewSummary({
    status: decision.status,
    decision,
    request: request!,
    quoteResult,
    referenceFiles: request!.referenceFiles,
    requiresHumanReview: quoteResult.requiresHumanReview,
  })

  assert(Boolean(summary), '应生成包装解释摘要')
  assert(summary?.status === 'estimated', '高风险开窗彩盒应保持 estimated')
  assert(summary?.lineItems.length === 1, '单品应只生成 1 个 line item')
  assert(summary?.reviewReasons.some((reason) => reason.code === 'low_quantity_box'), '应识别低数量盒型')
  assert(summary?.reviewReasons.some((reason) => reason.code === 'high_spot_color_count'), '应识别高专色数量')
  assert(summary?.reviewReasons.some((reason) => reason.code === 'thick_window_film'), '应识别厚胶片')
  assert(summary?.reviewReasons.some((reason) => reason.code === 'high_weight_specialty_board'), '应识别高克重特种纸板')
  assert((summary?.statusReasonText?.length || 0) > 0, '应给出状态原因说明')
})

test('trial gate 应把标准 quoted bundle 的中文原因和 gate 元数据带到解释层', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡 + 正反四色 + 啤 + 粘合，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000')
  assert(Boolean(request), '应识别标准 quoted bundle 请求')

  const decision = decideComplexPackagingQuotePath(request!)
  const quoteResult = calculateBundleQuote(request!)
  const summary = buildPackagingReviewSummary({
    status: decision.status,
    decision,
    request: request!,
    quoteResult,
    referenceFiles: request!.referenceFiles,
    requiresHumanReview: quoteResult.requiresHumanReview,
  })

  assert(summary?.status === 'quoted', '标准 quoted bundle 在解释层应仍为 quoted')
  assert(summary?.trialGateStatus === 'allowed_quoted_in_trial', '应保留 request-level trial gate')
  assert(summary?.trialBundleGateStatus === 'standard_quoted_bundle_in_trial', '应保留 bundle-level trial gate')
  assert(summary?.statusReasonText.includes('标准主盒 + 标准说明书'), '应输出可读中文 trial gate 原因')
})

test('组合报价记录可还原包装解释摘要', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡 + 正反四色 + 专色 + 正面过哑胶 + 啤 + 粘合，5000；内托：20*12CM，WEB特种纸板，5000；说明书：20*5CM，80克双铜纸 + 双面四色印 + 折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000')
  assert(Boolean(request), '应识别 bundle 请求')

  const decision = decideComplexPackagingQuotePath(request!)
  const quoteResult = calculateBundleQuote(request!)
  const packagingReview = buildPackagingReviewSummary({
    status: decision.status,
    decision,
    request: request!,
    quoteResult,
    referenceFiles: request!.referenceFiles,
    requiresHumanReview: quoteResult.requiresHumanReview,
  })

  const restored = buildPackagingReviewSummaryFromQuoteRecord({
    status: 'PENDING',
    parameters: {
      ...quoteResult.normalizedParams,
      mainItem: quoteResult.mainItem.normalizedParams,
      subItems: quoteResult.subItems.map((item) => item.normalizedParams),
      isBundle: quoteResult.isBundle,
      requiresHumanReview: quoteResult.requiresHumanReview,
    },
    pricingDetails: {
      unitPrice: quoteResult.unitPrice,
      totalUnitPrice: quoteResult.totalUnitPrice,
      totalPrice: quoteResult.totalPrice,
      shippingFee: quoteResult.shippingFee,
      tax: quoteResult.tax,
      finalPrice: quoteResult.finalPrice,
      notes: quoteResult.notes,
      items: quoteResult.items,
      referenceFiles: quoteResult.referenceFiles,
      packagingReview,
    },
  })

  assert(Boolean(restored), '报价记录应能还原包装解释摘要')
  assert(restored?.lineItems.length === 4, '应保留 4 个 bundle item')
  assert(restored?.includedComponents.length === 4, '应保留组合件列表')
  assert(restored?.mainItem?.itemType === 'tuck_end_box', '主件应保持为双插盒')
  assert(typeof restored?.finalPrice === 'number' && restored.finalPrice === quoteResult.finalPrice, '应保留最终价格')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}