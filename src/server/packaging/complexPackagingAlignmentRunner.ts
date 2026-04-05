import { buildComplexPackagingSecondPhaseShadow } from './complexPackagingSecondPhaseShadow'
import { extractComplexPackagingQuoteRequest, decideComplexPackagingQuotePath } from './extractComplexPackagingQuote'
import { extractComplexPackagingSecondPhaseDraft } from './extractComplexPackagingSecondPhase'
import {
  SECOND_PHASE_FOLDING_CARTON_FOCUSED_EVALUATION_SAMPLES_DRAFT,
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT,
  SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT,
  type SecondPhaseAlignmentEvaluationSampleDraft,
  type SecondPhaseAlignmentBucketCandidateBomEvidenceDraft,
  type SecondPhaseAlignmentBucketCandidateEvaluationRoleDraft,
} from './secondPhaseAlignmentEvaluationDraft'
import { normalizeSecondPhaseTerm } from './secondPhaseTermNormalizationDraft'
import type { ComplexPackagingRouteStatus } from './types'
import type {
  SecondPhaseDecisionStatusDraft,
  SecondPhaseQuotedRequirementCheckDraft,
  SecondPhaseShadowPayloadDraft,
  SecondPhaseUnknownTermDraft,
} from './secondPhaseDraft'
import type { SecondPhaseLineItemCodeDraft } from '@/server/pricing/complexPackagingSecondPhaseLineItemsDraft'

type SampleInput = Partial<SecondPhaseAlignmentEvaluationSampleDraft>

type CloserToExpected = 'phase_one' | 'second_phase' | 'tie' | 'neither'
type FailureBucket = 'packaging_type' | 'term_coverage' | 'line_item_alignment' | 'decision_boundary' | 'price_deviation' | 'input_incomplete'
type AlignmentAvailability = 'available' | 'not_available'
type PriceDeviationDirection = 'not_available' | 'lower' | 'higher' | 'close'

export type PhaseOneAlignmentComparableResult = {
  productType?: string
  status?: ComplexPackagingRouteStatus
  missingFields: string[]
  reason?: string
  requiresHumanReview: boolean
}

export type SecondPhaseAlignmentComparableResult = {
  shadow: SecondPhaseShadowPayloadDraft | null
  recognizedTerms: string[]
  unknownTerms: SecondPhaseUnknownTermDraft[]
  quotedChecks?: SecondPhaseQuotedRequirementCheckDraft
}

export type ComplexPackagingAlignmentRunnerSampleInput = {
  sample: SampleInput
  rawMessage?: string
  phaseOneResult?: Partial<PhaseOneAlignmentComparableResult>
  secondPhaseResult?: Partial<SecondPhaseAlignmentComparableResult>
}

export type ComplexPackagingAlignmentSampleResult = {
  sampleId: string
  rawMessage: string
  expected: {
    packagingType?: string
    variantTags: string[]
    decision?: string
    grayCandidate: boolean
    bomEvidence?: SecondPhaseAlignmentBucketCandidateBomEvidenceDraft
    evaluationRole?: SecondPhaseAlignmentBucketCandidateEvaluationRoleDraft
  }
  phaseOne: PhaseOneAlignmentComparableResult
  secondPhase: {
    packagingType?: string
    variantTags: string[]
    status?: SecondPhaseDecisionStatusDraft
    recognizedTerms: string[]
    unresolvedTerms: string[]
    blockingUnknownTerms: string[]
    nonBlockingUnknownTerms: string[]
    lineItemCodes: string[]
    subtotal?: number
    quotedChecks?: SecondPhaseQuotedRequirementCheckDraft
  }
  packagingTypeComparison: {
    expected?: string
    phaseOne?: string
    secondPhase?: string
    phaseOneMatched: boolean
    secondPhaseMatched: boolean
    closerToExpected: CloserToExpected
  }
  termCoverage: {
    availability: AlignmentAvailability
    expectedTerms: string[]
    recognizedTerms: string[]
    matchedTerms: string[]
    missingExpectedTerms: string[]
    unresolvedTerms: string[]
    blockingUnresolvedTerms: string[]
    passes: boolean
  }
  lineItemAlignment: {
    availability: AlignmentAvailability
    expectedLineCodes: string[]
    secondPhaseLineCodes: string[]
    matchedLineCodes: string[]
    missingLineCodes: string[]
    extraLineCodes: string[]
    manualAdjustmentPresent: boolean
    passes: boolean
  }
  decisionBoundary: {
    expected?: string
    phaseOne?: string
    secondPhase?: string
    phaseOneMatched: boolean
    secondPhaseMatched: boolean
    secondPhaseMoreConservativeThanPhaseOne: boolean
    closerToExpected: CloserToExpected
    passes: boolean
  }
  priceDeviationProxy: {
    availability: AlignmentAvailability
    actualUnitPrice?: number
    actualAmount?: number
    secondPhaseSubtotal?: number
    deltaRatio?: number
    direction: PriceDeviationDirection
    passes: boolean
  }
  grayGate: {
    internalCompareObservation: {
      passes: boolean
      failedChecks: string[]
    }
    limitedProductRole: {
      passes: boolean
      failedChecks: string[]
    }
  }
  overallCloserToExpected: CloserToExpected
  keyFailureReasons: Array<{
    bucket: FailureBucket
    reason: string
  }>
}

