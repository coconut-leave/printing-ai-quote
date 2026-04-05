import {
  SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT,
  SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLES_DRAFT,
  SECOND_PHASE_FACTORY_TERM_NORMALIZATIONS_DRAFT,
  SECOND_PHASE_FACTORY_TERM_DICTIONARY_CANDIDATES_DRAFT,
  SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLES_DRAFT,
  SECOND_PHASE_FOLDING_CARTON_FOCUSED_EVALUATION_SAMPLES_DRAFT,
  SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLES_DRAFT,
  SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLES_DRAFT,
  SECOND_PHASE_FUTURE_PRODUCT_TYPE_CANDIDATE_SAMPLES_DRAFT,
  SECOND_PHASE_ALIGNMENT_METRICS_DRAFT,
  SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT,
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT,
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT,
  SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT,
  SECOND_PHASE_TUCK_END_BOUNDARY_SAMPLES_DRAFT,
  SECOND_PHASE_TUCK_END_REINFORCED_ESTIMATED_BOUNDARY_SAMPLES_DRAFT,
  SECOND_PHASE_WINDOW_BOX_DEFERRED_GLOSSARY_SAMPLES_DRAFT,
} from '@/server/packaging/secondPhaseAlignmentEvaluationDraft'

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

console.log('\n=== Second-Phase 对齐评估框架测试 ===\n')

test('首批真实评估集应覆盖普通彩盒、双插盒/挂钩彩盒、普通飞机盒', () => {
  const typeSet = new Set(SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT.map((item) => item.packagingTypeExpected))
  const sampleIds = new Set(SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.map((item) => item.sampleId))

  assert(typeSet.has('folding_carton'), '应覆盖普通彩盒样本')
  assert(typeSet.has('tuck_end_box'), '应覆盖双插盒/挂钩彩盒样本')
  assert(typeSet.has('mailer_box'), '应覆盖普通飞机盒样本')
  assert(sampleIds.size === SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.length, 'sampleId 应保持唯一')
})

test('评估集应同时覆盖 quoted、estimated、handoff 三种期望边界', () => {
  const decisionSet = new Set(SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT.map((item) => item.expectedDecision))

  assert(decisionSet.has('quoted'), '应包含 quoted 样本')
  assert(decisionSet.has('estimated'), '应包含 estimated 样本')
  assert(decisionSet.has('handoff_required'), '应包含 handoff 样本')
})

test('样本桶筛选草案应明确记录 accepted 与 rejected 候选', () => {
  const acceptedBuckets = new Set(
    SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT.filter((item) => item.decision === 'accepted').map((item) => item.bucket)
  )
  const tuckEndAcceptedCount = SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT.filter(
    (item) => item.bucket === 'tuck_end_box_clean_subset' && item.decision === 'accepted'
  ).length

  assert(acceptedBuckets.has('folding_carton_quoted_clean_subset'), '普通彩盒 clean subset 应至少有一个 accepted 候选')
  assert(acceptedBuckets.has('folding_carton_flat_quote_reference'), '普通彩盒 flat quoted reference 应单独建桶')
  assert(acceptedBuckets.has('tuck_end_box_clean_subset_pending_review'), '图片主件应先进入 pending review 候选桶')
  assert(tuckEndAcceptedCount === 0, '当前真实单据里不应伪造标准双插盒 clean subset accepted 样本')
})

test('图片样本应按分桶补充，不直接抬进 clean subset 主路径', () => {
  const candidates = new Map(SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT.map((item) => [item.candidateId, item]))

  const pendingReview = candidates.get('tuck_end_candidate_image_bundle_main_item_pending_review')
  const reinforcedBoundary = candidates.get('tuck_end_reinforced_boundary_image_fireproof_ae')
  const windowDeferred = candidates.get('window_box_deferred_image_gloss_film')

  assert(pendingReview?.bucket === 'tuck_end_box_clean_subset_pending_review', '第三张图主件应只进入 pending review candidate 桶')
  assert(reinforcedBoundary?.bucket === 'tuck_end_box_reinforced_estimated_boundary_samples', 'AE 加强芯双插盒应进入 reinforced estimated-boundary 桶')
  assert(windowDeferred?.bucket === 'window_box_deferred_glossary_samples', '开窗彩盒应进入 window_box deferred/glossary 桶')
})

