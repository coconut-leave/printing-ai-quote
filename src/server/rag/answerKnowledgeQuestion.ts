import OpenAI from 'openai'
import { z } from 'zod'
import { buildRagAnswerPrompt } from '@/server/ai/prompts/ragAnswer'
import { buildRagQueryRewritePrompt } from '@/server/ai/prompts/ragQueryRewrite'
import { isEnvVarConfigured, requireOpenAIKey } from '@/server/config/env'
import { retrieveKnowledge, type KnowledgeSnippet } from '@/server/rag/retrieveKnowledge'
import { logRagHit, type TraceContext } from '@/server/logging/routerRagTrace'

type RewriteKnowledgeQueryResult = {
  searchQuery: string
  topics: string[]
  rewriteStrategy?: 'model' | 'normalized_fallback' | 'custom'
  fallbackUsed?: boolean
  fallbackReason?: string
}

export type KnowledgeAnswerResult = {
  reply: string
  rewrittenQuery: string
  snippets: KnowledgeSnippet[]
  conservative: boolean
  fallbackUsed: boolean
  fallbackReason?: string
  answerType: 'knowledge_answer' | 'deterministic_answer' | 'insufficient_knowledge' | 'custom_answer'
  insufficientKnowledge: boolean
  rewriteStrategy: 'model' | 'normalized_fallback' | 'custom'
}

type GeneratedAnswerMeta = {
  reply: string
  fallbackUsed: boolean
  fallbackReason?: string
  answerType: 'knowledge_answer' | 'deterministic_answer' | 'insufficient_knowledge' | 'custom_answer'
}

type AnswerKnowledgeQuestionDeps = {
  rewriteQuery?: (message: string) => Promise<RewriteKnowledgeQueryResult>
  retrieveKnowledge?: (input: { query: string; topK?: number; conversationId?: number; requestId?: string }) => KnowledgeSnippet[]
  generateAnswer?: (input: { message: string; rewrittenQuery: string; snippets: KnowledgeSnippet[] }) => Promise<string>
}

const rewriteSchema = z.object({
  searchQuery: z.string().min(1),
  topics: z.array(z.string()).default([]),
}).strict()

const KNOWLEDGE_FALLBACK_REPLY = '这个问题我先不乱回答，按我这边现有资料还不够支撑更确定的结论。您可以补充具体用途、材质或工艺场景；如果涉及复杂文件、特殊工艺或正式交期，我建议您转人工确认。要是您想按常见做法继续往下估，也可以直接把数量和规格发我。'

let cachedOpenAIClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!cachedOpenAIClient) {
    cachedOpenAIClient = new OpenAI({ apiKey: requireOpenAIKey() })
  }
  return cachedOpenAIClient
}

function canUseRemoteModel(): boolean {
  return isEnvVarConfigured('OPENAI_API_KEY')
    && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production')
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const unwrapped = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed
  const match = unwrapped.match(/\{[\s\S]*\}/)
  return match ? match[0] : unwrapped
}

function extractResponseText(response: any): string {
  const text = response?.output?.[0]?.text || response?.output?.text || response?.output_text
  if (!text || typeof text !== 'string') {
    throw new Error('No text returned from RAG model')
  }
  return text
}

function normalizeSearchQuery(message: string): string {
  return message.replace(/[？?！!。,.，]/g, ' ').replace(/\s+/g, ' ').trim()
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

function buildDeterministicAnswer(snippets: KnowledgeSnippet[]): string {
  const body = snippets
    .slice(0, 2)
    .map((snippet) => snippet.content.trim())
    .join(' ')

  return `先按现有资料给您做个说明：${body} 这部分只用于材料、工艺、装订、打样、交期这些解释，不直接判断最终价格、税费或运费；如果碰到复杂文件、特殊工艺或正式交期，还是以人工确认更稳。`
}

async function callModel(prompt: string, maxOutputTokens: number, timeoutMs: number): Promise<string> {
  const client = getOpenAIClient()
  const response = await withTimeout(
    client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: maxOutputTokens,
    }),
    timeoutMs,
    `RAG model timeout after ${timeoutMs}ms`
  )

  return extractResponseText(response)
}

async function defaultRewriteQuery(message: string): Promise<RewriteKnowledgeQueryResult> {
  if (!canUseRemoteModel()) {
    return {
      searchQuery: normalizeSearchQuery(message),
      topics: [],
      rewriteStrategy: 'normalized_fallback',
      fallbackUsed: true,
      fallbackReason: 'rewrite_model_unavailable',
    }
  }

  try {
    const text = await callModel(buildRagQueryRewritePrompt(message), 180, 7000)
    const parsed = JSON.parse(extractJsonObject(text))
    return {
      ...rewriteSchema.parse(parsed),
      rewriteStrategy: 'model',
      fallbackUsed: false,
    }
  } catch {
    return {
      searchQuery: normalizeSearchQuery(message),
      topics: [],
      rewriteStrategy: 'normalized_fallback',
      fallbackUsed: true,
      fallbackReason: 'rewrite_model_error',
    }
  }
}

