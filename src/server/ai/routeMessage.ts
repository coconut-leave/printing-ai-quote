import OpenAI from 'openai'
import { z } from 'zod'
import { buildAgentRouterPrompt } from '@/server/ai/prompts/agentRouter'
import { isEnvVarConfigured, requireOpenAIKey } from '@/server/config/env'
import { detectIntent, hasStrongFileReviewSignal, looksLikeFreshQuoteRequest, type DetectIntentInput } from '@/server/intent/detectIntent'
import { logRouterHit, type TraceContext } from '@/server/logging/routerRagTrace'

export type AgentRouterIntent =
  | 'QUOTE_REQUEST'
  | 'PROVIDE_PARAMS'
  | 'KNOWLEDGE_QA'
  | 'FILE_BASED_INQUIRY'
  | 'PRICE_NEGOTIATION'
  | 'ASK_HUMAN'
  | 'ORDER_PROGRESS'
  | 'COMPLAINT_OR_RISK'
  | 'UNKNOWN'

export type AgentRouteDecision = {
  intent: AgentRouterIntent
  confidence: number
  shouldUseRAG: boolean
  shouldExtractParams: boolean
  shouldRunQuoteEngine: boolean
  shouldHandoff: boolean
  shouldGenerateAlternativePlan: boolean
  reason: string
}

type RouteMessageDeps = {
  callModel?: (prompt: string) => Promise<string>
}

type RouteMessageTraceContext = TraceContext

const DELIVERY_KEYWORDS = ['交期', '工期', '多久能发', '多久能好', '多久交货', '多久出货', '几天能出', '几天发货', '生产周期']
const CASE_KEYWORDS = ['案例', '常见做法', '常见案例', '案例说明', '一般怎么做']
const FAQ_KEYWORDS = ['faq', '常见问题', '注意事项', '要注意什么']

const routeDecisionSchema = z.object({
  intent: z.enum([
    'QUOTE_REQUEST',
    'PROVIDE_PARAMS',
    'KNOWLEDGE_QA',
    'FILE_BASED_INQUIRY',
    'PRICE_NEGOTIATION',
    'ASK_HUMAN',
    'ORDER_PROGRESS',
    'COMPLAINT_OR_RISK',
    'UNKNOWN',
  ]),
  confidence: z.number().min(0).max(1),
  shouldUseRAG: z.boolean(),
  shouldExtractParams: z.boolean(),
  shouldRunQuoteEngine: z.boolean(),
  shouldHandoff: z.boolean(),
  shouldGenerateAlternativePlan: z.boolean(),
  reason: z.string().min(1),
}).strict()

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

function normalizeText(text: string): string {
  return text.trim().toLowerCase()
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const unwrapped = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed
  const match = unwrapped.match(/\{[\s\S]*\}/)
  return match ? match[0] : unwrapped
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

function buildDecision(
  intent: AgentRouterIntent,
  confidence: number,
  reason: string,
  overrides?: Partial<Omit<AgentRouteDecision, 'intent' | 'confidence' | 'reason'>>
): AgentRouteDecision {
  const base: AgentRouteDecision = {
    intent,
    confidence,
    shouldUseRAG: false,
    shouldExtractParams: false,
    shouldRunQuoteEngine: false,
    shouldHandoff: false,
    shouldGenerateAlternativePlan: false,
    reason,
  }

  return {
    ...base,
    ...overrides,
  }
}

function mapDetectedIntentToRoute(input: DetectIntentInput): AgentRouteDecision {
  const normalizedText = normalizeText(input.message)

  if (containsAny(normalizedText, DELIVERY_KEYWORDS)) {
    if (input.hasHistoricalParams || input.conversationStatus) {
      return buildDecision('ORDER_PROGRESS', 0.88, 'delivery/progress style question with active conversation context')
    }

    return buildDecision('KNOWLEDGE_QA', 0.86, 'delivery lead-time explanation question', {
      shouldUseRAG: true,
    })
  }

  if (containsAny(normalizedText, CASE_KEYWORDS) || containsAny(normalizedText, FAQ_KEYWORDS)) {
    return buildDecision('KNOWLEDGE_QA', 0.84, 'faq/case explanation question', {
      shouldUseRAG: true,
    })
  }

  const detected = detectIntent(input)

  switch (detected.intent) {
    case 'FILE_REVIEW_REQUEST':
      return buildDecision('FILE_BASED_INQUIRY', 0.98, detected.reason, {
        shouldHandoff: true,
      })
    case 'HUMAN_REQUEST':
      return buildDecision('ASK_HUMAN', 0.98, detected.reason, {
        shouldHandoff: true,
      })
    case 'COMPLAINT':
      return buildDecision('COMPLAINT_OR_RISK', 0.98, detected.reason, {
        shouldHandoff: true,
      })
    case 'PROGRESS_INQUIRY':
      return buildDecision('ORDER_PROGRESS', 0.94, detected.reason)
    case 'BARGAIN_REQUEST':
      return buildDecision('PRICE_NEGOTIATION', 0.92, detected.reason, {
        shouldGenerateAlternativePlan: true,
      })
    case 'MATERIAL_CONSULTATION':
    case 'PROCESS_CONSULTATION':
    case 'SAMPLE_REQUEST':
      return buildDecision('KNOWLEDGE_QA', 0.93, detected.reason, {
        shouldUseRAG: true,
      })
    case 'PARAM_SUPPLEMENT':
      return buildDecision('PROVIDE_PARAMS', 0.9, detected.reason, {
        shouldExtractParams: true,
        shouldRunQuoteEngine: true,
      })
    case 'QUOTE_REQUEST':
    case 'RECOMMENDATION_CONFIRMATION':
      return buildDecision('QUOTE_REQUEST', 0.93, detected.reason, {
        shouldExtractParams: true,
        shouldRunQuoteEngine: true,
      })
    case 'SPEC_RECOMMENDATION':
    case 'SOLUTION_RECOMMENDATION':
      return buildDecision('UNKNOWN', 0.72, 'recommendation-style consultation should stay on existing consultation flow')
    default:
      return buildDecision('UNKNOWN', 0.65, detected.reason)
  }
}

function protectModelDecision(input: DetectIntentInput, decision: AgentRouteDecision): AgentRouteDecision {
  const normalizedText = normalizeText(input.message)
  const hasFileSignal = hasStrongFileReviewSignal(normalizedText)
  const hasQuoteSignal = looksLikeFreshQuoteRequest(normalizedText)

  if (decision.intent === 'FILE_BASED_INQUIRY' && !hasFileSignal) {
    return mapDetectedIntentToRoute(input)
  }

  if (decision.shouldHandoff && decision.intent === 'FILE_BASED_INQUIRY' && hasQuoteSignal && !hasFileSignal) {
    return mapDetectedIntentToRoute(input)
  }

  return decision
}

function isSameDecision(left: AgentRouteDecision, right: AgentRouteDecision): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function classifyWithModel(input: DetectIntentInput, deps: RouteMessageDeps): Promise<AgentRouteDecision> {
  const prompt = buildAgentRouterPrompt(input)
  const text = deps.callModel
    ? await deps.callModel(prompt)
    : await callModel(prompt)

  const jsonText = extractJsonObject(text)
  return routeDecisionSchema.parse(JSON.parse(jsonText))
}

async function callModel(prompt: string): Promise<string> {
  const client = getOpenAIClient()
  const response = await withTimeout(
    client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: 220,
    }),
    7000,
    'Agent router timeout after 7 seconds'
  )

  const output = response.output as any
  const text = output?.[0]?.text || output?.text || response.output_text
  if (!text || typeof text !== 'string') {
    throw new Error('No text returned from agent router model')
  }

  return text
}

