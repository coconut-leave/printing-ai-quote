import type OpenAI from 'openai'
import { requireOpenAIKey } from '@/server/config/env'
import {
  buildReflectionBusinessFeedbackSummary,
  type ReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'
import {
  buildReflectionContextSummary,
  collectReflectionMissingFields,
  mergeReflectionPackagingContext,
} from '@/lib/reflection/context'
import {
  getReflectionIssueTypeLabel,
  isPackagingReflectionIssueType,
  type ReflectionIssueType,
} from '@/lib/reflection/issueTypes'

type JsonRecord = Record<string, any>

export type GenerateReflectionInput = {
  conversationId: number
  issueType: ReflectionIssueType
  originalExtractedParams?: Record<string, any>
  correctedParams?: Record<string, any>
  originalQuoteSummary?: string
  correctedQuoteSummary?: string
  businessFeedback?: ReflectionBusinessFeedback | null
}

export type GenerateReflectionOutput = {
  reflectionText: string
  suggestionDraft: string
}

let cachedOpenAIClient: OpenAI | null = null

async function getOpenAIClient(): Promise<OpenAI> {
  if (!cachedOpenAIClient) {
    const apiKey = requireOpenAIKey()
    const { default: OpenAIClient } = await import('openai')
    cachedOpenAIClient = new OpenAIClient({ apiKey })
  }
  return cachedOpenAIClient
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function stripPackagingContext(value?: JsonRecord): JsonRecord {
  if (!value) return {}
  const { packagingContext, ...rest } = value
  return rest
}

function summarizeDiff(original?: JsonRecord, corrected?: JsonRecord): string {
  const oldObj = stripPackagingContext(original)
  const newObj = stripPackagingContext(corrected)
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
  const changed = allKeys.filter((k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))

  if (changed.length === 0) {
    return '未检测到结构化参数差异。'
  }

  return changed
    .slice(0, 8)
    .map((k) => `${k}: ${String(oldObj[k] ?? '空')} -> ${String(newObj[k] ?? '空')}`)
    .join('；')
}

function summarizeQuoteDiff(input: GenerateReflectionInput): string {
  if (!input.originalQuoteSummary && !input.correctedQuoteSummary) {
    return '未提供报价摘要修正信息。'
  }

  return `原报价摘要：${input.originalQuoteSummary || '空'}；修正后摘要：${input.correctedQuoteSummary || '空'}。`
}

function summarizeBusinessFeedback(input: GenerateReflectionInput): string {
  const summary = buildReflectionBusinessFeedbackSummary(input.businessFeedback)
  return summary ? `业务反馈：${summary}。` : ''
}

function buildPackagingFallbackReflection(input: GenerateReflectionInput): GenerateReflectionOutput {
  const issueLabel = getReflectionIssueTypeLabel(input.issueType)
  const packagingContext = mergeReflectionPackagingContext(input.originalExtractedParams, input.correctedParams)
  const contextSummary = buildReflectionContextSummary(input.originalExtractedParams, input.correctedParams)
  const missingFields = collectReflectionMissingFields(input.originalExtractedParams, input.correctedParams)
  const missingText = missingFields.length > 0 ? missingFields.slice(0, 4).join('、') : '关键包装字段'
  const reviewReasonLabels = (packagingContext?.reviewReasons || [])
    .map((reason) => (typeof reason.label === 'string' && reason.label.trim()) || (typeof reason.message === 'string' && reason.message.trim()) || '')
    .filter(Boolean)
  const reviewReasonText = reviewReasonLabels.length > 0 ? reviewReasonLabels.slice(0, 3).join('、') : '当前复核理由'
  const bundleSize = packagingContext?.subItems?.length || 0
  const quoteDiff = summarizeQuoteDiff(input)
  const paramDiff = summarizeDiff(input.originalExtractedParams, input.correctedParams)
  const businessFeedbackText = summarizeBusinessFeedback(input)

  switch (input.issueType) {
    case 'PACKAGING_PARAM_MISSING':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前复杂包装会话缺少关键字段。'} 当前主要缺少 ${missingText}，导致系统无法稳定完成包装报价判断。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: `建议：补强复杂包装缺参识别与分项追问，优先覆盖 ${missingText} 这类字段；保持现有报价公式不变，仅优化抽取结果、缺参明细和追问归属逻辑。`,
      }
    case 'PACKAGING_PARAM_WRONG':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前包装主件或参数识别偏差。'} 结构化参数差异：${paramDiff}。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：回看复杂包装品类识别、尺寸/材质/印色/工艺映射与 item 级字段归属，补充错误识别样例，但不要直接改动生产报价规则。',
      }
    case 'BUNDLE_STRUCTURE_WRONG':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前复杂包装组合中的主件/配件关系识别异常。'} 当前识别到 ${bundleSize} 个配件，说明主件-配件归属或新增、修改、删除目标判断可能有偏差。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：加强复杂包装组合中的主件/配件归属、修改目标定位和分项缺参归属判断，并补充多轮新增、修改、删除的回归样例。',
      }
    case 'PACKAGING_PRICE_INACCURATE':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前包装报价与人工判断存在偏差。'} ${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：复核复杂包装的报价路径选择与分项归并结果，重点确认预报价说明、分项拆解与人工核价预期是否一致，不直接修改报价公式。',
      }
    case 'PACKAGING_REVIEW_REASON_WRONG':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前包装复核原因与结构化结果不一致。'} 当前主要复核原因：${reviewReasonText}。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：校准包装复核说明、复核原因与人工复核标记的归因规则，确保说明文案、复核原因和实际组合结构保持一致。',
      }
    case 'SHOULD_ESTIMATE_BUT_QUOTED':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前复杂包装案例更适合保留参考报价。'} 系统过早进入正式报价，策略边界需要复核。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：补强复杂包装的正式报价/预报价边界判定，优先考虑组合结构、复核原因和人工复核信号，避免包装复杂场景直接落入正式报价。',
      }
    case 'SHOULD_HANDOFF_BUT_NOT':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前复杂包装案例已具备人工复核信号，但未触发转人工。'} 当前复核信号：${reviewReasonText}。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：加强复杂包装的转人工门槛控制，特别是参考文件、组合复杂度和复核原因命中后的人工接管判定。',
      }
    case 'SHOULD_QUOTED_BUT_ESTIMATED':
      return {
        reflectionText: `会话 #${input.conversationId} 存在${issueLabel}。${contextSummary || '当前包装案例参数已较完整，但系统仍停留在参考报价。'} 这说明正式报价边界可能过于保守。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：复核复杂包装从参考报价进入正式报价的放行条件，确认缺参集合、复核原因和人工复核标记是否被过度触发。',
      }
    default:
      return {
        reflectionText: `会话 #${input.conversationId} 发生 ${issueLabel}。${contextSummary || '当前复杂包装记录需要进一步人工核查。'} 参数差异：${paramDiff}。${businessFeedbackText}${quoteDiff}`,
        suggestionDraft: '建议：保留当前生产规则不自动变更；将本条复杂包装记录提交人工审核，确认是否需要更新参数提取、组合归属或人工接管判定规则。',
      }
  }
}