export type ComplexPackagingAlignmentRunnerResult = {
  runnerVersion: 'complex_packaging_alignment_runner_v1'
  sampleCount: number
  evaluatedSamples: ComplexPackagingAlignmentSampleResult[]
  overallSummary: {
    secondPhaseCloserCount: number
    phaseOneCloserCount: number
    tieCount: number
    neitherCount: number
    internalCompareObservationEligible: boolean
    limitedProductRoleEligible: boolean
    gateFailures: string[]
    failureBucketCounts: Record<FailureBucket, number>
  }
}

export type ComplexPackagingAlignmentSummaryOptions = {
  requiredPackagingTypes?: string[]
  requiredDecisions?: string[]
}

const CORE_EXPECTED_LINE_CODES = new Set<SecondPhaseLineItemCodeDraft>([
  'face_paper',
  'corrugated_core',
  'backing_or_duplex',
  'printing',
  'lamination',
  'die_mold',
  'die_cut_machine',
  'gluing',
])

const DECISION_SEVERITY: Record<string, number> = {
  missing_fields: 0,
  quoted: 1,
  estimated: 2,
  handoff_required: 3,
}

function normalizeText(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[+，,；;:*]/g, '')
}

function textMatches(expected: string, actual: string): boolean {
  const expectedNormalized = normalizeText(expected)
  const actualNormalized = normalizeText(actual)
  if (!expectedNormalized || !actualNormalized) {
    return false
  }

  return expectedNormalized === actualNormalized
    || expectedNormalized.includes(actualNormalized)
    || actualNormalized.includes(expectedNormalized)
}

function buildSampleMessage(sample: SampleInput): string {
  const segments = [sample.productNameRaw, sample.specRaw, sample.materialProcessRaw, sample.quantity ? String(sample.quantity) : undefined]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  return segments.join('，')
}

function normalizeSample(sample: SampleInput): SampleInput {
  return {
    sampleId: sample.sampleId || 'unknown_sample',
    productNameRaw: sample.productNameRaw || '',
    specRaw: sample.specRaw || '',
    materialProcessRaw: sample.materialProcessRaw || '',
    quantity: sample.quantity || 0,
    realSummary: {
      normalizedPackagingObservation: sample.realSummary?.normalizedPackagingObservation || '',
      finishedSpec: sample.realSummary?.finishedSpec,
      unfoldedSpec: sample.realSummary?.unfoldedSpec,
      sheetSpec: sample.realSummary?.sheetSpec,
      keyTerms: sample.realSummary?.keyTerms || [],
      lineItemObservation: sample.realSummary?.lineItemObservation || [],
      note: sample.realSummary?.note,
    },
    realCostItems: sample.realCostItems || [],
    variantTagsExpected: sample.variantTagsExpected || [],
    grayCandidate: sample.grayCandidate || false,
    bomEvidence: sample.bomEvidence,
    evaluationRole: sample.evaluationRole,
    packagingTypeExpected: sample.packagingTypeExpected,
    expectedDecision: sample.expectedDecision,
    quotedUnitPrice: sample.quotedUnitPrice,
    quotedAmount: sample.quotedAmount,
  }
}