async function defaultGenerateAnswer(input: {
  message: string
  rewrittenQuery: string
  snippets: KnowledgeSnippet[]
}): Promise<GeneratedAnswerMeta> {
  if (input.snippets.length === 0) {
    return {
      reply: KNOWLEDGE_FALLBACK_REPLY,
      fallbackUsed: true,
      fallbackReason: 'no_retrieved_snippets',
      answerType: 'insufficient_knowledge',
    }
  }

  if (!canUseRemoteModel()) {
    return {
      reply: buildDeterministicAnswer(input.snippets),
      fallbackUsed: true,
      fallbackReason: 'rag_model_unavailable',
      answerType: 'deterministic_answer',
    }
  }

  try {
    const text = await callModel(buildRagAnswerPrompt(input), 360, 9000)
    const cleaned = text.trim().replace(/^```(?:text)?\s*/i, '').replace(/\s*```$/, '')
    return {
      reply: cleaned || buildDeterministicAnswer(input.snippets),
      fallbackUsed: false,
      answerType: 'knowledge_answer',
    }
  } catch {
    return {
      reply: buildDeterministicAnswer(input.snippets),
      fallbackUsed: true,
      fallbackReason: 'rag_answer_model_error',
      answerType: 'deterministic_answer',
    }
  }
}

export async function answerKnowledgeQuestion(
  message: string,
  deps: AnswerKnowledgeQuestionDeps = {},
  traceContext: TraceContext = {}
): Promise<KnowledgeAnswerResult> {
  const rewriteQuery = deps.rewriteQuery || defaultRewriteQuery
  const retrieve = deps.retrieveKnowledge || retrieveKnowledge

  let rewrittenRaw: RewriteKnowledgeQueryResult
  try {
    rewrittenRaw = await withTimeout(
      rewriteQuery(message),
      7000,
      'Knowledge rewrite timeout after 7 seconds'
    )
  } catch {
    rewrittenRaw = {
      searchQuery: normalizeSearchQuery(message),
      topics: [],
      rewriteStrategy: 'normalized_fallback',
      fallbackUsed: true,
      fallbackReason: 'rewrite_timeout',
    }
  }
  const rewritten: RewriteKnowledgeQueryResult = {
    ...rewrittenRaw,
    rewriteStrategy: rewrittenRaw.rewriteStrategy || (deps.rewriteQuery ? 'custom' : 'normalized_fallback'),
    fallbackUsed: typeof rewrittenRaw.fallbackUsed === 'boolean' ? rewrittenRaw.fallbackUsed : false,
  }
  const snippets = retrieve({
    query: rewritten.searchQuery,
    topK: 3,
    conversationId: traceContext.conversationId,
    requestId: traceContext.requestId,
  })

  if (snippets.length === 0) {
    logRagHit({
      conversationId: traceContext.conversationId,
      requestId: traceContext.requestId,
      question: message,
      rewrittenQuery: rewritten.searchQuery,
      topK: 3,
      hits: [],
      fallbackUsed: true,
      fallbackReason: 'no_retrieved_snippets',
      insufficientKnowledge: true,
      answerType: 'insufficient_knowledge',
      rewriteStrategy: rewritten.rewriteStrategy || 'normalized_fallback',
    })
    return {
      reply: KNOWLEDGE_FALLBACK_REPLY,
      rewrittenQuery: rewritten.searchQuery,
      snippets,
      conservative: true,
      fallbackUsed: true,
      fallbackReason: 'no_retrieved_snippets',
      answerType: 'insufficient_knowledge',
      insufficientKnowledge: true,
      rewriteStrategy: rewritten.rewriteStrategy || 'normalized_fallback',
    }
  }

  let answerMeta: GeneratedAnswerMeta
  try {
    answerMeta = deps.generateAnswer
      ? {
          reply: await withTimeout(
            deps.generateAnswer({
              message,
              rewrittenQuery: rewritten.searchQuery,
              snippets,
            }),
            9000,
            'Knowledge answer timeout after 9 seconds'
          ),
          fallbackUsed: false,
          answerType: 'custom_answer' as const,
        }
      : await withTimeout(
          defaultGenerateAnswer({
            message,
            rewrittenQuery: rewritten.searchQuery,
            snippets,
          }),
          9000,
          'Knowledge answer timeout after 9 seconds'
        )
  } catch {
    answerMeta = {
      reply: buildDeterministicAnswer(snippets),
      fallbackUsed: true,
      fallbackReason: 'rag_answer_timeout',
      answerType: 'deterministic_answer',
    }
  }

  const insufficientKnowledge = answerMeta.answerType === 'insufficient_knowledge'

  logRagHit({
    conversationId: traceContext.conversationId,
    requestId: traceContext.requestId,
    question: message,
    rewrittenQuery: rewritten.searchQuery,
    topK: 3,
    hits: snippets.map((snippet) => ({
      id: snippet.id,
      title: snippet.title,
      score: snippet.score,
    })),
    fallbackUsed: answerMeta.fallbackUsed || Boolean(rewritten.fallbackUsed),
    fallbackReason: answerMeta.fallbackReason || rewritten.fallbackReason,
    insufficientKnowledge,
    answerType: answerMeta.answerType,
    rewriteStrategy: rewritten.rewriteStrategy || 'normalized_fallback',
  })

  return {
    reply: answerMeta.reply,
    rewrittenQuery: rewritten.searchQuery,
    snippets,
    conservative: answerMeta.reply.includes('当前知识库里没有足够依据'),
    fallbackUsed: answerMeta.fallbackUsed || Boolean(rewritten.fallbackUsed),
    fallbackReason: answerMeta.fallbackReason || rewritten.fallbackReason,
    answerType: answerMeta.answerType,
    insufficientKnowledge,
    rewriteStrategy: rewritten.rewriteStrategy || 'normalized_fallback',
  }
}