export async function routeMessage(
  input: DetectIntentInput,
  deps: RouteMessageDeps = {},
  traceContext: RouteMessageTraceContext = {}
): Promise<AgentRouteDecision> {
  return routeMessageWithTrace(input, deps, traceContext)
}

export async function routeMessageWithTrace(
  input: DetectIntentInput,
  deps: RouteMessageDeps = {},
  traceContext: RouteMessageTraceContext = {}
): Promise<AgentRouteDecision> {
  if (deps.callModel || canUseRemoteModel()) {
    try {
      const modelDecision = await classifyWithModel(input, deps)
      const decision = protectModelDecision(input, modelDecision)
      const decisionWasGuarded = !isSameDecision(modelDecision, decision)
      logRouterHit({
        ...traceContext,
        message: input.message,
        intent: decision.intent,
        confidence: decision.confidence,
        shouldUseRAG: decision.shouldUseRAG,
        shouldExtractParams: decision.shouldExtractParams,
        shouldRunQuoteEngine: decision.shouldRunQuoteEngine,
        shouldHandoff: decision.shouldHandoff,
        shouldGenerateAlternativePlan: decision.shouldGenerateAlternativePlan,
        reason: decision.reason,
        decisionSource: decisionWasGuarded ? 'fallback_rule' : 'model',
        fallbackReason: decisionWasGuarded ? 'model_decision_overridden_by_quote_guard' : undefined,
      })
      return decision
    } catch (error) {
      const decision = mapDetectedIntentToRoute(input)
      logRouterHit({
        ...traceContext,
        message: input.message,
        intent: decision.intent,
        confidence: decision.confidence,
        shouldUseRAG: decision.shouldUseRAG,
        shouldExtractParams: decision.shouldExtractParams,
        shouldRunQuoteEngine: decision.shouldRunQuoteEngine,
        shouldHandoff: decision.shouldHandoff,
        shouldGenerateAlternativePlan: decision.shouldGenerateAlternativePlan,
        reason: decision.reason,
        decisionSource: 'fallback_rule',
        fallbackReason: error instanceof Error ? error.message : String(error),
      })
      return decision
    }
  }

  const decision = mapDetectedIntentToRoute(input)
  logRouterHit({
    ...traceContext,
    message: input.message,
    intent: decision.intent,
    confidence: decision.confidence,
    shouldUseRAG: decision.shouldUseRAG,
    shouldExtractParams: decision.shouldExtractParams,
    shouldRunQuoteEngine: decision.shouldRunQuoteEngine,
    shouldHandoff: decision.shouldHandoff,
    shouldGenerateAlternativePlan: decision.shouldGenerateAlternativePlan,
    reason: decision.reason,
    decisionSource: 'rule',
  })
  return decision
}