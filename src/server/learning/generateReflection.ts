import OpenAI from 'openai'
import { requireOpenAIKey } from '@/server/config/env'

export type ReflectionIssueType = 'PARAM_MISSING' | 'PARAM_WRONG' | 'QUOTE_INACCURATE' | 'SHOULD_HANDOFF'

export type GenerateReflectionInput = {
  conversationId: number
  issueType: ReflectionIssueType
  originalExtractedParams?: Record<string, any>
  correctedParams?: Record<string, any>
  originalQuoteSummary?: string
  correctedQuoteSummary?: string
}

export type GenerateReflectionOutput = {
  reflectionText: string
  suggestionDraft: string
}

let cachedOpenAIClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!cachedOpenAIClient) {
    const apiKey = requireOpenAIKey()
    cachedOpenAIClient = new OpenAI({ apiKey })
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

function summarizeDiff(original?: Record<string, any>, corrected?: Record<string, any>): string {
  const oldObj = original || {}
  const newObj = corrected || {}
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

function buildFallbackReflection(input: GenerateReflectionInput): GenerateReflectionOutput {
  const diff = summarizeDiff(input.originalExtractedParams, input.correctedParams)
  const quoteDiff = input.originalQuoteSummary || input.correctedQuoteSummary
    ? `原报价摘要：${input.originalQuoteSummary || '空'}；修正后摘要：${input.correctedQuoteSummary || '空'}。`
    : '未提供报价摘要修正信息。'

  return {
    reflectionText: `会话 #${input.conversationId} 发生 ${input.issueType}。参数差异：${diff}。${quoteDiff}`,
    suggestionDraft: '建议：保留当前生产规则不自动变更；将本条记录提交人工审核，确认是否需要更新参数提取提示词、字段映射或人工接管判定规则。',
  }
}

async function generateByOpenAI(input: GenerateReflectionInput): Promise<GenerateReflectionOutput> {
  const client = getOpenAIClient()
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

输入：
conversationId: ${input.conversationId}
issueType: ${input.issueType}
originalExtractedParams: ${safeStringify(input.originalExtractedParams)}
correctedParams: ${safeStringify(input.correctedParams)}
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