function canonicalizeTerm(value?: string): string {
  const canonicalValue = normalizeSecondPhaseTerm(value)
  const normalized = normalizeText(canonicalValue)
  if (!normalized) {
    return ''
  }

  if (normalized.includes('four_color') || normalized.includes('4c') || normalized.includes('四色')) {
    return 'four_color'
  }

  if (normalized.includes('matte') || normalized.includes('过哑胶') || normalized.includes('覆哑胶') || normalized.includes('覆哑膜') || normalized.includes('哑膜')) {
    return 'matte_finish'
  }

  if (normalized.includes('gloss') || normalized.includes('过光油') || normalized.includes('过光胶') || normalized.includes('覆光膜') || normalized.includes('光胶') || normalized.includes('光油')) {
    return 'gloss_finish'
  }

  if (normalized.includes('裱坑')) {
    return 'corrugated_mounting'
  }

  if (normalized.includes('已对裱')) {
    return 'pre_mounted'
  }

  if (normalized.includes('对裱')) {
    return 'duplex_mounting'
  }

  if (normalized.includes('无印刷')) {
    return 'print_none'
  }

  if (normalized.includes('v槽')) {
    return 'v_slot'
  }

  if (normalized.includes('开窗不贴胶片')) {
    return 'open_window_without_film'
  }

  if (normalized.includes('ae坑')) {
    return 'ae_corrugation'
  }

  if (normalized.includes('白e高强芯')) {
    return 'white_e_reinforced'
  }

  if (normalized === '粘' || normalized === '粘盒') {
    return 'gluing'
  }

  const weightMatch = normalized.match(/(\d+(?:\.\d+)?)g?(?:芯)?$/)
  if (weightMatch && Number.isFinite(Number(weightMatch[1]))) {
    return `${Number(weightMatch[1])}g`
  }

  return normalized
}

function derivePhaseOneResult(message: string): PhaseOneAlignmentComparableResult {
  const request = message ? extractComplexPackagingQuoteRequest(message) : null
  if (!request) {
    return {
      productType: undefined,
      status: undefined,
      missingFields: [],
      reason: 'phase_one_not_parsed',
      requiresHumanReview: false,
    }
  }

  const decision = decideComplexPackagingQuotePath(request)
  return {
    productType: request.mainItem.productType,
    status: decision.status,
    missingFields: decision.missingFields,
    reason: decision.reason,
    requiresHumanReview: request.requiresHumanReview,
  }
}

function deriveSecondPhaseResult(
  message: string,
  phaseOneResult: PhaseOneAlignmentComparableResult
): SecondPhaseAlignmentComparableResult {
  const request = message ? extractComplexPackagingSecondPhaseDraft(message) : null
  const shadow = message
    ? buildComplexPackagingSecondPhaseShadow({
        message,
        phaseOneProductType: phaseOneResult.productType,
        phaseOneStatus: phaseOneResult.status,
      })
    : null

  return {
    shadow,
    recognizedTerms: request?.items[0]?.recognizedTerms.map((item) => item.term) || [],
    unknownTerms: request?.items[0]?.unknownTerms || [],
    quotedChecks: request?.quotedChecks,
  }
}

function coercePhaseOneResult(
  provided: Partial<PhaseOneAlignmentComparableResult> | undefined,
  fallback: PhaseOneAlignmentComparableResult
): PhaseOneAlignmentComparableResult {
  if (!provided) {
    return fallback
  }

  return {
    productType: provided.productType ?? fallback.productType,
    status: provided.status ?? fallback.status,
    missingFields: provided.missingFields ?? fallback.missingFields,
    reason: provided.reason ?? fallback.reason,
    requiresHumanReview: provided.requiresHumanReview ?? fallback.requiresHumanReview,
  }
}

function coerceSecondPhaseResult(
  provided: Partial<SecondPhaseAlignmentComparableResult> | undefined,
  fallback: SecondPhaseAlignmentComparableResult
): SecondPhaseAlignmentComparableResult {
  if (!provided) {
    return fallback
  }

  return {
    shadow: provided.shadow ?? fallback.shadow,
    recognizedTerms: provided.recognizedTerms ?? fallback.recognizedTerms,
    unknownTerms: provided.unknownTerms ?? fallback.unknownTerms,
    quotedChecks: provided.quotedChecks ?? fallback.quotedChecks,
  }
}

function compareCloser(expected: string | undefined, phaseOne: string | undefined, secondPhase: string | undefined): CloserToExpected {
  const phaseOneMatched = Boolean(expected && phaseOne && expected === phaseOne)
  const secondPhaseMatched = Boolean(expected && secondPhase && expected === secondPhase)

  if (phaseOneMatched && secondPhaseMatched) {
    return 'tie'
  }

  if (secondPhaseMatched) {
    return 'second_phase'
  }

  if (phaseOneMatched) {
    return 'phase_one'
  }

  if (!expected && !phaseOne && !secondPhase) {
    return 'tie'
  }

  return 'neither'
}

