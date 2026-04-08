export const REFLECTION_ISSUE_TYPES = [
  'PARAM_MISSING',
  'PARAM_WRONG',
  'QUOTE_INACCURATE',
  'SHOULD_HANDOFF',
  'PACKAGING_PARAM_WRONG',
  'PACKAGING_PARAM_MISSING',
  'BUNDLE_STRUCTURE_WRONG',
  'PACKAGING_PRICE_INACCURATE',
  'PACKAGING_REVIEW_REASON_WRONG',
  'SHOULD_ESTIMATE_BUT_QUOTED',
  'SHOULD_HANDOFF_BUT_NOT',
  'SHOULD_QUOTED_BUT_ESTIMATED',
] as const

export type ReflectionIssueType = (typeof REFLECTION_ISSUE_TYPES)[number]

export const REFLECTION_ISSUE_TYPE_LABELS: Record<ReflectionIssueType, string> = {
  PARAM_MISSING: '缺少参数',
  PARAM_WRONG: '参数错误',
  QUOTE_INACCURATE: '报价不准确',
  SHOULD_HANDOFF: '应转人工',
  PACKAGING_PARAM_WRONG: '包装识别不对',
  PACKAGING_PARAM_MISSING: '包装信息没问全',
  BUNDLE_STRUCTURE_WRONG: '主件/配件归属不对',
  PACKAGING_PRICE_INACCURATE: '包装价格不对',
  PACKAGING_REVIEW_REASON_WRONG: '转人工/参考价理由不对',
  SHOULD_ESTIMATE_BUT_QUOTED: '这单该给参考价，不该正式报价',
  SHOULD_HANDOFF_BUT_NOT: '这单该转人工，但系统没转',
  SHOULD_QUOTED_BUT_ESTIMATED: '这单可以正式报价，不该只给参考价',
}

export const REFLECTION_ISSUE_TYPE_OPTIONS: Array<{ value: ReflectionIssueType; label: string }> = REFLECTION_ISSUE_TYPES.map((value) => ({
  value,
  label: REFLECTION_ISSUE_TYPE_LABELS[value],
}))

const PACKAGING_ISSUE_TYPE_SET = new Set<ReflectionIssueType>([
  'PACKAGING_PARAM_WRONG',
  'PACKAGING_PARAM_MISSING',
  'BUNDLE_STRUCTURE_WRONG',
  'PACKAGING_PRICE_INACCURATE',
  'PACKAGING_REVIEW_REASON_WRONG',
  'SHOULD_ESTIMATE_BUT_QUOTED',
  'SHOULD_HANDOFF_BUT_NOT',
  'SHOULD_QUOTED_BUT_ESTIMATED',
])

const MISSING_FIELD_ISSUE_TYPE_SET = new Set<ReflectionIssueType>([
  'PARAM_MISSING',
  'PACKAGING_PARAM_MISSING',
])

const HANDOFF_ISSUE_TYPE_SET = new Set<ReflectionIssueType>([
  'SHOULD_HANDOFF',
  'SHOULD_HANDOFF_BUT_NOT',
])

export function isReflectionIssueType(value: string): value is ReflectionIssueType {
  return REFLECTION_ISSUE_TYPES.includes(value as ReflectionIssueType)
}

export function isPackagingReflectionIssueType(value: string): value is ReflectionIssueType {
  return PACKAGING_ISSUE_TYPE_SET.has(value as ReflectionIssueType)
}

export function isMissingFieldReflectionIssueType(value: string): value is ReflectionIssueType {
  return MISSING_FIELD_ISSUE_TYPE_SET.has(value as ReflectionIssueType)
}

export function isHandoffReflectionIssueType(value: string): value is ReflectionIssueType {
  return HANDOFF_ISSUE_TYPE_SET.has(value as ReflectionIssueType)
}

export function getReflectionIssueTypeLabel(value: string): string {
  return REFLECTION_ISSUE_TYPE_LABELS[value as ReflectionIssueType] || value
}