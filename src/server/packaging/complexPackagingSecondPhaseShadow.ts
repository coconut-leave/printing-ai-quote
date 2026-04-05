import { extractComplexPackagingSecondPhaseDraft } from './extractComplexPackagingSecondPhase'
import {
  SECOND_PHASE_INITIAL_SCOPE_DRAFT,
  type SecondPhaseDecisionStatusDraft,
  type SecondPhasePackagingFamilyDraft,
  type SecondPhaseShadowPayloadDraft,
} from './secondPhaseDraft'
import { calculateSecondPhaseShadowQuote } from '@/server/pricing/complexPackagingSecondPhaseQuote'

type PhaseOneComparableInput = {
  phaseOneProductType?: string
  phaseOneStatus?: string
}

type ShadowInput = PhaseOneComparableInput & {
  message: string
}

function isInitialScope(packagingType?: string): boolean {
  return SECOND_PHASE_INITIAL_SCOPE_DRAFT.includes(packagingType as typeof SECOND_PHASE_INITIAL_SCOPE_DRAFT[number])
}

function normalizeStatus(status?: string): SecondPhaseDecisionStatusDraft | undefined {
  if (status === 'quoted' || status === 'estimated' || status === 'handoff_required') {
    return status
  }

  return undefined
}

function mapPhaseOneProductTypeToFamily(productType?: string): SecondPhasePackagingFamilyDraft | undefined {
  switch (productType) {
    case 'folding_carton':
    case 'auto_lock_bottom_box':
      return 'folding_carton'
    case 'tuck_end_box':
      return 'tuck_end_box'
    case 'mailer_box':
      return 'mailer_box'
    case 'window_box':
      return 'window_box'
    case 'lid_base_box':
      return 'rigid_box'
    case 'outer_carton':
      return 'outer_carton'
    case 'card_set_or_kit':
      return 'card_set_or_kit'
    case 'leaflet_insert':
      return 'leaflet'
    case 'box_insert':
      return 'insert'
    default:
      return undefined
  }
}

export function buildComplexPackagingSecondPhaseShadow(input: ShadowInput): SecondPhaseShadowPayloadDraft | null {
  const request = extractComplexPackagingSecondPhaseDraft(input.message)
  if (!request) {
    return null
  }

  const computation = calculateSecondPhaseShadowQuote(request)
  const item = request.items[0]
  const packagingFamily = item?.finishedGoods.packagingFamily
  const packagingType = item?.finishedGoods.packagingType
  const shadowStatus = computation.status
  const phaseOneStatus = normalizeStatus(input.phaseOneStatus)
  const phaseOnePackagingFamily = mapPhaseOneProductTypeToFamily(input.phaseOneProductType)
  const blockingUnknownTerms = item?.unknownTerms.filter((term) => term.severity === 'blocking').map((term) => term.term) || []
  const nonBlockingUnknownTerms = item?.unknownTerms.filter((term) => term.severity === 'non_blocking').map((term) => term.term) || []
  const manualAdjustmentPresent = computation.lineItems.some((line) => line.lineCode === 'manual_adjustment')
  const enteredDeferredOrHandoff = !isInitialScope(packagingType) || shadowStatus === 'handoff_required'

  return {
    schemaVersion: 'second_phase_v1_draft',
    applicable: request.items[0]?.finishedGoods.packagingType === 'leaflet_insert' || request.items[0]?.finishedGoods.packagingType === 'seal_sticker'
      ? 'flat_print'
      : request.items[0]?.finishedGoods.packagingType && !isInitialScope(request.items[0].finishedGoods.packagingType)
        ? request.items[0].finishedGoods.packagingType === 'window_box' || request.items[0].finishedGoods.packagingType === 'auto_lock_bottom_box' || request.items[0].finishedGoods.packagingType === 'lid_base_box' || request.items[0].finishedGoods.packagingType === 'outer_carton' || request.items[0].finishedGoods.packagingType === 'card_set_or_kit'
          ? 'deferred_type'
          : 'in_scope'
        : 'in_scope',
    inInitialScope: isInitialScope(packagingType),
    deferred: !isInitialScope(packagingType),
    packagingFamily,
    packagingType,
    variantTags: item?.finishedGoods.variantTags || [],
    shadowStatus,
    statusReasons: computation.statusReasons,
    quotedChecks: computation.quotedChecks,
    unresolvedTerms: request.unresolvedTerms,
    blockingUnknownTerms,
    nonBlockingUnknownTerms,
    lineItems: computation.lineItems.map((line) => ({
      id: line.id,
      lineCode: line.lineCode,
      displayName: line.displayName,
      subtotal: line.subtotal,
    })),
    subtotal: computation.subtotal,
    parseWarnings: request.parseWarnings,
    usedForResponse: false,
    diffSummary: {
      familyMergeAligned: !phaseOnePackagingFamily || phaseOnePackagingFamily === packagingFamily,
      packagingTypeAligned: !input.phaseOneProductType || input.phaseOneProductType === packagingType,
      statusAligned: !phaseOneStatus || phaseOneStatus === shadowStatus,
      phaseOnePackagingFamily,
      secondPhasePackagingFamily: packagingFamily,
      phaseOneProductType: input.phaseOneProductType,
      secondPhasePackagingType: packagingType,
      phaseOneStatus,
      secondPhaseStatus: shadowStatus,
      manualAdjustmentPresent,
      enteredDeferredOrHandoff,
      keyUnresolvedTerms: Array.from(new Set([...blockingUnknownTerms, ...nonBlockingUnknownTerms])),
    },
  }
}