function buildPackagingTypeComparison(sample: SampleInput, phaseOne: PhaseOneAlignmentComparableResult, secondPhase: SecondPhaseAlignmentComparableResult) {
  const expected = sample.packagingTypeExpected
  const phaseOneMatched = Boolean(expected && phaseOne.productType === expected)
  const secondPhaseMatched = Boolean(expected && secondPhase.shadow?.packagingType === expected)

  return {
    expected,
    phaseOne: phaseOne.productType,
    secondPhase: secondPhase.shadow?.packagingType,
    phaseOneMatched,
    secondPhaseMatched,
    closerToExpected: compareCloser(expected, phaseOne.productType, secondPhase.shadow?.packagingType),
  }
}

function buildTermCoverage(sample: SampleInput, secondPhase: SecondPhaseAlignmentComparableResult) {
  const expectedTerms = sample.realSummary?.keyTerms || []
  const recognizedTerms = secondPhase.recognizedTerms || []
  const matchedTerms = expectedTerms.filter((expected) => {
    const expectedCanonical = canonicalizeTerm(expected)
    return recognizedTerms.some((term) => {
      const actualCanonical = canonicalizeTerm(term)
      return textMatches(expected, term)
        || (expectedCanonical.length > 0 && actualCanonical.length > 0 && expectedCanonical === actualCanonical)
    })
  })
  const missingExpectedTerms = expectedTerms.filter((expected) => !matchedTerms.includes(expected))
  const unresolvedTerms = secondPhase.shadow?.unresolvedTerms || secondPhase.unknownTerms.map((item) => item.term)
  const blockingUnresolvedTerms = secondPhase.unknownTerms.filter((item) => item.severity === 'blocking').map((item) => item.term)
  const availability: AlignmentAvailability = expectedTerms.length > 0 ? 'available' : 'not_available'

  return {
    availability,
    expectedTerms,
    recognizedTerms,
    matchedTerms,
    missingExpectedTerms,
    unresolvedTerms,
    blockingUnresolvedTerms,
    passes: availability === 'available' && missingExpectedTerms.length === 0 && blockingUnresolvedTerms.length === 0,
  }
}

function buildLineItemAlignment(sample: SampleInput, secondPhase: SecondPhaseAlignmentComparableResult) {
  const expectedLineCodes = Array.from(new Set(
    (sample.realCostItems || [])
      .map((item) => item.normalizedLineCode)
      .filter(
        (value): value is SecondPhaseLineItemCodeDraft =>
          typeof value === 'string' && CORE_EXPECTED_LINE_CODES.has(value as SecondPhaseLineItemCodeDraft)
      )
  ))
  const secondPhaseLineCodes = Array.from(new Set(secondPhase.shadow?.lineItems?.map((line) => line.lineCode) || []))
  const expectedLineCodeStrings = expectedLineCodes.map((lineCode) => String(lineCode))
  const matchedLineCodes = expectedLineCodes.filter((lineCode) => secondPhaseLineCodes.includes(lineCode))
  const missingLineCodes = expectedLineCodes.filter((lineCode) => !secondPhaseLineCodes.includes(lineCode))
  const extraLineCodes = secondPhaseLineCodes.filter((lineCode) => !expectedLineCodeStrings.includes(lineCode))
  const availability: AlignmentAvailability = expectedLineCodes.length > 0 ? 'available' : 'not_available'

  return {
    availability,
    expectedLineCodes,
    secondPhaseLineCodes,
    matchedLineCodes,
    missingLineCodes,
    extraLineCodes,
    manualAdjustmentPresent: secondPhaseLineCodes.includes('manual_adjustment'),
    passes: availability === 'available' && missingLineCodes.length === 0,
  }
}

function isMoreConservative(statusA?: string, statusB?: string): boolean {
  return (DECISION_SEVERITY[statusA || ''] || 0) > (DECISION_SEVERITY[statusB || ''] || 0)
}

function buildDecisionBoundary(sample: SampleInput, phaseOne: PhaseOneAlignmentComparableResult, secondPhase: SecondPhaseAlignmentComparableResult) {
  const expected = sample.expectedDecision
  const phaseOneStatus = phaseOne.status
  const secondPhaseStatus = secondPhase.shadow?.shadowStatus
  const phaseOneMatched = Boolean(expected && phaseOneStatus === expected)
  const secondPhaseMatched = Boolean(expected && secondPhaseStatus === expected)

  return {
    expected,
    phaseOne: phaseOneStatus,
    secondPhase: secondPhaseStatus,
    phaseOneMatched,
    secondPhaseMatched,
    secondPhaseMoreConservativeThanPhaseOne: isMoreConservative(secondPhaseStatus, phaseOneStatus),
    closerToExpected: compareCloser(expected, phaseOneStatus, secondPhaseStatus),
    passes: secondPhaseMatched,
  }
}

