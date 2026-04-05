import {
  buildPackagingReflectionDiff,
  type PackagingDiffFieldChange,
  type PackagingReflectionDiff,
} from '@/lib/reflection/packagingDiff'
import {
  getReflectionIssueTypeLabel,
  isPackagingReflectionIssueType,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'
import type {
  ImprovementDiffCategory,
  ImprovementImpactArea,
  ImprovementSuggestionType,
} from './improvementSuggestion'

type JsonRecord = Record<string, any>

export type PackagingImprovementAttribution = {
  suggestionType: ImprovementSuggestionType
  impactArea: ImprovementImpactArea
  diffCategory: ImprovementDiffCategory
  targetFileHint?: string
  issueSummary: string
  whyItHappened: string
  confidence: number
  suggestionDraft: string
  suggestedActionHint: string
  title: string
  summary: string
}

const PARAM_SIGNAL_FIELDS = new Set([
  'material',
  'paperType',
  'paperWeight',
  'weight',
  'printColor',
  'printSides',
  'size',
  'length',
  'width',
  'height',
  'quantity',
  'surfaceFinish',
  'laminationType',
  'windowSizeLength',
  'windowSizeWidth',
  'insertMaterial',
  'stickerMaterial',
])

const PROMPT_SIGNAL_FIELDS = new Set([
  'productType',
  'boxStyle',
  'surfaceFinish',
  'laminationType',
  'processes',
  'foldType',
  'insertType',
  'stickerType',
])

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function truncateText(value: string, maxLength = 100): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function formatList(values: string[], limit = 3): string {
  const normalized = uniq(values)
  if (normalized.length === 0) {
    return '关键字段'
  }

  if (normalized.length <= limit) {
    return normalized.join('、')
  }

  return `${normalized.slice(0, limit).join('、')} 等 ${normalized.length} 项`
}

function summarizeMainItemFields(changes: PackagingDiffFieldChange[]): string {
  return formatList(changes.map((change) => change.label))
}

function summarizeResultChanges(diff: PackagingReflectionDiff): string {
  const labels = diff.resultChanges.map((change) => `${change.label}：${change.before} -> ${change.after}`)
  return labels.join('；')
}

function summarizeReviewReasonChanges(diff: PackagingReflectionDiff): string {
  const added = diff.reviewReasonChanges.filter((change) => change.type === 'added').map((change) => change.label)
  const removed = diff.reviewReasonChanges.filter((change) => change.type === 'removed').map((change) => change.label)
  const parts: string[] = []

  if (added.length > 0) {
    parts.push(`新增复核原因 ${formatList(added, 2)}`)
  }

  if (removed.length > 0) {
    parts.push(`移除复核原因 ${formatList(removed, 2)}`)
  }

  const reviewFlagChange = diff.resultChanges.find((change) => change.field === 'requiresHumanReview')
  if (reviewFlagChange) {
    parts.push(`人工复核从${reviewFlagChange.before}调整为${reviewFlagChange.after}`)
  }

  return parts.join('；')
}

function summarizeSubItemChanges(diff: PackagingReflectionDiff): string {
  const added = diff.subItemChanges.filter((change) => change.type === 'added').length
  const removed = diff.subItemChanges.filter((change) => change.type === 'removed').length
  const modified = diff.subItemChanges.filter((change) => change.type === 'modified').length
  const parts: string[] = []

  if (added > 0) {
    parts.push(`新增 ${added} 个子项`)
  }

  if (removed > 0) {
    parts.push(`移除 ${removed} 个子项`)
  }

  if (modified > 0) {
    parts.push(`修改 ${modified} 个子项`)
  }

  return parts.join('，') || '调整了子项结构'
}

function hasParamSignals(diff: PackagingReflectionDiff): boolean {
  return diff.mainItemChanges.some((change) => PARAM_SIGNAL_FIELDS.has(change.field))
}

function hasPromptSignals(diff: PackagingReflectionDiff): boolean {
  return diff.mainItemChanges.some((change) => PROMPT_SIGNAL_FIELDS.has(change.field))
}

function getDiffCategory(diff: PackagingReflectionDiff): ImprovementDiffCategory {
  const { issueType } = diff

  if (
    issueType === 'PACKAGING_REVIEW_REASON_WRONG'
    || issueType === 'SHOULD_HANDOFF_BUT_NOT'
    || diff.reviewReasonChanges.length > 0
    || diff.resultChanges.some((change) => change.field === 'requiresHumanReview')
  ) {
    return 'REVIEW_POLICY'
  }

  if (
    issueType === 'SHOULD_ESTIMATE_BUT_QUOTED'
    || issueType === 'SHOULD_QUOTED_BUT_ESTIMATED'
    || diff.resultChanges.some((change) => change.field === 'status')
  ) {
    return 'QUOTE_BOUNDARY'
  }

  if (issueType === 'BUNDLE_STRUCTURE_WRONG' || diff.subItemChanges.length > 0) {
    return 'BUNDLE_STRUCTURE'
  }

  if (issueType === 'PACKAGING_PRICE_INACCURATE') {
    return 'PRICING_JUDGMENT'
  }

  if (
    issueType === 'PACKAGING_PARAM_MISSING'
    || issueType === 'PACKAGING_PARAM_WRONG'
    || hasParamSignals(diff)
    || diff.mainItemChanges.length > 0
  ) {
    return 'PARAM_RECOGNITION'
  }

  return 'OTHER'
}

function getConfidence(diffCategory: ImprovementDiffCategory, diff: PackagingReflectionDiff): number {
  switch (diffCategory) {
    case 'PARAM_RECOGNITION':
      return diff.mainItemChanges.length >= 2 ? 0.95 : 0.88
    case 'BUNDLE_STRUCTURE':
      return diff.subItemChanges.length > 0 ? 0.97 : 0.84
    case 'QUOTE_BOUNDARY':
      return diff.resultChanges.some((change) => change.field === 'status') ? 0.96 : 0.87
    case 'REVIEW_POLICY':
      return diff.reviewReasonChanges.length > 0 ? 0.97 : 0.9
    case 'PRICING_JUDGMENT':
      return diff.mainItemChanges.length > 0 || diff.resultChanges.length > 0 ? 0.89 : 0.8
    case 'OTHER':
    default:
      return 0.72
  }
}

function buildPackagingSuggestionDraft(issueSummary: string, whyItHappened: string, action: string): string {
  return [
    `问题：${issueSummary}`,
    `原因：${whyItHappened}`,
    `建议：${action}`,
  ].join('\n')
}

function buildPackagingAttributionFromDiff(diff: PackagingReflectionDiff): PackagingImprovementAttribution {
  const diffCategory = getDiffCategory(diff)
  const issueLabel = getReflectionIssueTypeLabel(diff.issueType)
  const mainFields = summarizeMainItemFields(diff.mainItemChanges)
  const subItemSummary = summarizeSubItemChanges(diff)
  const resultSummary = summarizeResultChanges(diff)
  const reviewSummary = summarizeReviewReasonChanges(diff)
  const confidence = getConfidence(diffCategory, diff)

  switch (diffCategory) {
    case 'PARAM_RECOGNITION': {
      const promptLikeRecognition = hasPromptSignals(diff)
      const issueSummary = `复杂包装主件参数识别偏差，人工修正了 ${mainFields}。`
      const whyItHappened = `结构化 diff 显示主件字段 ${mainFields} 被人工改写，说明复杂包装参数词汇归一化或字段映射仍不稳定。`
      const suggestedActionHint = promptLikeRecognition
        ? `优先补强 complex packaging 提示词与自然语言理解规则，补充 ${mainFields} 的口语表达、工艺别名和 continuation 样例。`
        : `优先补强 complex packaging 抽取与字段映射，补充 ${mainFields} 的口语表达、英文别名和回归样例。`

      return {
        suggestionType: promptLikeRecognition ? 'PROMPT_IMPROVEMENT' : 'FIELD_MAPPING_IMPROVEMENT',
        impactArea: promptLikeRecognition ? 'PATCH' : 'PRICING',
        diffCategory,
        targetFileHint: 'src/server/packaging/extractComplexPackagingQuote.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          promptLikeRecognition
            ? '先修正盒型、工艺等自然语言理解，再决定字段归属；不要从 reflection 长文本反推包装参数。'
            : '先稳定主件参数识别，再决定是否进入 estimated 或 quoted；不要从 reflection 长文本反推包装参数。'
        ),
        suggestedActionHint,
        title: promptLikeRecognition
          ? `优化复杂包装自然语言理解 - ${issueLabel}`
          : `调整复杂包装字段映射 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
    case 'BUNDLE_STRUCTURE': {
      const issueSummary = `复杂包装 bundle 结构识别错误，人工执行了 ${subItemSummary}。`
      const whyItHappened = `结构化 diff 显示子项层发生 ${subItemSummary}，说明系统对主件/配件切分、子项归属或 item 级缺参挂靠判断不稳定。`
      const suggestedActionHint = '检查 complex packaging 的 mainItem/subItems 拆分逻辑，并为新增、删除、修改子项补 bundle 回归样例。'

      return {
        suggestionType: 'PROMPT_IMPROVEMENT',
        impactArea: 'PATCH',
        diffCategory,
        targetFileHint: 'src/server/packaging/extractComplexPackagingQuote.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          '应先识别组件边界，再抽取各 item 字段，并保证 mainItem、subItems、missingDetails 使用同一套结构。'
        ),
        suggestedActionHint,
        title: `优化复杂包装 bundle 结构 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
    case 'QUOTE_BOUNDARY': {
      const issueSummary = `复杂包装报价路径边界判断错误，人工将结果调整为 ${resultSummary || '更合适的报价路径'}。`
      const whyItHappened = `结构化 diff 显示结果字段发生变化：${resultSummary || 'quoted / estimated 状态被人工改写'}，说明 estimated / quoted 的进入条件或缺参兜底判断不稳定。`
      const suggestedActionHint = '核对 decideComplexPackagingQuotePath 的边界条件，重点补 estimated 与 quoted 互转的回归用例。'

      return {
        suggestionType: 'ESTIMATE_DEFAULT_IMPROVEMENT',
        impactArea: 'PRICING',
        diffCategory,
        targetFileHint: 'src/server/packaging/extractComplexPackagingQuote.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          '不要改报价公式；先校准 complex packaging 的 quoted / estimated 边界规则，再让后续报价展示沿用该结果。'
        ),
        suggestedActionHint,
        title: `校准复杂包装报价边界 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
    case 'REVIEW_POLICY': {
      const issueSummary = `复杂包装复核策略判断不稳，人工调整了 ${reviewSummary || '复核原因或人工复核标记'}。`
      const whyItHappened = `结构化 diff 显示 ${reviewSummary || 'reviewReasons / requiresHumanReview 被人工修正'}，说明 packagingReview.reviewReasons 或 requiresHumanReview 触发条件存在偏差。`
      const suggestedActionHint = '检查 reviewReasons 生成与 requiresHumanReview 触发逻辑，补充应转人工与不应转人工的复杂包装样例。'

      return {
        suggestionType: 'HANDOFF_POLICY_IMPROVEMENT',
        impactArea: 'HANDOFF',
        diffCategory,
        targetFileHint: 'src/server/chat/createChatPostHandler.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          '应让 packagingReview.reviewReasons、requiresHumanReview 和 handoff 判定共享同一套结构化依据，不要只靠反思文本补救。'
        ),
        suggestedActionHint,
        title: `优化复杂包装复核策略 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
    case 'PRICING_JUDGMENT': {
      const evidence = resultSummary || mainFields
      const issueSummary = `复杂包装报价判断与人工修正不一致，关键差异集中在 ${evidence}。`
      const whyItHappened = `结构化 diff 显示 ${evidence} 发生人工改写，这更像是进入报价判断前的参数标准化或风险评估偏差，而不是报价公式本身问题。`
      const suggestedActionHint = '围绕 complex packaging 抽取与 quote-path 决策补样例，验证价格判断依赖字段是否稳定一致。'

      return {
        suggestionType: 'ESTIMATE_DEFAULT_IMPROVEMENT',
        impactArea: 'PRICING',
        diffCategory,
        targetFileHint: 'src/server/packaging/extractComplexPackagingQuote.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          '不要改报价公式；先回看复杂包装进入报价判断前的参数标准化、风险标记和 review path，再决定 estimated 或 quoted。'
        ),
        suggestedActionHint,
        title: `校准复杂包装报价判断 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
    case 'OTHER':
    default: {
      const issueSummary = `复杂包装反思存在可复用的结构化差异，当前问题类型为 ${issueLabel}。`
      const whyItHappened = '结构化 diff 已显示人工对复杂包装结果进行了字段级修正，但还需要补充更多样本来定位根因。'
      const suggestedActionHint = '保留当前 diff 作为回归样例，并继续补充同类复杂包装反思后再细分归因规则。'

      return {
        suggestionType: 'OTHER',
        impactArea: 'OTHER',
        diffCategory,
        targetFileHint: 'src/server/packaging/extractComplexPackagingQuote.ts',
        issueSummary,
        whyItHappened,
        confidence,
        suggestionDraft: buildPackagingSuggestionDraft(
          issueSummary,
          whyItHappened,
          '先把该类结构化 diff 纳入回归样例，等模式稳定后再拆成更细的包装改进规则。'
        ),
        suggestedActionHint,
        title: `沉淀复杂包装结构化样例 - ${issueLabel}`,
        summary: truncateText(issueSummary),
      }
    }
  }
}

export function buildPackagingImprovementAttribution(input: {
  issueType: string
  originalExtractedParams?: JsonRecord | null
  correctedParams?: JsonRecord | null
}): PackagingImprovementAttribution | null {
  if (!isPackagingReflectionIssueType(input.issueType)) {
    return null
  }

  const issueType = input.issueType as ReflectionIssueType
  const diff = buildPackagingReflectionDiff({
    issueType,
    originalExtractedParams: input.originalExtractedParams,
    correctedParams: input.correctedParams,
  })

  if (!diff) {
    return null
  }

  return buildPackagingAttributionFromDiff(diff)
}