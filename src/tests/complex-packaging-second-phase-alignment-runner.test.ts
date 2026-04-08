import {
  runFoldingCartonFocusedAlignmentEvaluation,
  runComplexPackagingAlignmentEvaluation,
  runFirstBatchComplexPackagingAlignmentEvaluation,
} from '@/server/packaging/complexPackagingAlignmentRunner'

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

console.log('\n=== Second-Phase 真实样本评估 runner 测试 ===\n')

test('runner 能正确比较 phase-one 与 second-phase 的主类归并', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'packaging_type_compare',
        packagingTypeExpected: 'folding_carton',
        expectedDecision: 'quoted',
        grayCandidate: true,
        realSummary: { normalizedPackagingObservation: '普通彩盒', keyTerms: ['白卡'], lineItemObservation: [] },
      },
      rawMessage: '彩盒，163x82x177mm，350g白卡裱WE坑+2专+黑+覆哑膜+裱+啤+粘，6100',
      phaseOneResult: {
        productType: 'window_box',
        status: 'quoted',
        missingFields: [],
        requiresHumanReview: false,
      },
      secondPhaseResult: {
        shadow: {
          schemaVersion: 'second_phase_v1_draft',
          applicable: 'in_scope',
          inInitialScope: true,
          deferred: false,
          packagingFamily: 'folding_carton',
          packagingType: 'folding_carton',
          variantTags: ['plain_carton'],
          shadowStatus: 'quoted',
          statusReasons: ['folding_carton_in_scope'],
          quotedChecks: {
            packagingTypeResolved: true,
            coreMaterialRecipeComplete: true,
            keyLineItemsComputable: true,
            unresolvedTermsSafe: true,
          },
          unresolvedTerms: [],
          blockingUnknownTerms: [],
          nonBlockingUnknownTerms: [],
          lineItems: [],
          subtotal: 100,
          parseWarnings: [],
          usedForResponse: false,
          diffSummary: {
            familyMergeAligned: false,
            packagingTypeAligned: false,
            statusAligned: true,
            phaseOneProductType: 'window_box',
            secondPhasePackagingType: 'folding_carton',
            phaseOneStatus: 'quoted',
            secondPhaseStatus: 'quoted',
            manualAdjustmentPresent: false,
            enteredDeferredOrHandoff: false,
            keyUnresolvedTerms: [],
          },
        },
        recognizedTerms: ['白卡'],
        unknownTerms: [],
      },
    },
  ])

  assert(result.evaluatedSamples[0].packagingTypeComparison.closerToExpected === 'second_phase', '主类归并应判定 second-phase 更接近')
})

test('runner 能正确识别 unresolved terms 是否阻塞灰度', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'blocking_unresolved',
        packagingTypeExpected: 'mailer_box',
        expectedDecision: 'quoted',
        grayCandidate: true,
        realSummary: { normalizedPackagingObservation: '普通飞机盒', keyTerms: ['白卡', 'Q9坑'], lineItemObservation: [] },
      },
      rawMessage: '飞机盒，20*12*6CM，300克白卡+Q9坑，四色，裱+啤，1000',
    },
  ])

  assert(result.evaluatedSamples[0].termCoverage.blockingUnresolvedTerms.includes('Q9坑') === true, '应识别 blocking unresolved term')
  assert(result.evaluatedSamples[0].grayGate.internalCompareObservation.passes === false, 'blocking unresolved term 应阻塞灰度')
})

test('runner 能输出 line-item 对齐结果', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'line_item_alignment',
        packagingTypeExpected: 'mailer_box',
        expectedDecision: 'quoted',
        grayCandidate: true,
        realSummary: { normalizedPackagingObservation: '普通飞机盒', keyTerms: ['白卡'], lineItemObservation: ['面纸', '印刷费', '刀模'] },
        realCostItems: [
          { rawLineName: '面纸', normalizedLineCode: 'face_paper' },
          { rawLineName: '印刷费', normalizedLineCode: 'printing' },
          { rawLineName: '刀模', normalizedLineCode: 'die_mold' },
        ],
      },
      rawMessage: '飞机盒，28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000',
    },
  ])

  assert(result.evaluatedSamples[0].lineItemAlignment.matchedLineCodes.includes('face_paper') === true, '应输出面纸对齐结果')
  assert(Array.isArray(result.evaluatedSamples[0].lineItemAlignment.secondPhaseLineCodes), '应输出 second-phase line item codes')
})

test('runner 能输出决策边界对比', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'decision_boundary_compare',
        packagingTypeExpected: 'tuck_end_box',
        expectedDecision: 'handoff_required',
        grayCandidate: false,
        realSummary: { normalizedPackagingObservation: '高复杂双插盒', keyTerms: ['银卡', '激凸'], lineItemObservation: [] },
      },
      rawMessage: '激凸UV屏幕双插盒，100mm*15mm*215mm，375银卡+UV印+逆向UV+激凸+局部UV++啤+粘盒，10000',
      phaseOneResult: {
        productType: 'tuck_end_box',
        status: 'quoted',
        missingFields: [],
        requiresHumanReview: false,
      },
    },
  ])

  assert(result.evaluatedSamples[0].decisionBoundary.closerToExpected === 'second_phase', '高复杂边界应判 second-phase 更接近真实期望')
  assert(result.evaluatedSamples[0].decisionBoundary.secondPhase === 'handoff_required', '应输出 second-phase 决策边界')
})

