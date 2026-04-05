import {
  createEmptyTuckEndPhaseTwoManualReviewDraft,
  TUCK_END_PHASE_TWO_BUCKET_DEFINITIONS_DRAFT,
  TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT,
  TUCK_END_PHASE_TWO_MANUAL_REVIEW_EXAMPLES_DRAFT,
  TUCK_END_PHASE_TWO_MANUAL_REVIEW_TEMPLATE_DRAFT,
  TUCK_END_PHASE_TWO_REQUIRED_SHADOW_FIELDS_DRAFT,
  TUCK_END_PHASE_TWO_STRUCTURE_KEYWORDS_DRAFT,
} from '@/server/packaging/tuckEndBoxPhaseTwoDraft'

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

console.log('\n=== Tuck-End Box 第二期执行入口测试 ===\n')

test('live shadow 母池应覆盖 phase-one、second-phase 和结构词三类入口', () => {
  const sources = new Set(TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT.entryRules.map((item) => item.source))

  assert(TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT.family === 'tuck_end_box', '母池 family 应固定为 tuck_end_box')
  assert(TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT.phaseOneRemainsAuthoritative === true, 'phase-one 应继续 authoritative')
  assert(TUCK_END_PHASE_TWO_LIVE_SHADOW_MOTHER_POOL_DRAFT.secondPhaseRemainsShadowOnly === true, 'second-phase 应继续 shadow only')
  assert(sources.has('phase_one_tuck_end_box'), '应包含 phase-one 判成 tuck_end_box 的入口')
  assert(sources.has('second_phase_tuck_end_box'), '应包含 second-phase 判成 tuck_end_box 的入口')
  assert(sources.has('tuck_end_related_structure_keyword'), '应包含结构词命中的入口')
})

test('母池结构词和 shadow 字段清单应覆盖第二期最小使用面', () => {
  const keywords = new Set(TUCK_END_PHASE_TWO_STRUCTURE_KEYWORDS_DRAFT)
  const fields = new Set(TUCK_END_PHASE_TWO_REQUIRED_SHADOW_FIELDS_DRAFT)

  assert(keywords.has('双插盒'), '应覆盖标准双插结构词')
  assert(keywords.has('屏幕双插大盒'), '应覆盖 screen_style / large_box 结构词')
  assert(keywords.has('开窗双插盒'), '应覆盖 open-window 结构词')
  assert(fields.has('shadowStatus'), '应要求 shadowStatus')
  assert(fields.has('quotedChecks'), '应要求 quotedChecks')
  assert(fields.has('diffSummary.familyMergeAligned'), '应要求 family merge diff')
  assert(fields.has('diffSummary.manualAdjustmentPresent'), '应要求 manual adjustment diff')
})

test('三桶定义应完整覆盖 quoted、estimated、handoff 三类 path 语义', () => {
  const buckets = new Map(TUCK_END_PHASE_TWO_BUCKET_DEFINITIONS_DRAFT.map((item) => [item.bucket, item]))
  const quoted = buckets.get('quoted_clean_subset')
  const estimated = buckets.get('estimated_boundary')
  const handoff = buckets.get('handoff_boundary')

  assert(Boolean(quoted), '应定义 quoted clean subset')
  assert(Boolean(estimated), '应定义 estimated boundary')
  assert(Boolean(handoff), '应定义 handoff boundary')
  assert((quoted?.paths.length || 0) === 1, 'quoted clean subset 当前应只保留一个最干净 path')
  assert(estimated?.paths.some((item) => item.pathId === 'hanging_or_insert') === true, 'estimated 应覆盖 hanging_or_insert path')
  assert(estimated?.paths.some((item) => item.pathId === 'window_film_manual_adjustment') === true, 'estimated 应覆盖 window_film_manual_adjustment path')
  assert(estimated?.paths.some((item) => item.pathId === 'reinforced_material') === true, 'estimated 应覆盖 reinforced_material path')
  assert(handoff?.paths.some((item) => item.pathId === 'open_window_deferred') === true, 'handoff 应覆盖 open_window_deferred path')
  assert(handoff?.paths.some((item) => item.pathId === 'high_complexity_process') === true, 'handoff 应覆盖 high_complexity_process path')
})

test('人工复核模板应包含基本信息、分桶、产品判断、术语成本和结论五段', () => {
  const draft = createEmptyTuckEndPhaseTwoManualReviewDraft()

  assert(draft.schemaVersion === 'tuck_end_phase_two_review_v1_draft', '模板 schemaVersion 应固定')
  assert('basicInfo' in draft, '模板应包含基本信息段')
  assert('bucketAssessment' in draft, '模板应包含分桶判断段')
  assert('productAssessment' in draft, '模板应包含产品层判断段')
  assert('termAndCostAssessment' in draft, '模板应包含术语与成本判断段')
  assert('conclusion' in draft, '模板应包含结论段')
  assert(Array.isArray(TUCK_END_PHASE_TWO_MANUAL_REVIEW_TEMPLATE_DRAFT.basicInfo.variantTags), '模板应保留 variantTags 字段')
  assert(Array.isArray(TUCK_END_PHASE_TWO_MANUAL_REVIEW_TEMPLATE_DRAFT.termAndCostAssessment.blockingUnknownTerms), '模板应保留 blockingUnknownTerms')
})

test('示例应覆盖最接近 limited role 的 quoted path 和必须阻断的高复杂 handoff path', () => {
  const quotedExample = TUCK_END_PHASE_TWO_MANUAL_REVIEW_EXAMPLES_DRAFT.find(
    (item) => item.bucketAssessment.bucket === 'quoted_clean_subset'
  )
  const handoffExample = TUCK_END_PHASE_TWO_MANUAL_REVIEW_EXAMPLES_DRAFT.find(
    (item) => item.bucketAssessment.bucket === 'handoff_boundary'
  )

  assert(Boolean(quotedExample), '应提供 quoted clean subset 示例')
  assert(quotedExample?.conclusion.disposition === 'keep_shadow', 'quoted 示例当前仍应保持 keep_shadow')
  assert(Boolean(handoffExample), '应提供 handoff boundary 示例')
  assert(handoffExample?.productAssessment.highComplexityCorrectlyHandoff === true, 'handoff 示例应验证高复杂工艺正确进入 handoff')
  assert(handoffExample?.conclusion.disposition === 'blocked', '高复杂 handoff 示例应直接 blocked')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}