function buildPriceDeviationProxy(sample: SampleInput, secondPhase: SecondPhaseAlignmentComparableResult) {
  const actualAmount = sample.quotedAmount
  const actualUnitPrice = sample.quotedUnitPrice
  const secondPhaseSubtotal = secondPhase.shadow?.subtotal
  const availability: AlignmentAvailability = typeof secondPhaseSubtotal === 'number' && (typeof actualAmount === 'number' || typeof actualUnitPrice === 'number')
    ? 'available'
    : 'not_available'

  if (availability === 'not_available') {
    return {
      availability,
      actualUnitPrice,
      actualAmount,
      secondPhaseSubtotal,
      deltaRatio: undefined,
      direction: 'not_available' as PriceDeviationDirection,
      passes: true,
    }
  }

  const baseline = typeof actualAmount === 'number' && actualAmount > 0
    ? actualAmount
    : typeof actualUnitPrice === 'number' && actualUnitPrice > 0
      ? actualUnitPrice
      : undefined
  const actualComparable = typeof actualAmount === 'number' && actualAmount > 0
    ? actualAmount
    : actualUnitPrice
  const computedComparable = typeof actualAmount === 'number' && actualAmount > 0 && secondPhaseSubtotal !== undefined
    ? secondPhaseSubtotal
    : secondPhaseSubtotal

  if (!baseline || actualComparable === undefined || computedComparable === undefined) {
    return {
      availability: 'not_available' as AlignmentAvailability,
      actualUnitPrice,
      actualAmount,
      secondPhaseSubtotal,
      deltaRatio: undefined,
      direction: 'not_available' as PriceDeviationDirection,
      passes: true,
    }
  }

  const deltaRatio = (computedComparable - actualComparable) / baseline
  const absRatio = Math.abs(deltaRatio)
  const direction: PriceDeviationDirection = absRatio <= 0.15 ? 'close' : deltaRatio < 0 ? 'lower' : 'higher'

  return {
    availability,
    actualUnitPrice,
    actualAmount,
    secondPhaseSubtotal,
    deltaRatio,
    direction,
    passes: direction === 'close',
  }
}

function buildFailureReasons(input: {
  rawMessage: string
  sample: SampleInput
  packagingTypeComparison: ReturnType<typeof buildPackagingTypeComparison>
  termCoverage: ReturnType<typeof buildTermCoverage>
  lineItemAlignment: ReturnType<typeof buildLineItemAlignment>
  decisionBoundary: ReturnType<typeof buildDecisionBoundary>
  priceDeviationProxy: ReturnType<typeof buildPriceDeviationProxy>
}): Array<{ bucket: FailureBucket; reason: string }> {
  const failures: Array<{ bucket: FailureBucket; reason: string }> = []

  if (!input.rawMessage.trim()) {
    failures.push({ bucket: 'input_incomplete', reason: '样本缺少可运行的原始输入，无法稳定推导 phase-one 与 second-phase 结果。' })
  }

  if (!input.packagingTypeComparison.secondPhaseMatched) {
    failures.push({ bucket: 'packaging_type', reason: 'second-phase 主类归并未命中真实样本期望主类。' })
  }

  if (input.termCoverage.availability === 'available' && !input.termCoverage.passes) {
    failures.push({ bucket: 'term_coverage', reason: 'second-phase 关键术语命中不完整，或 unresolved terms 仍阻塞判断。' })
  }

  if (input.lineItemAlignment.availability === 'available' && !input.lineItemAlignment.passes) {
    failures.push({ bucket: 'line_item_alignment', reason: 'second-phase 核心 line-item 仍未对齐真实报价单主骨架。' })
  }

  if (!input.decisionBoundary.passes) {
    failures.push({ bucket: 'decision_boundary', reason: 'second-phase quoted / estimated / handoff 判断未命中样本期望边界。' })
  }

  if (input.priceDeviationProxy.availability === 'available' && !input.priceDeviationProxy.passes) {
    failures.push({
      bucket: 'price_deviation',
      reason: input.sample.bomEvidence === 'flat_quote_only'
        ? 'flat quoted 参考样本与 shadow subtotal 方向性偏差仍较大，但该信号只用于参考，不应直接当作 BOM-rich 放行依据。'
        : 'BOM-rich 主路径样本与真实金额方向性偏差仍较大，需要继续校准 line-item 模板。',
    })
  }

  return failures
}

