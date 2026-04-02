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
  const suggestionType = classifyImprovementType(
    reflection.issueType,
    reflection.suggestionDraft,
    reflection.correctedParams || undefined
  )
  const hint = generateImplementationHint(suggestionType, reflection.suggestionDraft)
  const impactArea = deriveImpactArea({
    issueType: reflection.issueType,
    suggestionType,
    targetArea: hint.targetArea,
    suggestionDraft: reflection.suggestionDraft,
    correctedParams: reflection.correctedParams || undefined,
  })
  const improvementId = generateImprovementId(reflection.id, createdAt)

  return {
    id: improvementId,
    sourceReflectionId: reflection.id,
    reflectionId: reflection.id,
    conversationId: reflection.conversationId,
    issueType: reflection.issueType,
    suggestionType,
    targetArea: hint.targetArea,
    impactArea,
    targetFileHint: getImprovementTargetFileHint(improvementId) || hint.targetFileHint,
    implementationNote: getImprovementNote(improvementId) || hint.implementationNote,
    implementationSummary: getImprovementSummary(improvementId),
    verificationNote: getImprovementVerificationNote(improvementId),
    title: generateTitle(reflection.issueType, suggestionType, reflection.suggestionDraft),
    summary: generateSummary(reflection.suggestionDraft),
    suggestionDraft: reflection.suggestionDraft,
    originalExtractedParams: reflection.originalExtractedParams || undefined,
    correctedParams: reflection.correctedParams || undefined,
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