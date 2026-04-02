import { getDisplayParamEntries } from '@/lib/catalog/helpers'

type DemoResult = Record<string, any>

export type DemoParamEntry = {
  field: string
  label: string
  value: string
}

export type HomeDemoViewModel = {
  statusText: string
  quoteKindText?: string
  recommendedEntries: DemoParamEntry[]
  patchEntries: DemoParamEntry[]
  latestEntries: DemoParamEntry[]
  patchSummaryItems: string[]
  statusGuideLines: string[]
}

function getRecommendedPayload(result: DemoResult): Record<string, any> | null {
  if (result?.recommendedParams?.recommendedParams && typeof result.recommendedParams.recommendedParams === 'object') {
    return result.recommendedParams.recommendedParams as Record<string, any>
  }

  return null
}

function getProductType(result: DemoResult): string | undefined {
  return result?.mergedRecommendedParams?.productType
    || result?.recommendedParams?.productType
    || result?.mergedParams?.productType
    || result?.data?.normalizedParams?.productType
    || getRecommendedPayload(result)?.productType
}

function buildPatchSummaryItems(summary?: string): string[] {
  if (!summary) return []
  return summary
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getStatusText(status?: string): string {
  switch (status) {
    case 'recommendation_updated':
      return '方案已更新，待确认报价'
    case 'estimated':
      return '已生成参考报价'
    case 'quoted':
      return '已生成正式报价'
    case 'handoff_required':
      return '已安排人工跟进'
    case 'missing_fields':
      return '待补充报价信息'
    case 'consultation_reply':
      return '已给出顾问建议'
    default:
      return status || '未识别'
  }
}

function getQuoteKindText(status?: string): string | undefined {
  if (status === 'estimated') return '参考报价'
  if (status === 'quoted') return '正式报价'
  return undefined
}

function getStatusGuideLines(status?: string): string[] {
  if (status === 'recommendation_updated') {
    return [
      '当前方案已经按您的要求更新',
      '如果认可当前配置，可直接回复：按这个方案报价',
      '如果想先看范围，可直接回复：先估个参考价',
    ]
  }

  if (status === 'estimated') {
    return ['当前结果为参考报价，补齐关键信息后可继续进入正式报价。']
  }

  if (status === 'quoted') {
    return ['当前结果为正式报价，可继续核对配置、金额与交付方式。']
  }

  if (status === 'handoff_required') {
    return ['当前询价已进入人工跟进流程，后续会由人工继续核价和确认细节。']
  }

  if (status === 'missing_fields') {
    return ['当前还缺少关键信息，补齐后系统会继续完成报价。']
  }

  if (status === 'consultation_reply') {
    return ['当前已先回答问题并给出常见建议配置，您可以继续调方案，也可以直接进入报价。']
  }

  return []
}

export function buildHomeDemoViewModel(result: DemoResult | null | undefined): HomeDemoViewModel {
  const safeResult = result || {}
  const productType = getProductType(safeResult)
  const recommendedEntries = getDisplayParamEntries(productType, getRecommendedPayload(safeResult) || {})
  const patchEntries = getDisplayParamEntries(productType, safeResult.patchParams || {})
  const latestEntries = getDisplayParamEntries(productType, safeResult.mergedRecommendedParams || {})

  return {
    statusText: getStatusText(safeResult.status),
    quoteKindText: getQuoteKindText(safeResult.status),
    recommendedEntries,
    patchEntries,
    latestEntries,
    patchSummaryItems: buildPatchSummaryItems(safeResult.patchSummary),
    statusGuideLines: getStatusGuideLines(safeResult.status),
  }
}