import { buildTrialReviewObservation } from '@/server/trialReviews/observation'
import { buildPackagingReviewSummary } from '@/lib/packaging/reviewSummary'
import { decideComplexPackagingQuotePath, extractComplexPackagingQuoteRequest } from '@/server/packaging/extractComplexPackagingQuote'
import { buildPricingAcceptanceGateEntries } from '@/server/pricing/pricingAcceptanceGateDraft'
import { getPricingTrialReleaseEntries } from '@/server/pricing/pricingTrialReleaseGateDraft'

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

function buildObservationForMessage(message: string) {
  const request = extractComplexPackagingQuoteRequest(message)
  assert(Boolean(request), `应能识别样本消息: ${message}`)
  const decision = decideComplexPackagingQuotePath(request!)
  const summary = buildPackagingReviewSummary({
    status: decision.status,
    decision,
    request,
    requiresHumanReview: decision.status === 'handoff_required',
  })

  return buildTrialReviewObservation({
    isActiveScope: true,
    packagingSummary: summary,
    currentQuoteStatusLabel: decision.status === 'quoted' ? '正式报价' : decision.status === 'estimated' ? '参考报价' : decision.status === 'handoff_required' ? '转人工' : '待补参数',
    deliveryScopeLabel: decision.status === 'quoted' ? '试运行正式报价范围' : decision.status === 'estimated' ? '试运行参考报价范围' : '人工处理范围',
    deliveryScopeNote: summary?.statusReasonText || null,
    queueReason: summary?.statusReasonText || null,
    recommendedAction: decision.status === 'quoted' ? '可继续按正式报价观察。' : decision.status === 'estimated' ? '建议先保留参考报价。' : '建议人工继续处理。',
    requiresHumanReview: decision.status === 'handoff_required',
    reflections: [],
    reviewStatusLabel: '待复核',
    operatorName: null,
    lastActionNote: null,
    manualConfirmationResult: null,
    rejectionReason: null,
    rejectionTargetArea: null,
    calibrationSignal: null,
    driftSourceCandidate: null,
    driftDirection: null,
    manualConfirmedAt: null,
  })
}

console.log('\n=== Trial Review Observation 面板回归测试 ===\n')

test('quoted / estimated / handoff 状态应展示正确中文业务结论', () => {
  const quoted = buildObservationForMessage('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色 + 啤 + 粘合，5000')
  const estimated = buildObservationForMessage('双插开窗盒：110x120x95mm，300克白卡，印黑色，开窗不贴胶片，啤成品+粘盒，2000')
  const handoff = buildObservationForMessage('双插盒，7*5*5CM，350克白卡，5000个，我有 PDF 设计稿')

  assert(quoted.overviewCards[0].value === '当前可正式报价', 'quoted 路径应显示“当前可正式报价”')
  assert(estimated.overviewCards[0].value === '当前仅参考报价', 'estimated 路径应显示“当前仅参考报价”')
  assert(handoff.overviewCards[0].value === '当前需人工确认', 'handoff 路径应显示“当前需人工确认”')
})

test('trial scope 内 / 外展示应正确', () => {
  const outside = buildTrialReviewObservation({
    isActiveScope: false,
    packagingSummary: null,
    currentQuoteStatusLabel: '正式报价',
    deliveryScopeLabel: '标准产品正式报价',
    deliveryScopeNote: '当前为历史简单品类路径。',
    queueReason: '历史简单品类不纳入当前 trial 自动报价观察范围。',
    recommendedAction: '仅保留历史观察。',
    requiresHumanReview: false,
    reflections: [],
    reviewStatusLabel: '待复核',
    operatorName: null,
    lastActionNote: null,
    manualConfirmationResult: null,
    rejectionReason: null,
    rejectionTargetArea: null,
    calibrationSignal: null,
    driftSourceCandidate: null,
    driftDirection: null,
    manualConfirmedAt: null,
  })
  const inside = buildObservationForMessage('双插盒：7*5*5CM，展开26*16CM，350克白卡，正反四色 + 啤 + 粘合，5000')

  assert(outside.overviewCards[1].value === '当前不在试运行范围内', 'scope 外应明确显示不在试运行范围内')
  assert(inside.overviewCards[1].value === '当前在试运行自动报价范围内', 'scope 内 quoted path 应显示在自动报价范围内')
})

test('accepted / non-accepted bundle 状态应展示正确', () => {
  const acceptedBundle = buildObservationForMessage('双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；纸内托：20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000')
  const rejectedBundle = buildObservationForMessage('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000；纸箱+包装费：42*42*35CM，5000套')

  assert(acceptedBundle.overviewCards[3].value === '当前组合已进入正式报价范围', 'accepted bundle 应显示已进入正式报价范围')
  assert(rejectedBundle.overviewCards[3].value === '当前组合仅可参考报价', '非 accepted bundle 应明确显示当前只可参考报价')
})

test('面板文案应保持中文业务化，不暴露内部枚举', () => {
  const observation = buildObservationForMessage('双插开窗盒：110x120x95mm，300克白卡，印黑色，开窗不贴胶片，啤成品+粘盒，2000')
  const text = JSON.stringify(observation)

  assert(text.includes('当前仅参考报价'), '应输出中文业务化状态')
  assert(text.includes('当前不在试运行自动正式报价范围内'), '应输出中文业务化 trial scope 说明')
  assert(text.includes('单项参考报价路径'), '应输出中文业务化路径名称')
  assert(!text.includes('estimated_only_in_trial'), '不应暴露内部 trial gate 枚举')
  assert(!text.includes('standard_quoted_bundle_in_trial'), '不应暴露内部 bundle gate 枚举')
  assert(!text.includes('accepted quoted bundle'), '不应暴露英文 bundle 术语')
  assert(!text.includes('estimated-only path'), '不应暴露英文 path 术语')
})