test('新补充的黄娟月结单样本应服务不同产品能力桶', () => {
  const candidates = new Map(SECOND_PHASE_ALIGNMENT_BUCKET_SCREENING_DRAFT.map((item) => [item.candidateId, item]))

  const foldingQuoted = candidates.get('folding_carton_candidate_monthly_46090_irtusde')
  const foldingTerm = candidates.get('folding_carton_candidate_monthly_46097_onsoyours')
  const tuckEndBoundary = candidates.get('tuck_end_boundary_candidate_monthly_46085_window_without_film')
  const futureType = candidates.get('future_type_candidate_monthly_46084_auto_lock_bottom')

  assert(foldingQuoted?.bucket === 'folding_carton_flat_quote_reference', '46090 应进入普通彩盒 flat quoted reference 桶')
  assert(foldingQuoted?.bomEvidence === 'flat_quote_only', '46090 应明确标注为 flat quoted，而不是 BOM-rich')
  assert(foldingQuoted?.gateContribution?.includes('critical_term_stability') === true, '46090 应补 critical_term_stability')
  assert(foldingTerm?.bucket === 'folding_carton_material_recipe_term_stability', '46097 应进入 folding carton 术语 / 配方桶')
  assert(tuckEndBoundary?.bucket === 'tuck_end_box_boundary_samples', '46085 应进入双插盒边界样本桶')
  assert(futureType?.bucket === 'future_product_type_candidates', '46084 应进入 future product type 候选桶')
  assert(futureType?.futurePackagingType === 'auto_lock_bottom_box', '46084 应挂到 auto_lock_bottom_box future bucket')
})

test('新增术语词典候选应按材料、工艺、边界三类覆盖关键术语', () => {
  const dictionary = new Map(SECOND_PHASE_FACTORY_TERM_DICTIONARY_CANDIDATES_DRAFT.map((item) => [item.term, item]))
  const normalizations = new Map(SECOND_PHASE_FACTORY_TERM_NORMALIZATIONS_DRAFT.map((item) => [item.canonical, item]))

  assert(dictionary.get('W9')?.impactAreas.includes('material_recipe') === true, 'W9 应进入材料配方词典')
  assert(dictionary.get('加强芯')?.impactAreas.includes('boundary') === true, '加强芯 应进入强化边界词典')
  assert(dictionary.get('裱坑')?.impactAreas.includes('material_recipe') === true, '裱坑 应同时参与材料配方判断')
  assert(dictionary.get('过哑胶')?.impactAreas.includes('process') === true, '过哑胶 应进入工艺词典')
  assert(dictionary.get('覆哑膜')?.impactAreas.includes('process') === true, '覆哑膜 应进入工艺词典')
  assert(dictionary.get('过光油')?.impactAreas.includes('process') === true, '过光油 应进入工艺词典')
  assert(dictionary.get('开窗不贴胶片')?.impactAreas.includes('boundary') === true, '开窗不贴胶片 应进入边界词典')
  assert(dictionary.get('无印刷')?.impactAreas.includes('boundary') === true, '无印刷 应同时参与边界判断')
  assert(normalizations.get('AE坑')?.boundaryEffect === 'estimated', 'AE坑 应被正式归一并参与 estimated 边界')
  assert(normalizations.get('白E高强芯')?.boundaryEffect === 'estimated', '白E高强芯 应被正式归一并参与 estimated 边界')
  assert(normalizations.get('V槽')?.boundaryEffect === 'handoff_required', 'V槽 应被正式归一并参与 handoff 边界')
})

