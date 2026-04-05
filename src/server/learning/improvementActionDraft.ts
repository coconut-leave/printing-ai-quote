import type {
  ImprovementActionChangeType,
  ImprovementActionDraft,
  ImprovementActionRiskLevel,
  ImprovementDiffCategory,
  ImprovementSuggestionType,
  ImprovementTargetArea,
} from './improvementSuggestion'

type JsonRecord = Record<string, any>

type ImprovementActionDraftInput = {
  issueType: string
  suggestionType: ImprovementSuggestionType
  targetArea: ImprovementTargetArea
  targetFileHint?: string
  title: string
  suggestionDraft: string
  issueSummary?: string
  diffCategory?: ImprovementDiffCategory
  whyItHappened?: string
  suggestedActionHint?: string
  correctedParams?: JsonRecord
}

function formatActionTitle(params: {
  diffCategory?: ImprovementDiffCategory
  targetArea: ImprovementTargetArea
  issueSummary?: string
  suggestionType: ImprovementSuggestionType
  title: string
}): string {
  switch (params.diffCategory) {
    case 'PARAM_RECOGNITION':
      return params.targetArea === 'PROMPT'
        ? '增强复杂包装参数抽取提示'
        : '增强复杂包装字段映射'
    case 'BUNDLE_STRUCTURE':
      return '增强 complex packaging bundle continuation 理解'
    case 'QUOTE_BOUNDARY':
      return '校准 complex packaging estimated / quoted 边界'
    case 'REVIEW_POLICY':
      return '校准 complex packaging review policy 触发条件'
    case 'PRICING_JUDGMENT':
      return '复核 complex packaging 报价判断前置规则'
    case 'OTHER':
    default:
      if (params.targetArea === 'PROMPT') return '更新复杂包装提示词规则'
      if (params.targetArea === 'FIELD_MAPPING') return '更新复杂包装字段映射规则'
      if (params.targetArea === 'ESTIMATE') return '更新复杂包装估算边界规则'
      if (params.targetArea === 'HANDOFF_POLICY') return '更新复杂包装转人工策略'
      return params.issueSummary || params.title
  }
}

function deriveChangeType(params: {
  diffCategory?: ImprovementDiffCategory
  targetArea: ImprovementTargetArea
  suggestionType: ImprovementSuggestionType
}): ImprovementActionChangeType {
  if (params.targetArea === 'PROMPT') {
    return 'prompt_update'
  }

  if (params.targetArea === 'FIELD_MAPPING') {
    if (params.diffCategory === 'PARAM_RECOGNITION') {
      return 'mapping_update'
    }

    return 'extraction_rule_update'
  }

  if (params.targetArea === 'ESTIMATE') {
    if (params.diffCategory === 'PRICING_JUDGMENT') {
      return 'pricing_rule_review'
    }

    return 'threshold_update'
  }

  if (params.targetArea === 'HANDOFF_POLICY') {
    return 'policy_update'
  }

  if (params.suggestionType === 'REGEX_IMPROVEMENT') {
    return 'extraction_rule_update'
  }

  return 'other_update'
}

function deriveRiskLevel(params: {
  diffCategory?: ImprovementDiffCategory
  targetArea: ImprovementTargetArea
  changeType: ImprovementActionChangeType
}): ImprovementActionRiskLevel {
  if (params.diffCategory === 'PRICING_JUDGMENT' || params.changeType === 'pricing_rule_review') {
    return 'HIGH'
  }

  if (params.targetArea === 'ESTIMATE' || params.targetArea === 'HANDOFF_POLICY') {
    return 'MEDIUM'
  }

  return 'LOW'
}

function deriveImplementationNote(params: ImprovementActionDraftInput): string {
  if (params.suggestedActionHint) {
    return params.suggestedActionHint
  }

  if (params.whyItHappened) {
    return params.whyItHappened
  }

  return params.suggestionDraft
}

function deriveTestHint(params: {
  diffCategory?: ImprovementDiffCategory
  targetArea: ImprovementTargetArea
  correctedParams?: JsonRecord
}): string {
  switch (params.diffCategory) {
    case 'PARAM_RECOGNITION':
      return '增加材质、克重、印色、尺寸归属混淆输入的 complex packaging 抽取回归测试，覆盖字段映射和 continuation 两轮场景。'
    case 'BUNDLE_STRUCTURE':
      return '增加“再加一个说明书/贴纸”“删除子项”“修改指定子项”三类 complex packaging continuation 回归测试。'
    case 'QUOTE_BOUNDARY':
      return '增加 quoted 与 estimated 互转的 complex packaging 路由回归测试，覆盖缺参、bundle 和 review signal 组合。'
    case 'REVIEW_POLICY':
      return '增加 reviewReasons 与 requiresHumanReview 触发边界回归测试，验证应转人工与不应转人工样例。'
    case 'PRICING_JUDGMENT':
      return '增加价格判断前置条件回归测试，确认路径判断、review flags 和价格说明输出保持一致。'
    case 'OTHER':
    default:
      if (params.targetArea === 'FIELD_MAPPING' && params.correctedParams) {
        const keys = Object.keys(params.correctedParams).slice(0, 3)
        if (keys.length > 0) {
          return `增加 ${keys.join(' / ')} 相关字段修正样例的回归测试，确认抽取与归一化结果稳定。`
        }
      }

      return '补一条最小可复现回归测试，确保本次动作修改后同类 reflection 不再重复出现。'
  }
}

export function buildImprovementActionDraft(input: ImprovementActionDraftInput): ImprovementActionDraft | undefined {
  if (!input.diffCategory) {
    return undefined
  }

  const actionTitle = formatActionTitle({
    diffCategory: input.diffCategory,
    targetArea: input.targetArea,
    issueSummary: input.issueSummary,
    suggestionType: input.suggestionType,
    title: input.title,
  })
  const changeType = deriveChangeType({
    diffCategory: input.diffCategory,
    targetArea: input.targetArea,
    suggestionType: input.suggestionType,
  })
  const riskLevel = deriveRiskLevel({
    diffCategory: input.diffCategory,
    targetArea: input.targetArea,
    changeType,
  })
  const implementationNote = deriveImplementationNote(input)
  const testHint = deriveTestHint({
    diffCategory: input.diffCategory,
    targetArea: input.targetArea,
    correctedParams: input.correctedParams,
  })

  return {
    actionTitle,
    targetArea: input.targetArea,
    changeType,
    targetFileHint: input.targetFileHint,
    implementationNote,
    testHint,
    riskLevel,
  }
}