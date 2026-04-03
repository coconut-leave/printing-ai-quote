export type ReflectionIssueType = 'PARAM_MISSING' | 'PARAM_WRONG' | 'QUOTE_INACCURATE' | 'SHOULD_HANDOFF'

export const REFLECTION_ISSUE_TYPE_LABELS: Record<ReflectionIssueType, string> = {
  PARAM_MISSING: '缺少参数',
  PARAM_WRONG: '参数错误',
  QUOTE_INACCURATE: '报价不准确',
  SHOULD_HANDOFF: '应转人工',
}

export const REFLECTION_ISSUE_TYPE_OPTIONS: Array<{ value: ReflectionIssueType; label: string }> = [
  { value: 'PARAM_MISSING', label: REFLECTION_ISSUE_TYPE_LABELS.PARAM_MISSING },
  { value: 'PARAM_WRONG', label: REFLECTION_ISSUE_TYPE_LABELS.PARAM_WRONG },
  { value: 'QUOTE_INACCURATE', label: REFLECTION_ISSUE_TYPE_LABELS.QUOTE_INACCURATE },
  { value: 'SHOULD_HANDOFF', label: REFLECTION_ISSUE_TYPE_LABELS.SHOULD_HANDOFF },
]

export function getReflectionIssueTypeLabel(value: string): string {
  return REFLECTION_ISSUE_TYPE_LABELS[value as ReflectionIssueType] || value
}