function buildFallbackReflection(input: GenerateReflectionInput): GenerateReflectionOutput {
  if (isPackagingReflectionIssueType(input.issueType) || mergeReflectionPackagingContext(input.originalExtractedParams, input.correctedParams)) {
    return buildPackagingFallbackReflection(input)
  }

  const diff = summarizeDiff(input.originalExtractedParams, input.correctedParams)
  const quoteDiff = summarizeQuoteDiff(input)
  const businessFeedbackText = summarizeBusinessFeedback(input)

  return {
    reflectionText: `会话 #${input.conversationId} 发生 ${input.issueType}。参数差异：${diff}。${businessFeedbackText}${quoteDiff}`,
    suggestionDraft: '建议：保留当前生产规则不自动变更；将本条记录提交人工审核，确认是否需要更新参数提取提示词、字段映射或人工接管判定规则。',
  }
}

async function generateByOpenAI(input: GenerateReflectionInput): Promise<GenerateReflectionOutput> {
  const client = await getOpenAIClient()
  const prompt = `你是打印报价系统的质检助理。请基于输入生成一条“反思记录”，仅用于人工审核，不可执行任何自动改价或自动改规则动作。

输出必须是 JSON：
{
  "reflectionText": "...",
  "suggestionDraft": "..."
}

约束：
1) suggestionDraft 只能是建议，不能包含“自动修改生产规则/公式/上线”
2) 内容要简洁、业务化
3) 允许提到补充字段、改进提示词、加强人工接管判定
4) 不要输出 markdown
 5) 如果是复杂包装或组合报价场景，优先基于包装上下文、复核原因、缺参明细、报价分项做归因
6) 输出必须是中文

输入：
conversationId: ${input.conversationId}
issueType: ${input.issueType}
issueTypeLabel: ${getReflectionIssueTypeLabel(input.issueType)}
originalExtractedParams: ${safeStringify(input.originalExtractedParams)}
correctedParams: ${safeStringify(input.correctedParams)}
businessFeedback: ${buildReflectionBusinessFeedbackSummary(input.businessFeedback)}
packagingContextSummary: ${buildReflectionContextSummary(input.originalExtractedParams, input.correctedParams)}
originalQuoteSummary: ${input.originalQuoteSummary || ''}
correctedQuoteSummary: ${input.correctedQuoteSummary || ''}`

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI reflection timeout after 20 seconds')), 20000)
  })

  const apiPromise = client.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
    max_output_tokens: 300,
  })

  const response = await Promise.race([apiPromise, timeoutPromise])
  const output = response.output as any
  const text = output?.[0]?.text || output?.text
  if (!text || typeof text !== 'string') {
    throw new Error('No text from OpenAI reflection response')
  }

  let jsonText = text.trim()
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  const match = jsonText.match(/\{[\s\S]*\}/)
  if (match) jsonText = match[0]

  const parsed = JSON.parse(jsonText)
  const reflectionText = typeof parsed.reflectionText === 'string' ? parsed.reflectionText.trim() : ''
  const suggestionDraft = typeof parsed.suggestionDraft === 'string' ? parsed.suggestionDraft.trim() : ''

  if (!reflectionText || !suggestionDraft) {
    throw new Error('Invalid OpenAI reflection JSON fields')
  }

  return { reflectionText, suggestionDraft }
}

export async function generateReflection(input: GenerateReflectionInput): Promise<GenerateReflectionOutput> {
  try {
    return await generateByOpenAI(input)
  } catch (err) {
    return buildFallbackReflection(input)
  }
}
