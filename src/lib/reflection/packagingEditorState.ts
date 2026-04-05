import { mergeReflectionPackagingContext } from '@/lib/reflection/context'
import {
  buildOriginalExtractedParams,
  buildPackagingCorrectedParamsDraft,
  updatePackagingDraftRequiresHumanReview,
  type PackagingCorrectedParamsDraft,
} from '@/lib/reflection/packagingCorrectedParams'
import {
  isPackagingReflectionIssueType,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'

type JsonRecord = Record<string, any>

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function applyIssueTypeDefaults(
  draft: PackagingCorrectedParamsDraft,
  issueType: ReflectionIssueType
): PackagingCorrectedParamsDraft {
  if (issueType === 'SHOULD_HANDOFF_BUT_NOT') {
    return updatePackagingDraftRequiresHumanReview(draft, true)
  }

  if (issueType === 'SHOULD_QUOTED_BUT_ESTIMATED') {
    return updatePackagingDraftRequiresHumanReview(draft, false)
  }

  return draft
}

export function buildPackagingDraftSeed(input: {
  issueType: ReflectionIssueType
  originalExtractedParams?: JsonRecord | null
  correctedParams?: JsonRecord | null
  metadata?: JsonRecord
  latestQuote?: any
}): PackagingCorrectedParamsDraft | null {
  if (!isPackagingReflectionIssueType(input.issueType)) {
    return null
  }

  const originalExtractedParams = input.originalExtractedParams
    || buildOriginalExtractedParams(undefined, input.metadata, input.latestQuote)

  const correctedParams = isObject(input.correctedParams) ? input.correctedParams : undefined
  const mergedPackagingContext = mergeReflectionPackagingContext(originalExtractedParams, correctedParams)
  const draftSource = mergedPackagingContext
    ? {
        ...(originalExtractedParams || {}),
        ...(correctedParams || {}),
        packagingContext: mergedPackagingContext,
        productType: typeof correctedParams?.productType === 'string'
          ? correctedParams.productType
          : typeof originalExtractedParams?.productType === 'string'
            ? originalExtractedParams.productType
            : mergedPackagingContext.mainItem?.productType,
        isBundle: (mergedPackagingContext.subItems?.length || 0) > 0,
      }
    : correctedParams || originalExtractedParams

  const draft = buildPackagingCorrectedParamsDraft({
    issueType: input.issueType,
    originalExtractedParams: draftSource || undefined,
    metadata: input.metadata,
    latestQuote: input.latestQuote,
  })

  return draft ? applyIssueTypeDefaults(draft, input.issueType) : null
}

export function resolvePackagingDraftOnIssueTypeChange(input: {
  nextIssueType: ReflectionIssueType
  currentDraft: PackagingCorrectedParamsDraft | null
  seedDraft: PackagingCorrectedParamsDraft | null
}): PackagingCorrectedParamsDraft | null {
  if (!isPackagingReflectionIssueType(input.nextIssueType)) {
    return input.currentDraft
  }

  const nextDraft = input.currentDraft || input.seedDraft
  if (!nextDraft) {
    return null
  }

  return applyIssueTypeDefaults(nextDraft, input.nextIssueType)
}