import { createSuccessResponse, withErrorHandler } from '@/server/api/response'
import { getApprovedReflections } from '@/server/db/conversations'
import {
  buildActionDraftDashboardStats,
  type ActionDraftDashboardFilters,
} from '@/server/learning/actionDraftDashboard'
import type {
  ImprovementActionChangeType,
  ImprovementActionRiskLevel,
  ImprovementSuggestionStatus,
  ImprovementTargetArea,
} from '@/server/learning/improvementSuggestion'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: ImprovementSuggestionStatus[] = [
  'NEW',
  'REVIEWED',
  'ACCEPTED',
  'IMPLEMENTED',
  'VERIFIED',
  'REJECTED',
]

const VALID_TARGET_AREAS: ImprovementTargetArea[] = [
  'PROMPT',
  'REGEX',
  'FIELD_MAPPING',
  'ESTIMATE',
  'HANDOFF_POLICY',
  'OTHER',
]

const VALID_CHANGE_TYPES: ImprovementActionChangeType[] = [
  'prompt_update',
  'mapping_update',
  'extraction_rule_update',
  'threshold_update',
  'policy_update',
  'pricing_rule_review',
  'test_only_update',
  'other_update',
]

const VALID_RISK_LEVELS: ImprovementActionRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH']

function parseTimeRange(value: string | null): ActionDraftDashboardFilters['timeRangeDays'] {
  if (!value || value === 'ALL') {
    return 'ALL'
  }

  const parsed = Number(value)
  if (parsed === 7 || parsed === 30 || parsed === 90) {
    return parsed
  }

  return 'ALL'
}

export async function GET(request: Request) {
  return withErrorHandler(async () => {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const targetAreaParam = url.searchParams.get('targetArea')
    const changeTypeParam = url.searchParams.get('changeType')
    const riskLevelParam = url.searchParams.get('riskLevel')

    const filters: ActionDraftDashboardFilters = {
      timeRangeDays: parseTimeRange(url.searchParams.get('timeRangeDays')),
      status: statusParam && VALID_STATUSES.includes(statusParam as ImprovementSuggestionStatus)
        ? statusParam as ImprovementSuggestionStatus
        : 'ALL',
      targetArea: targetAreaParam && VALID_TARGET_AREAS.includes(targetAreaParam as ImprovementTargetArea)
        ? targetAreaParam as ImprovementTargetArea
        : 'ALL',
      changeType: changeTypeParam && VALID_CHANGE_TYPES.includes(changeTypeParam as ImprovementActionChangeType)
        ? changeTypeParam as ImprovementActionChangeType
        : 'ALL',
      riskLevel: riskLevelParam && VALID_RISK_LEVELS.includes(riskLevelParam as ImprovementActionRiskLevel)
        ? riskLevelParam as ImprovementActionRiskLevel
        : 'ALL',
    }

    const { records } = await getApprovedReflections(2000, 0)

    const stats = buildActionDraftDashboardStats({
      approvedReflections: records.map((item) => ({
        id: item.id,
        conversationId: item.conversationId,
        issueType: item.issueType,
        suggestionDraft: item.suggestionDraft,
        originalExtractedParams: item.originalExtractedParams as Record<string, any> | null,
        correctedParams: item.correctedParams as Record<string, any> | null,
        createdAt: item.createdAt,
      })),
      filters,
    })

    return createSuccessResponse(stats)
  }, 'action-draft-dashboard')
}