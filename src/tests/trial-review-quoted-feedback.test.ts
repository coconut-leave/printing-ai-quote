import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

import {
  buildQuotedFeedbackContextSnapshot,
  buildQuotedFeedbackStructuredFields,
} from '@/lib/trialReviews/quotedFeedbackQuickEntry'
import { buildWeeklyTrialDriftReview } from '@/server/trialReviews/weeklyDriftReview'

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

function test(name: string, fn: () => void | Promise<void>) {
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

console.log('\n=== quoted 打回快捷登记与周归档测试 ===\n')

async function main() {
  await test('快捷登记应自动带入当前路径、组合类型和价格偏高信号', () => {
    const contextSnapshot = buildQuotedFeedbackContextSnapshot({
      conversationId: 101,
      quoteId: 202,
      currentQuoteStatusLabel: '正式报价',
      deliveryScopeLabel: '试运行正式报价范围',
      isActiveScope: true,
      packagingSummary: {
        status: 'quoted',
        statusLabel: '正式报价',
        statusReasonText: '当前路径属于试运行正式报价范围。',
        conciseExplanation: '当前可以按正式报价继续推进。',
        reviewFlags: [],
        reviewReasons: [],
        missingDetails: [],
        lineItems: [
          {
            itemType: 'mailer_box',
            title: '飞机盒',
            quantity: 3000,
            chargeQuantity: 3000,
            normalizedSpecSummary: '飞机盒 / 20×12×6cm',
            materialWeightSummary: '白卡 / 300g',
            printColorSummary: '四色',
            processSummary: '基础工序',
            setupCost: 120,
            runCost: 880,
            costSubtotal: 1000,
            unitPrice: 0.56,
            lineTotal: 1680,
            requiresHumanReview: false,
          },
        ],
        mainItem: {
          title: '飞机盒',
        },
        subItems: [
          { title: '说明书' },
        ],
        requiresHumanReview: false,
      } as any,
      fallbackTitle: '会话 101',
    })

    const structuredFields = buildQuotedFeedbackStructuredFields({
      contextSnapshot,
      rejectionCategory: 'price_too_high',
      targetArea: 'carton_packaging',
      manualFollowupRequired: false,
    })

    assert(contextSnapshot.currentPathLabel === '飞机盒', '应自动带入主路径标题')
    assert(contextSnapshot.bundleTypeLabel === '主件 + 说明书', '应自动带入组合类型')
    assert(structuredFields.status === 'CLOSED', '无需人工跟进时应直接关闭')
    assert(structuredFields.calibrationSignal === 'QUOTE_TOO_HIGH', '价格偏高应自动映射为偏高信号')
    assert(structuredFields.driftDirection === 'HIGH', '价格偏高应自动映射为高向漂移')
    assert(structuredFields.driftSourceCandidate === 'carton_outer_carton_rate', '外箱包装应自动映射为对应 drift source')
  })

  await test('业务表达问题不应误触发价格漂移，转人工时状态应切到 HANDOFF_TO_HUMAN', () => {
    const contextSnapshot = buildQuotedFeedbackContextSnapshot({
      conversationId: 102,
      quoteId: null,
      currentQuoteStatusLabel: '正式报价',
      deliveryScopeLabel: '试运行正式报价范围',
      isActiveScope: false,
      fallbackTitle: '开窗彩盒',
    })

    const structuredFields = buildQuotedFeedbackStructuredFields({
      contextSnapshot,
      rejectionCategory: 'business_wording_issue',
      targetArea: 'unknown',
      manualFollowupRequired: true,
    })

    assert(structuredFields.status === 'HANDOFF_TO_HUMAN', '要求人工继续跟进时应直接切换到 HANDOFF_TO_HUMAN')
    assert(structuredFields.requiresHumanReview === true, '应保留人工跟进标记')
    assert(structuredFields.calibrationSignal === 'NO_SYSTEM_DRIFT', '业务表达问题不应误判为价格漂移')
    assert(structuredFields.driftDirection === null, '业务表达问题不应产生方向性漂移')
    assert(structuredFields.contextSnapshot.isActiveScope === false, '应保留当前范围内/外上下文')
  })

  await test('周归档应按周聚合并保持严格连续同源同向 stop rule', () => {
    const review = buildWeeklyTrialDriftReview([
      {
        createdAt: '2026-03-30T08:00:00.000Z',
        sourceKind: 'QUOTED_FEEDBACK',
        rejectionCategory: 'price_too_high',
        rejectionTargetArea: 'carton_packaging',
        calibrationSignal: 'QUOTE_TOO_HIGH',
        driftSourceCandidate: 'carton_outer_carton_rate',
        driftDirection: 'HIGH',
      },
      {
        createdAt: '2026-03-31T08:00:00.000Z',
        sourceKind: 'QUOTED_FEEDBACK',
        rejectionCategory: 'price_too_high',
        rejectionTargetArea: 'carton_packaging',
        calibrationSignal: 'QUOTE_TOO_HIGH',
        driftSourceCandidate: 'carton_outer_carton_rate',
        driftDirection: 'HIGH',
      },
      {
        createdAt: '2026-04-01T08:00:00.000Z',
        sourceKind: 'QUOTED_FEEDBACK',
        rejectionCategory: 'price_too_high',
        rejectionTargetArea: 'carton_packaging',
        calibrationSignal: 'QUOTE_TOO_HIGH',
        driftSourceCandidate: 'carton_outer_carton_rate',
        driftDirection: 'HIGH',
      },
      {
        createdAt: '2026-04-07T08:00:00.000Z',
        sourceKind: 'QUOTED_FEEDBACK',
        rejectionCategory: 'price_too_low',
        rejectionTargetArea: 'shipping',
        calibrationSignal: 'QUOTE_TOO_LOW',
        driftSourceCandidate: 'shipping',
        driftDirection: 'LOW',
      },
    ], 4)

    assert(review.totalQuotedFeedbackCount === 4, '周归档应累计 quoted 反馈总数')
    assert(review.weeklyArchives.length === 2, '跨周数据应拆成两个周归档')
    assert(review.weeklyArchives[0].targetAreaBreakdown.some((item) => item.targetArea === 'shipping' && item.count === 1), '最新周归档应聚合目标区段')
    assert(review.weeklyArchives[1].targetAreaBreakdown.some((item) => item.targetArea === 'carton_packaging' && item.count === 3), '上一周归档应聚合同类目标区段')
    assert(review.currentSignal?.driftSourceCandidate === 'shipping', '连续序列遇到不同 drift source 时应重置为最新源')
    assert(review.currentSignal?.consecutiveCount === 1, 'stop rule 应保持严格连续同源同向，而不是简单累计')
    assert(review.currentSignal?.status === 'near_threshold', '阈值剩余 3 单时应进入 near_threshold 观察区')
  })

  const passed = results.filter((item) => item.passed).length
  console.log(`\n总计: ${passed}/${results.length} 通过`)

  if (passed !== results.length) {
    process.exit(1)
  }
}

void main()