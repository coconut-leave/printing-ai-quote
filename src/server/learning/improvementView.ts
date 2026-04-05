import {
  buildReflectionContextSummary,
} from '@/lib/reflection/context'
import { buildImprovementActionDraft } from './improvementActionDraft'
import { buildPackagingImprovementAttribution } from './packagingImprovementSuggestion'
import {
  classifyImprovementType,
  deriveImpactArea,
  generateImplementationHint,
  generateImprovementId,
  generateSummary,
  generateTitle,
  type ImprovementSuggestion,
} from './improvementSuggestion'
import {
  getImprovementImplementedAt,
  getImprovementLastActionAt,
  getImprovementNote,
  getImprovementStatus,
  getImprovementSummary,
  getImprovementTargetFileHint,
  getImprovementVerificationNote,
  getImprovementVerifiedAt,
} from './improvementStore'

export type ReflectionForImprovement = {
  id: number
  conversationId: number
  issueType: string
  suggestionDraft: string
  originalExtractedParams?: Record<string, any> | null
  correctedParams?: Record<string, any> | null
  createdAt: Date | string
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

export function buildImprovementSuggestion(reflection: ReflectionForImprovement): ImprovementSuggestion {
  const createdAt = toDate(reflection.createdAt)
  const packagingAttribution = buildPackagingImprovementAttribution({
    issueType: reflection.issueType,
    originalExtractedParams: reflection.originalExtractedParams,
    correctedParams: reflection.correctedParams,
  })
  const effectiveSuggestionDraft = packagingAttribution?.suggestionDraft || reflection.suggestionDraft
  const suggestionType = packagingAttribution?.suggestionType || classifyImprovementType(
    reflection.issueType,
    effectiveSuggestionDraft,
    reflection.correctedParams || undefined
  )
  const hint = generateImplementationHint(reflection.issueType, suggestionType, effectiveSuggestionDraft)
  const impactArea = packagingAttribution?.impactArea || deriveImpactArea({
    issueType: reflection.issueType,
    suggestionType,
    targetArea: hint.targetArea,
    suggestionDraft: effectiveSuggestionDraft,
    correctedParams: reflection.correctedParams || undefined,
  })
  const actionDraft = buildImprovementActionDraft({
    issueType: reflection.issueType,
    suggestionType,
    targetArea: hint.targetArea,
    targetFileHint: packagingAttribution?.targetFileHint || hint.targetFileHint,
    title: packagingAttribution?.title || generateTitle(reflection.issueType, suggestionType, effectiveSuggestionDraft),
    suggestionDraft: effectiveSuggestionDraft,
    issueSummary: packagingAttribution?.issueSummary,
    diffCategory: packagingAttribution?.diffCategory,
    whyItHappened: packagingAttribution?.whyItHappened,
    suggestedActionHint: packagingAttribution?.suggestedActionHint,
    correctedParams: reflection.correctedParams || undefined,
  })
  const improvementId = generateImprovementId(reflection.id, createdAt)
  const contextSummary = buildReflectionContextSummary(
    reflection.originalExtractedParams || undefined,
    reflection.correctedParams || undefined
  )

  return {
    id: improvementId,
    sourceReflectionId: reflection.id,
    reflectionId: reflection.id,
    conversationId: reflection.conversationId,
    issueType: reflection.issueType,
    suggestionType,
    targetArea: actionDraft?.targetArea || hint.targetArea,
    impactArea,
    targetFileHint: getImprovementTargetFileHint(improvementId) || actionDraft?.targetFileHint || packagingAttribution?.targetFileHint || hint.targetFileHint,
    implementationNote: getImprovementNote(improvementId) || actionDraft?.implementationNote || packagingAttribution?.suggestedActionHint || hint.implementationNote,
    implementationSummary: getImprovementSummary(improvementId),
    verificationNote: getImprovementVerificationNote(improvementId),
    title: packagingAttribution?.title || generateTitle(reflection.issueType, suggestionType, effectiveSuggestionDraft),
    summary: packagingAttribution?.summary || generateSummary(effectiveSuggestionDraft),
    suggestionDraft: effectiveSuggestionDraft,
    actionDraft,
    issueSummary: packagingAttribution?.issueSummary,
    diffCategory: packagingAttribution?.diffCategory,
    confidence: packagingAttribution?.confidence,
    whyItHappened: packagingAttribution?.whyItHappened,
    suggestedActionHint: packagingAttribution?.suggestedActionHint,
    originalExtractedParams: reflection.originalExtractedParams || undefined,
    correctedParams: reflection.correctedParams || undefined,
    contextSummary: contextSummary || undefined,
    status: getImprovementStatus(improvementId),
    createdAt,
    lastActionAt: getImprovementLastActionAt(improvementId),
    implementedAt: getImprovementImplementedAt(improvementId),
    verifiedAt: getImprovementVerifiedAt(improvementId),
  }
}

export function buildImprovementSuggestions(reflections: ReflectionForImprovement[]): ImprovementSuggestion[] {
  return reflections
    .map(buildImprovementSuggestion)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}