function buildSampleGrayGate(input: {
  sample: SampleInput
  rawMessage: string
  packagingTypeComparison: ReturnType<typeof buildPackagingTypeComparison>
  termCoverage: ReturnType<typeof buildTermCoverage>
  lineItemAlignment: ReturnType<typeof buildLineItemAlignment>
  decisionBoundary: ReturnType<typeof buildDecisionBoundary>
  priceDeviationProxy: ReturnType<typeof buildPriceDeviationProxy>
  secondPhase: SecondPhaseAlignmentComparableResult
  phaseOne: PhaseOneAlignmentComparableResult
}) {
  const internalFailedChecks: string[] = []
  const limitedFailedChecks: string[] = []
  const quotedExpected = input.sample.expectedDecision === 'quoted'
  const flatQuotedReference = input.sample.evaluationRole === 'flat_quote_reference_only' || input.sample.bomEvidence === 'flat_quote_only'
  const bomRichQuotedCandidate = quotedExpected && !flatQuotedReference

  if (!input.rawMessage.trim()) {
    internalFailedChecks.push('sample_input_incomplete')
  }

  if (!input.packagingTypeComparison.secondPhaseMatched) {
    internalFailedChecks.push('packaging_type_not_aligned')
  }

  if (!input.decisionBoundary.passes) {
    internalFailedChecks.push('decision_boundary_not_aligned')
  }

  if (quotedExpected && !input.termCoverage.passes) {
    internalFailedChecks.push('quoted_candidate_term_coverage_unstable')
  }

  if (bomRichQuotedCandidate && !input.lineItemAlignment.passes) {
    internalFailedChecks.push('quoted_candidate_line_items_incomplete')
  }

  if (input.sample.expectedDecision !== 'quoted' && isMoreConservative(input.secondPhase.shadow?.shadowStatus, input.sample.expectedDecision) === false && input.secondPhase.shadow?.shadowStatus !== input.sample.expectedDecision) {
    internalFailedChecks.push('non_quoted_boundary_not_preserved')
  }

  if (input.sample.expectedDecision !== 'quoted' && isMoreConservative(input.secondPhase.shadow?.shadowStatus, input.phaseOne.status) === false && input.secondPhase.shadow?.shadowStatus === 'quoted') {
    internalFailedChecks.push('aggressive_regression_against_phase_one')
  }

  if (!input.sample.grayCandidate) {
    limitedFailedChecks.push('sample_not_marked_as_gray_candidate')
  }

  if (input.sample.expectedDecision !== 'quoted') {
    limitedFailedChecks.push('expected_decision_not_quoted')
  }

  if (internalFailedChecks.length > 0) {
    limitedFailedChecks.push('internal_compare_observation_not_ready')
  }

  if (quotedExpected && !input.termCoverage.passes) {
    limitedFailedChecks.push('critical_terms_not_stable')
  }

  if (bomRichQuotedCandidate && !input.lineItemAlignment.passes) {
    limitedFailedChecks.push('core_line_items_not_fully_aligned')
  }

  if (bomRichQuotedCandidate && input.lineItemAlignment.manualAdjustmentPresent) {
    limitedFailedChecks.push('manual_adjustment_still_on_core_path')
  }

  if (bomRichQuotedCandidate && input.priceDeviationProxy.availability === 'available' && !input.priceDeviationProxy.passes) {
    limitedFailedChecks.push('price_proxy_not_close_enough')
  }

  return {
    internalCompareObservation: {
      passes: internalFailedChecks.length === 0,
      failedChecks: internalFailedChecks,
    },
    limitedProductRole: {
      passes: limitedFailedChecks.length === 0,
      failedChecks: limitedFailedChecks,
    },
  }
}

function deriveOverallCloser(packagingCloser: CloserToExpected, decisionCloser: CloserToExpected): CloserToExpected {
  const counts = {
    phase_one: 0,
    second_phase: 0,
  }

  if (packagingCloser === 'phase_one') counts.phase_one += 1
  if (decisionCloser === 'phase_one') counts.phase_one += 1
  if (packagingCloser === 'second_phase') counts.second_phase += 1
  if (decisionCloser === 'second_phase') counts.second_phase += 1

  if (counts.phase_one === counts.second_phase) {
    return counts.phase_one === 0 ? 'neither' : 'tie'
  }

  return counts.second_phase > counts.phase_one ? 'second_phase' : 'phase_one'
}

