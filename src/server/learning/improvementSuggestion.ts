// Lightweight improvement suggestion types
// Derived from APPROVED reflections - no new database table initially

import { getReflectionIssueTypeLabel } from '@/lib/reflection/issueTypes'

export type ImprovementSuggestionType =
  | 'PROMPT_IMPROVEMENT'
  | 'REGEX_IMPROVEMENT'
  | 'FIELD_MAPPING_IMPROVEMENT'
  | 'ESTIMATE_DEFAULT_IMPROVEMENT'
  | 'HANDOFF_POLICY_IMPROVEMENT'
  | 'OTHER'

export type ImprovementSuggestionStatus =
  | 'NEW'
  | 'REVIEWED'
  | 'ACCEPTED'
  | 'IMPLEMENTED'
  | 'VERIFIED'
  | 'REJECTED'
export type ImprovementTargetArea =
  | 'PROMPT'
  | 'REGEX'
  | 'FIELD_MAPPING'
  | 'ESTIMATE'
  | 'HANDOFF_POLICY'
  | 'OTHER'

export type ImprovementImpactArea =
  | 'CONSULTATION'
  | 'RECOMMENDATION'
  | 'PATCH'
  | 'PRICING'
  | 'HANDOFF'
  | 'OTHER'

export type ImprovementActionChangeType =
  | 'prompt_update'
  | 'mapping_update'
  | 'extraction_rule_update'
  | 'threshold_update'
  | 'policy_update'
  | 'pricing_rule_review'
  | 'test_only_update'
  | 'other_update'

export type ImprovementActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ImprovementActionDraft {
  actionTitle: string
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
  targetFileHint?: string
  implementationNote: string
  testHint: string
  riskLevel: ImprovementActionRiskLevel
}

export type ImprovementDiffCategory =
  | 'PARAM_RECOGNITION'
  | 'BUNDLE_STRUCTURE'
  | 'QUOTE_BOUNDARY'
  | 'REVIEW_POLICY'
  | 'PRICING_JUDGMENT'
  | 'OTHER'

export interface ImprovementSuggestion {
  id: string // derived from reflection_id + hash
  sourceReflectionId: number
  reflectionId: number
  conversationId: number
  issueType: string // from reflection
  suggestionType: ImprovementSuggestionType
  targetArea: ImprovementTargetArea
  impactArea: ImprovementImpactArea
  targetFileHint?: string
  implementationNote: string
  implementationSummary?: string
  verificationNote?: string
  title: string
  summary: string
  suggestionDraft: string
  actionDraft?: ImprovementActionDraft
  issueSummary?: string
  diffCategory?: ImprovementDiffCategory
  confidence?: number
  whyItHappened?: string
  suggestedActionHint?: string
  originalExtractedParams?: Record<string, any>
  correctedParams?: Record<string, any>
  contextSummary?: string
  status: ImprovementSuggestionStatus // stored in JSON for now
  createdAt: Date
  lastActionAt?: string
  implementedAt?: string
  verifiedAt?: string
}

/**
 * Infer improvement type from reflection issueType and suggestion draft
 * Lightweight heuristic-based classification
 */
