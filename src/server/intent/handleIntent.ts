import { ChatIntent } from './detectIntent'
import { getMissingFieldsChineseText } from '@/lib/catalog/helpers'
import { resolveKnowledgeCard } from '@/server/knowledge/registry'

type ConversationSnapshot = {
  status?: string | null
  quotes?: Array<{ id: number }>
  handoffs?: Array<{ id: number; resolved: boolean }>
  messages?: Array<{
    sender?: string
    metadata?: any
  }>
}

export type IntentBusinessResult = {
  status: 'progress_inquiry' | 'sample_request' | 'bargain_request' | 'intent_only'
  reply: string
  conversationAction?: 'view_existing_quote'
  recommendedParams?: {
    productType?: string
    recommendedParams: Record<string, any>
    note: string
  }
}

function getLatestAssistantMetadata(conversation?: ConversationSnapshot | null): Record<string, any> | null {
  if (!conversation?.messages || conversation.messages.length === 0) {
    return null
  }

  const latestAssistantMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.sender === 'ASSISTANT' && message.metadata && typeof message.metadata === 'object')

  if (!latestAssistantMessage?.metadata || typeof latestAssistantMessage.metadata !== 'object') {
    return null
  }

  return latestAssistantMessage.metadata as Record<string, any>
}

function buildMissingFieldsText(conversation?: ConversationSnapshot | null): string | null {
  const metadata = getLatestAssistantMetadata(conversation)
  const missingFields = Array.isArray(metadata?.missingFields) ? metadata?.missingFields : []
  const productType = metadata?.mergedParams?.productType || metadata?.quoteParams?.productType

  if (missingFields.length === 0) {
    return null
  }

  return getMissingFieldsChineseText(productType, missingFields)
}

export function buildProgressInquiryReply(conversation?: ConversationSnapshot | null): IntentBusinessResult {
  if (!conversation) {
    return {
      status: 'progress_inquiry',
      reply: '这边还没有查到可跟进的历史询价。您直接把产品、尺寸、数量这些信息发我，我就能继续帮您往下看。',
    }
  }

  if (conversation.status === 'PENDING_HUMAN' || conversation.handoffs?.some((item) => !item.resolved)) {
    return {
      status: 'progress_inquiry',
      reply: '这单已经转给人工同事继续跟进了，正在核价或确认细节。您把补充信息继续发在这里就行，人工会接着看。',
    }
  }

  if (conversation.status === 'QUOTED' || (conversation.quotes?.length || 0) > 0) {
    return {
      status: 'progress_inquiry',
      reply: '这边已经有报价结果了，您可以查看当前会话详情；如果需要对外发送，也可以走报价单导出入口。要是规格还想调整，我也可以继续按新要求帮您重算。',
      conversationAction: 'view_existing_quote',
    }
  }

  if (conversation.status === 'MISSING_FIELDS') {
    const missingFieldsText = buildMissingFieldsText(conversation)
    return {
      status: 'progress_inquiry',
      reply: missingFieldsText
        ? `这边还差这些参数：${missingFieldsText}，所以暂时还没收成正式报价。您直接把这些规格补给我，我就接着往下算。`
        : '这边还差几项关键规格，所以暂时还没收成正式报价。您继续补充一下，我就接着往下算。',
    }
  }

  return {
    status: 'progress_inquiry',
    reply: '这边还在整理这单的报价信息，暂时还没出正式结果。要是您还有尺寸、数量、纸张或工艺信息，继续发我就行，我直接接着补。',
  }
}

export function buildSampleRequestReply(): IntentBusinessResult {
  return {
    status: 'sample_request',
    reply: '可以先帮您记成打样或样品需求。您把产品类型、尺寸、数量和打样目的发我，我先帮您整理；如果想更快推进，也可以直接转人工。',
  }
}

export function buildBargainRequestReply(message: string, conversation?: ConversationSnapshot | null): IntentBusinessResult {
  const knowledgeCard = resolveKnowledgeCard('SOLUTION_RECOMMENDATION', message)
  const recommendationPayload = knowledgeCard?.recommendedParams
    ? {
        productType: knowledgeCard.applicableProductTypes?.[0],
        recommendedParams: knowledgeCard.recommendedParams,
        note: knowledgeCard.note || '这是基于预算倾向的常见参考方案，不是正式报价。',
      }
    : undefined

  if (conversation?.status === 'MISSING_FIELDS') {
    return {
      status: 'bargain_request',
      reply: recommendationPayload
        ? `现在还差关键参数，先比最终价意义不大。要不我先给您一版更省成本的常见做法：${knowledgeCard?.shortAnswer} 您觉得方向可以的话，我就按这版继续补参和估价。`
        : '现在还差关键参数，先比最终价意义不大。您把尺寸、数量、纸张或工艺补齐后，我可以按更常见、也更省成本的配置再给您一版参考价。',
      recommendedParams: recommendationPayload,
    }
  }

  if (conversation?.status === 'QUOTED' || (conversation?.quotes?.length || 0) > 0) {
    return {
      status: 'bargain_request',
      reply: recommendationPayload
        ? `正式报价这边不会直接改价，也不会自动给折扣。不过如果您想把成本压下来，可以先参考这版更贴预算的常见方案：${knowledgeCard?.shortAnswer} 如果您要，我也可以按这版继续帮您估。`
        : '正式报价这边不会直接改价，也不会自动给折扣。不过如果您想控制成本，我可以按更常见或更经济的方案重新给您一版参考价，比如调整纸张、克重、单双面或工艺。',
      recommendedParams: recommendationPayload,
    }
  }

  return {
    status: 'bargain_request',
    reply: recommendationPayload
      ? `可以的。按您现在提到的用途和预算倾向，我先给您一版更贴合、也更省一点的常见方案：${knowledgeCard?.shortAnswer} 如果您觉得可以，我就按这版继续往下估。`
      : '可以的。我这边可以先按更常见或更经济的方案给您做参考。您继续告诉我产品、尺寸、数量，或者说明您最想压缩哪部分成本就行。',
    recommendedParams: recommendationPayload,
  }
}

export function buildUnknownIntentReply(): IntentBusinessResult {
  return {
    status: 'intent_only',
    reply: '收到。您可以直接告诉我产品、尺寸、数量，或者把想做的效果发我，我来帮您往报价方向收。需要人工的话也可以直接说“转人工”。',
  }
}

export function handleLightweightBusinessIntent(
  intent: ChatIntent,
  conversation?: ConversationSnapshot | null,
  message?: string
): IntentBusinessResult | null {
  if (intent === 'PROGRESS_INQUIRY') return buildProgressInquiryReply(conversation)
  if (intent === 'SAMPLE_REQUEST') return buildSampleRequestReply()
  if (intent === 'BARGAIN_REQUEST') return buildBargainRequestReply(message || '', conversation)
  if (intent === 'UNKNOWN') return buildUnknownIntentReply()
  return null
}