test('观察面板应与 runtime gate / acceptance gate 保持一致', () => {
  const acceptanceGates = new Map(buildPricingAcceptanceGateEntries().map((entry) => [entry.gate_id, entry]))
  const quoted = buildObservationForMessage(getPricingTrialReleaseEntries('allowed_quoted_in_trial')[0].representativeMessage)
  const estimated = buildObservationForMessage(getPricingTrialReleaseEntries('estimated_only_in_trial').find((entry) => entry.acceptanceGateIds.length > 0)?.representativeMessage || '')
  const handoff = buildObservationForMessage(getPricingTrialReleaseEntries('handoff_only_in_trial').find((entry) => entry.id !== 'template_outside_scope')?.representativeMessage || '')

  assert(quoted.consistencySection.bucketLabel === '试运行正式报价口径', 'quoted path 应保持正式报价 bucket')
  assert(quoted.consistencySection.acceptanceAligned === true, 'quoted path 对应 acceptance gate 应保持 accepted')
  assert(estimated.consistencySection.bucketLabel === '试运行参考报价口径', 'estimated path 应保持参考报价 bucket')
  assert(handoff.consistencySection.bucketLabel === '试运行人工处理口径', 'handoff path 应保持人工处理 bucket')
  assert(Array.from(acceptanceGates.values()).some((entry) => entry.release_mode === 'quoted' && entry.acceptance_status === 'accepted'), '仓库 acceptance gate 基线应存在 accepted quoted gate')
})

test('反馈区应接上人工确认与业务反馈留痕', () => {
  const request = extractComplexPackagingQuoteRequest('双插盒：7*5*5CM，350克白卡，正反四色，5000个；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000')
  assert(Boolean(request), '应能识别反馈区测试样本')
  const decision = decideComplexPackagingQuotePath(request!)
  const summary = buildPackagingReviewSummary({
    status: decision.status,
    decision,
    request: request!,
    requiresHumanReview: true,
  })

  const observation = buildTrialReviewObservation({
    isActiveScope: true,
    packagingSummary: summary,
    currentQuoteStatusLabel: '参考报价',
    deliveryScopeLabel: '试运行参考报价范围',
    deliveryScopeNote: summary?.statusReasonText || null,
    queueReason: '当前组合先保留参考报价。',
    recommendedAction: '请人工确认后再决定是否对外。',
    requiresHumanReview: true,
    reflections: [
      {
        id: 1,
        issueType: 'PACKAGING_REVIEW_REASON_WRONG',
        status: 'REVIEWED',
        correctedParams: {
          businessFeedback: {
            problemSummary: '业务希望先按参考报价继续跟进。',
            correctHandling: '应给参考报价',
            correctResult: '先保留参考报价并提示客户待人工确认。',
            shouldHandoff: 'no',
            notes: '客户已接受先看参考价。',
          },
        },
        correctedQuoteSummary: '先保留参考报价并提示客户待人工确认。',
        createdAt: '2026-04-07T10:00:00.000Z',
      },
    ],
    reviewStatusLabel: '已人工确认',
    operatorName: '销售A',
    lastActionNote: '已电话确认，先按参考价继续跟进。',
    manualConfirmationResult: 'REJECTED_QUOTED_RESULT',
    rejectionReason: '客户反馈当前正式报价偏高。',
    rejectionTargetArea: '主盒路径',
    calibrationSignal: 'QUOTE_TOO_HIGH',
    driftSourceCandidate: 'bundle_main_box_path',
    driftDirection: 'HIGH',
    manualConfirmedAt: '2026-04-07T12:30:00.000Z',
  })

  const factMap = new Map(observation.feedbackSection.facts.map((item) => [item.label, item.value]))

  assert(observation.feedbackSection.summary.includes('已有复核或反馈留痕'), '反馈区 summary 应反映已存在人工留痕')
  assert((factMap.get('业务反馈') || '').includes('正确处理：应给参考报价'), '反馈区应展示业务反馈摘要')
  assert(factMap.get('当前复核状态') === '已人工确认', '反馈区应展示当前复核状态')
  assert(factMap.get('当前处理人') === '销售A', '反馈区应展示当前处理人')
  assert((factMap.get('人工确认时间') || '').length > 0, '反馈区应展示人工确认时间')
  assert((factMap.get('最近处理备注') || '').includes('先按参考价继续跟进'), '反馈区应展示最近处理备注')
  assert(factMap.get('人工确认结论') === '正式报价已被打回', '反馈区应展示结构化人工确认结论')
  assert((factMap.get('打回原因') || '').includes('偏高'), '反馈区应展示打回原因')
  assert(factMap.get('打回目标区段') === '主盒路径', '反馈区应展示打回目标区段')
  assert(factMap.get('Calibration 信号') === '系统正式报价连续偏高', '反馈区应展示 calibration 信号')
  assert(factMap.get('疑似漂移源') === 'bundle_main_box_path', '反馈区应展示疑似漂移源')
  assert(factMap.get('同向漂移方向') === '同向偏高', '反馈区应展示同向漂移方向')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
console.log(`总计: ${passed}/${results.length} 通过`)

if (passed !== results.length) {
  process.exit(1)
}