test('46100 handoff 样本应不再停留在 neither', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'tuck_end_handoff_monthly_46100',
        packagingTypeExpected: 'tuck_end_box',
        variantTagsExpected: ['screen_style', 'large_box'],
        expectedDecision: 'handoff_required',
        grayCandidate: false,
        realSummary: { normalizedPackagingObservation: '屏幕双插大盒，银卡 + UV + 激凸 + 局部 UV，属于高复杂后道组合', keyTerms: ['银卡', 'UV印', '激凸', '局部UV', '啤', '粘盒'], lineItemObservation: [] },
      },
      rawMessage: '激凸UV屏幕双插大盒，100mm*52mm*215mm，375银卡+UV印+激凸+局部UV++啤+粘盒，2000',
    },
  ])

  assert(result.evaluatedSamples[0].packagingTypeComparison.secondPhaseMatched === true, '应命中 tuck_end_box 主类')
  assert(result.evaluatedSamples[0].termCoverage.passes === true, '应命中关键术语且不残留 blocking unresolved term')
  assert(result.evaluatedSamples[0].decisionBoundary.secondPhase === 'handoff_required', '应保持 handoff boundary')
  assert(result.evaluatedSamples[0].overallCloserToExpected === 'second_phase', '应从 neither 进入 second_phase closer')
})

test('runner 能对 quoted / estimated / handoff 样本给出结构化结论', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'quoted_sample',
        packagingTypeExpected: 'mailer_box',
        expectedDecision: 'quoted',
        grayCandidate: true,
        realSummary: { normalizedPackagingObservation: '普通飞机盒', keyTerms: ['白卡'], lineItemObservation: [] },
      },
      rawMessage: '飞机盒，28*24*6cm，400g白卡+4C+过光胶+裱+啤，1000',
    },
    {
      sample: {
        sampleId: 'estimated_sample',
        packagingTypeExpected: 'tuck_end_box',
        expectedDecision: 'estimated',
        grayCandidate: false,
        realSummary: { normalizedPackagingObservation: '挂钩彩盒', keyTerms: ['窗口片'], lineItemObservation: [] },
      },
      rawMessage: '挂钩彩盒，92x28x92mm，300g白卡裱300g白卡+4C+正面过哑胶+裱+啤+贴窗口片+粘 配内卡*1，5000',
    },
    {
      sample: {
        sampleId: 'handoff_sample',
        packagingTypeExpected: 'tuck_end_box',
        expectedDecision: 'handoff_required',
        grayCandidate: false,
        realSummary: { normalizedPackagingObservation: '高复杂双插盒', keyTerms: ['激凸'], lineItemObservation: [] },
      },
      rawMessage: '激凸UV屏幕双插大盒，100mm*52mm*215mm，375银卡+UV印+激凸+局部UV++啤+粘盒，2000',
    },
  ])

  assert(result.evaluatedSamples.length === 3, '应输出三条结构化样本结果')
  assert(result.evaluatedSamples.every((item) => typeof item.sampleId === 'string' && item.sampleId.length > 0), '每条样本都应保留 sampleId')
  assert(result.evaluatedSamples.every((item) => Array.isArray(item.keyFailureReasons)), '每条样本都应输出结构化失败原因')
})

test('空样本或不完整样本不会让 runner 崩掉', () => {
  const result = runComplexPackagingAlignmentEvaluation([
    {
      sample: {
        sampleId: 'incomplete_sample',
        realSummary: { normalizedPackagingObservation: '', keyTerms: [], lineItemObservation: [] },
      },
    },
  ])

  assert(result.evaluatedSamples.length === 1, '不完整样本也应返回结构化结果')
  assert(result.evaluatedSamples[0].keyFailureReasons.some((item) => item.bucket === 'input_incomplete') === true, '应输出 input_incomplete 失败原因')
})

test('默认首批 runner 应排除 excluded_reference_only 样本', () => {
  const result = runFirstBatchComplexPackagingAlignmentEvaluation()
  const sampleIds = new Set(result.evaluatedSamples.map((item) => item.sampleId))

  assert(sampleIds.has('folding_carton_0401_mkly_color_box') === true, '应保留首批普通彩盒 clean subset 样本')
  assert(sampleIds.has('folding_carton_monthly_46094') === false, 'reference-only 的月结样本不应进入默认首批 runner')
})

test('folding carton focused runner 应纳入新增样本并按家族范围评估 gate', () => {
  const result = runFoldingCartonFocusedAlignmentEvaluation()
  const sampleIds = new Set(result.evaluatedSamples.map((item) => item.sampleId))

  assert(sampleIds.has('folding_carton_0401_mkly_color_box') === true, '应包含 BOM-rich 主样本')
  assert(sampleIds.has('folding_carton_monthly_46090_irtusde_flat_quoted') === true, '应包含 46090 flat quoted 样本')
  assert(sampleIds.has('folding_carton_monthly_46097_onsoyours_recipe_term') === true, '应包含 46097 onsoyours 术语样本')
  assert(sampleIds.has('folding_carton_monthly_46097_shownicer_recipe_term') === true, '应包含 46097 shownicer 术语样本')
  assert(sampleIds.has('folding_carton_0403_gshifeng_inner_box_a9_boundary') === true, '应包含 0403 A9 加强芯 estimated 边界样本')
  assert(result.overallSummary.gateFailures.some((item) => item.startsWith('sample_coverage_minimum: 未覆盖首批全部核心盒型')) === false, 'folding focused runner 不应因缺少 tuck_end_box / mailer_box 而失败')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}