test('正式样本桶导出应包含这轮新增的 folding / boundary / future 样本', () => {
  const quotedSampleIds = new Set(SECOND_PHASE_FOLDING_CARTON_QUOTED_CLEAN_SUBSET_SAMPLES_DRAFT.map((item) => item.sampleId))
  const flatReferenceSampleIds = new Set(SECOND_PHASE_FOLDING_CARTON_FLAT_QUOTE_REFERENCE_SAMPLES_DRAFT.map((item) => item.sampleId))
  const termSampleIds = new Set(SECOND_PHASE_FOLDING_CARTON_MATERIAL_RECIPE_TERM_STABILITY_SAMPLES_DRAFT.map((item) => item.sampleId))
  const estimatedBoundarySampleIds = new Set(SECOND_PHASE_FOLDING_CARTON_ESTIMATED_BOUNDARY_SAMPLES_DRAFT.map((item) => item.sampleId))
  const boundarySampleIds = new Set(SECOND_PHASE_TUCK_END_BOUNDARY_SAMPLES_DRAFT.map((item) => item.sampleId))
  const tuckEndReinforcedBoundarySampleIds = new Set(SECOND_PHASE_TUCK_END_REINFORCED_ESTIMATED_BOUNDARY_SAMPLES_DRAFT.map((item) => item.sampleId))
  const windowDeferredSampleIds = new Set(SECOND_PHASE_WINDOW_BOX_DEFERRED_GLOSSARY_SAMPLES_DRAFT.map((item) => item.sampleId))
  const futureSampleIds = new Set(SECOND_PHASE_FUTURE_PRODUCT_TYPE_CANDIDATE_SAMPLES_DRAFT.map((item) => item.sampleId))
  const focusedSampleIds = new Set(SECOND_PHASE_FOLDING_CARTON_FOCUSED_EVALUATION_SAMPLES_DRAFT.map((item) => item.sampleId))

  assert(quotedSampleIds.has('folding_carton_0401_mkly_color_box'), 'BOM-rich folding carton 主样本应保留在 quoted clean subset')
  assert(flatReferenceSampleIds.has('folding_carton_monthly_46090_irtusde_flat_quoted'), '46090 应正式进入 folding flat quoted reference 桶')
  assert(termSampleIds.has('folding_carton_monthly_46097_onsoyours_recipe_term'), '46097 onsoyours 应正式进入术语稳定性桶')
  assert(termSampleIds.has('folding_carton_monthly_46097_shownicer_recipe_term'), '46097 shownicer 应正式进入术语稳定性桶')
  assert(estimatedBoundarySampleIds.has('folding_carton_0403_gshifeng_inner_box_a9_boundary'), '0403 内彩盒应正式进入 estimated 边界桶')
  assert(boundarySampleIds.has('window_boundary_monthly_46085_tuck_end_open_window'), '46085 应正式进入边界样本桶')
  assert(tuckEndReinforcedBoundarySampleIds.has('tuck_end_image_fireproof_file_bag_ae_boundary'), 'AE 加强芯双插盒应正式进入 reinforced estimated-boundary 支持桶')
  assert(windowDeferredSampleIds.has('window_box_image_gloss_film_deferred'), '开窗彩盒应正式进入 deferred/glossary 支持桶')
  assert(futureSampleIds.has('future_type_monthly_46084_auto_lock_bottom'), '46084 应正式进入 future product type 候选桶')
  assert(focusedSampleIds.size === 5, 'folding carton focused runner 当前应包含 0401、46090、46097x2、0403 内彩盒 五条样本')
})

test('对齐指标应包含五个核心产品指标', () => {
  const metricIds = new Set(SECOND_PHASE_ALIGNMENT_METRICS_DRAFT.map((item) => item.metricId))

  assert(metricIds.has('packaging_type_alignment'), '应包含主类归并准确性指标')
  assert(metricIds.has('term_coverage'), '应包含术语识别覆盖度指标')
  assert(metricIds.has('line_item_alignment'), '应包含核心 line-item 对齐度指标')
  assert(metricIds.has('decision_boundary_alignment'), '应包含决策边界一致性指标')
  assert(metricIds.has('price_deviation_proxy'), '应包含价格偏差代理指标')
})

test('灰度切换草案应同时定义进入下一阶段条件和继续 shadow 的边界', () => {
  const stages = new Set(SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT.map((item) => item.stage))
  const hasStayShadowRules = SECOND_PHASE_GRAY_RELEASE_GATES_DRAFT.every((item) => item.stayShadowScenarios.length > 0)

  assert(stages.has('internal_compare_observation'), '应定义内部对比观察阶段门槛')
  assert(stages.has('limited_product_role'), '应定义更强产品角色前置门槛')
  assert(hasStayShadowRules, '每个阶段都应保留继续停留在 shadow 的规则')
})

test('当前 readiness 判断应允许内部观察，但不允许直接承担更强产品角色', () => {
  assert(SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT.internalCompareObservationRecommended === true, '当前应建议进入内部对比观察阶段')
  assert(SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT.strongerProductRoleRecommended === false, '当前不应直接承担更强产品角色')
  assert(SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT.closestGrayCandidates.length >= 2, '应给出最接近可灰度的子场景')
  assert(SECOND_PHASE_CURRENT_READINESS_ASSESSMENT_DRAFT.keyGaps.length >= 2, '应明确给出当前关键差距')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}