function evaluateSingleSample(input: ComplexPackagingAlignmentRunnerSampleInput): ComplexPackagingAlignmentSampleResult {
  const sample = normalizeSample(input.sample)
  const rawMessage = input.rawMessage || buildSampleMessage(sample)
  const phaseOne = coercePhaseOneResult(input.phaseOneResult, derivePhaseOneResult(rawMessage))
  const secondPhase = coerceSecondPhaseResult(input.secondPhaseResult, deriveSecondPhaseResult(rawMessage, phaseOne))
  const packagingTypeComparison = buildPackagingTypeComparison(sample, phaseOne, secondPhase)
  const termCoverage = buildTermCoverage(sample, secondPhase)
  const lineItemAlignment = buildLineItemAlignment(sample, secondPhase)
  const decisionBoundary = buildDecisionBoundary(sample, phaseOne, secondPhase)
  const priceDeviationProxy = buildPriceDeviationProxy(sample, secondPhase)
  const keyFailureReasons = buildFailureReasons({
    rawMessage,
    sample,
    packagingTypeComparison,
    termCoverage,
    lineItemAlignment,
    decisionBoundary,
    priceDeviationProxy,
  })
  const grayGate = buildSampleGrayGate({
    sample,
    rawMessage,
    packagingTypeComparison,
    termCoverage,
    lineItemAlignment,
    decisionBoundary,
    priceDeviationProxy,
    secondPhase,
    phaseOne,
  })

  return {
    sampleId: sample.sampleId || 'unknown_sample',
    rawMessage,
    expected: {
      packagingType: sample.packagingTypeExpected,
      variantTags: sample.variantTagsExpected || [],
      decision: sample.expectedDecision,
      grayCandidate: Boolean(sample.grayCandidate),
      bomEvidence: sample.bomEvidence,
      evaluationRole: sample.evaluationRole,
    },
    phaseOne,
    secondPhase: {
      packagingType: secondPhase.shadow?.packagingType,
      variantTags: secondPhase.shadow?.variantTags || [],
      status: secondPhase.shadow?.shadowStatus,
      recognizedTerms: secondPhase.recognizedTerms,
      unresolvedTerms: secondPhase.shadow?.unresolvedTerms || secondPhase.unknownTerms.map((item) => item.term),
      blockingUnknownTerms: secondPhase.shadow?.blockingUnknownTerms || secondPhase.unknownTerms.filter((item) => item.severity === 'blocking').map((item) => item.term),
      nonBlockingUnknownTerms: secondPhase.shadow?.nonBlockingUnknownTerms || secondPhase.unknownTerms.filter((item) => item.severity === 'non_blocking').map((item) => item.term),
      lineItemCodes: secondPhase.shadow?.lineItems?.map((line) => line.lineCode) || [],
      subtotal: secondPhase.shadow?.subtotal,
      quotedChecks: secondPhase.shadow?.quotedChecks || secondPhase.quotedChecks,
    },
    packagingTypeComparison,
    termCoverage,
    lineItemAlignment,
    decisionBoundary,
    priceDeviationProxy,
    grayGate,
    overallCloserToExpected: deriveOverallCloser(packagingTypeComparison.closerToExpected, decisionBoundary.closerToExpected),
    keyFailureReasons,
  }
}