export function classifyImprovementType(
  issueType: string,
  suggestionDraft: string,
  correctedParams?: Record<string, any>
): ImprovementSuggestionType {
  const lower = suggestionDraft.toLowerCase()
  const correctedKeys = correctedParams ? Object.keys(correctedParams) : []
  const hasPatchOrRecommendationSignal =
    lower.includes('patch') ||
    lower.includes('推荐方案') ||
    lower.includes('recommendedparams') ||
    lower.includes('方案')

  // 1) Direct keyword hints from suggestion draft
  if (
    lower.includes('提示词') ||
    lower.includes('prompt') ||
    lower.includes('llm') ||
    lower.includes('ai生成')
  ) {
    return 'PROMPT_IMPROVEMENT'
  }

  if (
    lower.includes('正则') ||
    lower.includes('regex') ||
    lower.includes('pattern') ||
    lower.includes('提取')
  ) {
    return 'REGEX_IMPROVEMENT'
  }

  if (
    lower.includes('映射') ||
    lower.includes('mapping') ||
    lower.includes('字段') ||
    lower.includes('对应')
  ) {
    return 'FIELD_MAPPING_IMPROVEMENT'
  }

  if (
    lower.includes('估算') ||
    lower.includes('默认') ||
    lower.includes('estimate') ||
    lower.includes('default')
  ) {
    return 'ESTIMATE_DEFAULT_IMPROVEMENT'
  }

  if (
    lower.includes('转人工') ||
    lower.includes('handoff') ||
    lower.includes('人工') ||
    lower.includes('policy')
  ) {
    return 'HANDOFF_POLICY_IMPROVEMENT'
  }

  // 2) Lightweight issueType + corrected params fallback
  if (issueType === 'SHOULD_HANDOFF') {
    return 'HANDOFF_POLICY_IMPROVEMENT'
  }

  if (issueType === 'SHOULD_HANDOFF_BUT_NOT' || issueType === 'PACKAGING_REVIEW_REASON_WRONG') {
    return 'HANDOFF_POLICY_IMPROVEMENT'
  }

  if (issueType === 'PARAM_MISSING') {
    return 'ESTIMATE_DEFAULT_IMPROVEMENT'
  }

  if (issueType === 'PACKAGING_PARAM_MISSING' || issueType === 'PACKAGING_PARAM_WRONG') {
    return 'FIELD_MAPPING_IMPROVEMENT'
  }

  if (issueType === 'BUNDLE_STRUCTURE_WRONG') {
    return 'PROMPT_IMPROVEMENT'
  }

  if (
    issueType === 'PARAM_WRONG' &&
    correctedKeys.some((k) => k.toLowerCase().includes('paper') || k.toLowerCase().includes('weight') || k.toLowerCase().includes('type'))
  ) {
    return 'FIELD_MAPPING_IMPROVEMENT'
  }

  if (issueType === 'QUOTE_INACCURATE') {
    if (hasPatchOrRecommendationSignal) {
      return 'OTHER'
    }

    return 'ESTIMATE_DEFAULT_IMPROVEMENT'
  }

  if (
    issueType === 'PACKAGING_PRICE_INACCURATE'
    || issueType === 'SHOULD_ESTIMATE_BUT_QUOTED'
    || issueType === 'SHOULD_QUOTED_BUT_ESTIMATED'
  ) {
    return 'ESTIMATE_DEFAULT_IMPROVEMENT'
  }

  return 'OTHER'
}

/**
 * Generate improvement ID from reflection + timestamp
 */
export function generateImprovementId(reflectionId: number, createdAt: Date): string {
  return `imp_${reflectionId}_${Math.floor(createdAt.getTime() / 1000)}`
}

/**
 * Create title from issue type and suggestion draft
 */
export function generateTitle(
  issueType: string,
  suggestionType: ImprovementSuggestionType,
  suggestionDraft: string
): string {
  const typeLabel = {
    PROMPT_IMPROVEMENT: '优化提示词',
    REGEX_IMPROVEMENT: '改进参数提取正则',
    FIELD_MAPPING_IMPROVEMENT: '调整字段映射',
    ESTIMATE_DEFAULT_IMPROVEMENT: '更新估算默认值',
    HANDOFF_POLICY_IMPROVEMENT: '优化转人工规则',
    OTHER: '其他改进建议',
  }[suggestionType]

  const issueLabel = getReflectionIssueTypeLabel(issueType)

  return `${typeLabel} - ${issueLabel}`
}

/**
 * Generate summary from suggestion draft (first 100 chars)
 */
