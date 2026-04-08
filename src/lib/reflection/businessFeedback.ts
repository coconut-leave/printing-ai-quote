import type { ReflectionIssueType } from '@/lib/reflection/issueTypes'

type JsonRecord = Record<string, any>

export type ReflectionBusinessFeedback = {
  problemSummary?: string
  correctHandling?: string
  correctResult?: string
  shouldHandoff?: 'yes' | 'no' | 'unsure'
  notes?: string
}

export const REFLECTION_BUSINESS_HANDLING_OPTIONS = [
  '应推荐方案',
  '应先补信息',
  '应给参考价',
  '应正式报价',
  '应转人工',
  '应先澄清需求',
  '其他',
] as const

export const REFLECTION_BUSINESS_HANDOFF_OPTIONS = [
  { value: 'unsure', label: '待判断' },
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
] as const

export const REFLECTION_BUSINESS_ISSUE_TYPE_OPTIONS: Array<{ value: ReflectionIssueType; label: string }> = [
  { value: 'PARAM_WRONG', label: '识别错误' },
  { value: 'PARAM_MISSING', label: '漏问参数 / 缺参数追问不对' },
  { value: 'QUOTE_INACCURATE', label: '价格不对 / 误报价' },
  { value: 'SHOULD_HANDOFF', label: '不应继续报价，应转人工' },
  { value: 'PACKAGING_PARAM_WRONG', label: '包装识别不对' },
  { value: 'PACKAGING_PARAM_MISSING', label: '包装信息没问全' },
  { value: 'BUNDLE_STRUCTURE_WRONG', label: '主件 / 配件归属不对' },
  { value: 'PACKAGING_PRICE_INACCURATE', label: '包装价格不对' },
  { value: 'PACKAGING_REVIEW_REASON_WRONG', label: '转人工 / 参考价理由不对' },
  { value: 'SHOULD_ESTIMATE_BUT_QUOTED', label: '这单该给参考价，不该正式报价' },
  { value: 'SHOULD_HANDOFF_BUT_NOT', label: '这单该转人工，但系统没转' },
  { value: 'SHOULD_QUOTED_BUT_ESTIMATED', label: '这单可以正式报价，不该只给参考价' },
]

function isObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value?: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function normalizeReflectionBusinessFeedback(input: unknown): ReflectionBusinessFeedback | null {
  if (!isObject(input)) {
    return null
  }

  const feedback: ReflectionBusinessFeedback = {
    problemSummary: normalizeText(typeof input.problemSummary === 'string' ? input.problemSummary : undefined),
    correctHandling: normalizeText(typeof input.correctHandling === 'string' ? input.correctHandling : undefined),
    correctResult: normalizeText(typeof input.correctResult === 'string' ? input.correctResult : undefined),
    shouldHandoff: input.shouldHandoff === 'yes' || input.shouldHandoff === 'no' || input.shouldHandoff === 'unsure'
      ? input.shouldHandoff
      : undefined,
    notes: normalizeText(typeof input.notes === 'string' ? input.notes : undefined),
  }

  return Object.values(feedback).some(Boolean) ? feedback : null
}

export function extractReflectionBusinessFeedback(correctedParams?: JsonRecord | null): ReflectionBusinessFeedback | null {
  if (!isObject(correctedParams)) {
    return null
  }

  return normalizeReflectionBusinessFeedback(correctedParams.businessFeedback)
}

export function buildReflectionBusinessCorrectedParams(input: {
  correctedParams?: JsonRecord | null
  businessFeedback?: ReflectionBusinessFeedback | null
}): JsonRecord | undefined {
  const base = isObject(input.correctedParams)
    ? JSON.parse(JSON.stringify(input.correctedParams)) as JsonRecord
    : undefined
  const feedback = normalizeReflectionBusinessFeedback(input.businessFeedback)

  if (!base && !feedback) {
    return undefined
  }

  const next: JsonRecord = base || {}

  if (feedback) {
    next.businessFeedback = feedback

    if (isObject(next.packagingContext) && feedback.shouldHandoff && feedback.shouldHandoff !== 'unsure') {
      next.packagingContext = {
        ...next.packagingContext,
        requiresHumanReview: feedback.shouldHandoff === 'yes',
      }
    }
  }

  return next
}

export function buildReflectionBusinessFeedbackSummary(feedback?: ReflectionBusinessFeedback | null): string {
  const normalized = normalizeReflectionBusinessFeedback(feedback)
  if (!normalized) {
    return ''
  }

  return [
    normalized.problemSummary ? `这次业务反馈：${normalized.problemSummary}` : '',
    normalized.correctHandling ? `这单正确处理：${normalized.correctHandling}` : '',
    normalized.correctResult ? `这单正确结果：${normalized.correctResult}` : '',
    normalized.shouldHandoff
      ? `这单是否应转人工：${normalized.shouldHandoff === 'yes' ? '是' : normalized.shouldHandoff === 'no' ? '否' : '待判断'}`
      : '',
    normalized.notes ? `补充说明：${normalized.notes}` : '',
  ].filter(Boolean).join('；')
}