function buildOverallSummary(
  results: ComplexPackagingAlignmentSampleResult[],
  options?: ComplexPackagingAlignmentSummaryOptions
) {
  const secondPhaseCloserCount = results.filter((item) => item.overallCloserToExpected === 'second_phase').length
  const phaseOneCloserCount = results.filter((item) => item.overallCloserToExpected === 'phase_one').length
  const tieCount = results.filter((item) => item.overallCloserToExpected === 'tie').length
  const neitherCount = results.filter((item) => item.overallCloserToExpected === 'neither').length
  const failureBucketCounts: Record<FailureBucket, number> = {
    packaging_type: 0,
    term_coverage: 0,
    line_item_alignment: 0,
    decision_boundary: 0,
    price_deviation: 0,
    input_incomplete: 0,
  }

  for (const result of results) {
    for (const failure of result.keyFailureReasons) {
      failureBucketCounts[failure.bucket] += 1
    }
  }

  const gateFailures: string[] = []
  const typeNotWorseCount = results.filter((item) => item.packagingTypeComparison.closerToExpected !== 'phase_one').length
  const quotedCandidates = results.filter((item) => item.expected.decision === 'quoted')
  const bomRichQuotedCandidates = quotedCandidates.filter((item) => item.expected.bomEvidence !== 'flat_quote_only')
  const bomRichQuotedPriceFailures = bomRichQuotedCandidates.filter((item) => item.priceDeviationProxy.availability === 'available' && !item.priceDeviationProxy.passes)
  const coverageTypeSet = new Set(results.map((item) => item.expected.packagingType).filter(Boolean))
  const coverageDecisionSet = new Set(results.map((item) => item.expected.decision).filter(Boolean))
  const requiredPackagingTypes = options?.requiredPackagingTypes ?? ['folding_carton', 'tuck_end_box', 'mailer_box']
  const requiredDecisions = options?.requiredDecisions ?? ['quoted', 'estimated', 'handoff_required']

  if (requiredPackagingTypes.some((packagingType) => !coverageTypeSet.has(packagingType))) {
    gateFailures.push('sample_coverage_minimum: 未覆盖首批全部核心盒型')
  }

  if (requiredDecisions.some((decision) => !coverageDecisionSet.has(decision))) {
    gateFailures.push('sample_coverage_minimum: 未覆盖 quoted / estimated / handoff 三种边界')
  }

  if (results.length > 0 && typeNotWorseCount <= results.length / 2) {
    gateFailures.push('type_alignment_majority: second-phase 主类归并未达到多数样本“不差于 phase-one”')
  }

  if (quotedCandidates.some((item) => !item.termCoverage.passes)) {
    gateFailures.push(`critical_term_stability: quoted 候选样本的关键术语命中仍不稳定 (${quotedCandidates.filter((item) => !item.termCoverage.passes).map((item) => item.sampleId).join(', ')})`)
  }

  if (bomRichQuotedCandidates.some((item) => !item.lineItemAlignment.passes)) {
    gateFailures.push(`core_line_items_present: BOM-rich quoted 候选样本仍缺核心 line-item 对齐证据 (${bomRichQuotedCandidates.filter((item) => !item.lineItemAlignment.passes).map((item) => item.sampleId).join(', ')})`)
  }

  if (results.some((item) => item.expected.decision !== 'quoted' && item.secondPhase.status === 'quoted')) {
    gateFailures.push(`no_aggressive_regression: 非 quoted 边界样本被 second-phase 过度放行 (${results.filter((item) => item.expected.decision !== 'quoted' && item.secondPhase.status === 'quoted').map((item) => item.sampleId).join(', ')})`)
  }

  if (bomRichQuotedPriceFailures.length > 0) {
    gateFailures.push(`price_deviation_proxy: BOM-rich quoted 样本价格代理偏差仍偏大 (${bomRichQuotedPriceFailures.map((item) => item.sampleId).join(', ')})`)
  }

  const internalCompareObservationEligible = gateFailures.length === 0

  if (results.some((item) => item.grayGate.limitedProductRole.passes === false && item.expected.grayCandidate)) {
    gateFailures.push(`family_specific_stability: 灰度候选子场景仍未稳定通过样本对齐 (${results.filter((item) => item.expected.grayCandidate && item.grayGate.limitedProductRole.passes === false).map((item) => item.sampleId).join(', ')})`)
  }

  const limitedProductRoleEligible = internalCompareObservationEligible
    && results.filter((item) => item.expected.grayCandidate).length > 0
    && results.filter((item) => item.expected.grayCandidate).every((item) => item.grayGate.limitedProductRole.passes)

  return {
    secondPhaseCloserCount,
    phaseOneCloserCount,
    tieCount,
    neitherCount,
    internalCompareObservationEligible,
    limitedProductRoleEligible,
    gateFailures,
    failureBucketCounts,
  }
}

export function runComplexPackagingAlignmentEvaluation(
  samples: ReadonlyArray<ComplexPackagingAlignmentRunnerSampleInput>,
  options?: ComplexPackagingAlignmentSummaryOptions
): ComplexPackagingAlignmentRunnerResult {
  const evaluatedSamples = samples.map((sample) => evaluateSingleSample(sample))

  return {
    runnerVersion: 'complex_packaging_alignment_runner_v1',
    sampleCount: evaluatedSamples.length,
    evaluatedSamples,
    overallSummary: buildOverallSummary(evaluatedSamples, options),
  }
}

export function runFirstBatchComplexPackagingAlignmentEvaluation(): ComplexPackagingAlignmentRunnerResult {
  return runComplexPackagingAlignmentEvaluation(
    SECOND_PHASE_FIRST_BATCH_ALIGNMENT_EVALUATION_SAMPLES_DRAFT.map((sample) => ({ sample }))
  )
}

export function runFoldingCartonFocusedAlignmentEvaluation(): ComplexPackagingAlignmentRunnerResult {
  return runComplexPackagingAlignmentEvaluation(
    SECOND_PHASE_FOLDING_CARTON_FOCUSED_EVALUATION_SAMPLES_DRAFT.map((sample) => ({ sample })),
    {
      requiredPackagingTypes: ['folding_carton'],
      requiredDecisions: ['quoted', 'estimated'],
    }
  )
}