export function generateSummary(suggestionDraft: string): string {
  return suggestionDraft.length > 100
    ? suggestionDraft.substring(0, 97) + '...'
    : suggestionDraft
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

export function deriveImpactArea(params: {
  issueType: string
  suggestionType: ImprovementSuggestionType
  targetArea: ImprovementTargetArea
  suggestionDraft: string
  correctedParams?: Record<string, any>
}): ImprovementImpactArea {
  const text = params.suggestionDraft.toLowerCase()
  const correctedKeys = Object.keys(params.correctedParams || {}).map((key) => key.toLowerCase())

  if (params.targetArea === 'HANDOFF_POLICY' || params.suggestionType === 'HANDOFF_POLICY_IMPROVEMENT' || params.issueType === 'SHOULD_HANDOFF') {
    return 'HANDOFF'
  }

  if (params.issueType === 'SHOULD_HANDOFF_BUT_NOT' || params.issueType === 'PACKAGING_REVIEW_REASON_WRONG') {
    return 'HANDOFF'
  }

  if (params.issueType === 'BUNDLE_STRUCTURE_WRONG') {
    return 'PATCH'
  }

  if (
    params.issueType === 'PACKAGING_PRICE_INACCURATE'
    || params.issueType === 'SHOULD_ESTIMATE_BUT_QUOTED'
    || params.issueType === 'SHOULD_QUOTED_BUT_ESTIMATED'
  ) {
    return 'PRICING'
  }

  if (includesAny(text, ['patch', 'recommendation_updated', '多轮 patch', '更新方案', '方案 patch', '局部修改', '覆盖前一轮', 'mergedrecommendedparams'])) {
    return 'PATCH'
  }

  if (includesAny(text, ['recommendedparams', '推荐方案', '推荐链路', '标准方案', 'solution_recommendation', 'recommendation_confirmation', '方案推荐'])) {
    return 'RECOMMENDATION'
  }

  if (includesAny(text, ['consultation', '知识卡', 'knowledge', '材料咨询', '工艺咨询', '规格建议', 'faq', '咨询命中'])) {
    return 'CONSULTATION'
  }

  if (params.targetArea === 'ESTIMATE' || params.suggestionType === 'ESTIMATE_DEFAULT_IMPROVEMENT' || params.issueType === 'QUOTE_INACCURATE') {
    return 'PRICING'
  }

  if (includesAny(text, ['报价', '估价', '估算', 'quote', 'quoted', 'estimated', '缺参', '参数提取'])) {
    return 'PRICING'
  }

  if (includesAny(text, ['转人工', 'handoff', '设计稿', 'pdf', '文件审稿'])) {
    return 'HANDOFF'
  }

  if (correctedKeys.some((key) => ['pagecount', 'bindingtype', 'coverweight', 'innerweight'].includes(key))) {
    return 'PATCH'
  }

  if (correctedKeys.some((key) => ['papertype', 'paperweight', 'quantity', 'finishedsize', 'producttype'].includes(key))) {
    return 'PRICING'
  }

  if (params.issueType === 'PARAM_MISSING' || params.issueType === 'PARAM_WRONG') {
    return 'PRICING'
  }

  if (params.issueType === 'PACKAGING_PARAM_MISSING' || params.issueType === 'PACKAGING_PARAM_WRONG') {
    return 'PRICING'
  }

  return 'OTHER'
}

export function generateImplementationHint(
  issueType: string,
  suggestionType: ImprovementSuggestionType,
  suggestionDraft: string
): {
  targetArea: ImprovementTargetArea
  targetFileHint?: string
  implementationNote: string
} {
  switch (suggestionType) {
    case 'PROMPT_IMPROVEMENT':
      return {
        targetArea: 'PROMPT',
        targetFileHint: issueType === 'BUNDLE_STRUCTURE_WRONG'
          ? 'src/server/packaging/extractComplexPackagingQuote.ts'
          : 'src/server/ai/extractQuoteParams.ts',
        implementationNote: `建议先审阅提示词文本，再做小步调整并回归测试。参考建议：${generateSummary(suggestionDraft)}`,
      }
    case 'REGEX_IMPROVEMENT':
      return {
        targetArea: 'REGEX',
        targetFileHint: issueType.startsWith('PACKAGING_') || issueType === 'BUNDLE_STRUCTURE_WRONG'
          ? 'src/server/packaging/extractComplexPackagingQuote.ts'
          : 'src/server/ai/extractQuoteParams.ts',
        implementationNote: '建议检查参数提取正则与术语映射，增加样例测试后再上线。',
      }
    case 'FIELD_MAPPING_IMPROVEMENT':
      return {
        targetArea: 'FIELD_MAPPING',
        targetFileHint: issueType.startsWith('PACKAGING_')
          ? 'src/server/packaging/extractComplexPackagingQuote.ts'
          : 'src/lib/catalog/productSchemas.ts',
        implementationNote: '建议核对字段语义映射关系，并验证多轮补参合并行为。',
      }
    case 'ESTIMATE_DEFAULT_IMPROVEMENT':
      return {
        targetArea: 'ESTIMATE',
        targetFileHint: issueType.startsWith('PACKAGING_') || issueType.startsWith('SHOULD_')
          ? 'src/server/chat/createChatPostHandler.ts'
          : 'src/lib/catalog/helpers.ts',
        implementationNote: '建议评估默认参数是否合理，修改后重点验证 estimated 场景。',
      }
    case 'HANDOFF_POLICY_IMPROVEMENT':
      return {
        targetArea: 'HANDOFF_POLICY',
        targetFileHint: issueType.startsWith('PACKAGING_') || issueType === 'SHOULD_HANDOFF_BUT_NOT'
          ? 'src/server/chat/createChatPostHandler.ts'
          : 'src/app/api/chat/route.ts',
        implementationNote: '建议检查文件型询价与风险判定分支，确保只增强转人工策略。',
      }
    case 'OTHER':
    default:
      return {
        targetArea: 'OTHER',
        implementationNote: `建议先人工拆解任务并指定目标文件。参考建议：${generateSummary(suggestionDraft)}`,
      }
  }
}
