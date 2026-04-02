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
      reply: '当前还没有可查询的历史会话记录。您可以直接发送产品、尺寸、数量等信息，我先帮您进入报价流程。',
    }
  }

  if (conversation.status === 'PENDING_HUMAN' || conversation.handoffs?.some((item) => !item.resolved)) {
    return {
      status: 'progress_inquiry',
      reply: '当前询价已转人工处理，人工团队正在继续核价或跟进，请稍候查看会话详情或等待人工回复。',
    }
  }

  if (conversation.status === 'QUOTED' || (conversation.quotes?.length || 0) > 0) {
    return {
      status: 'progress_inquiry',
      reply: '当前已生成报价，您可以查看当前会话详情；如果需要对外发送，也可以使用报价单导出入口。如需调整规格，我也可以继续按新要求重新报价。',
    }
  }

  if (conversation.status === 'MISSING_FIELDS') {
    const missingFieldsText = buildMissingFieldsText(conversation)
    return {
      status: 'progress_inquiry',
      reply: missingFieldsText
        ? `当前还缺少这些参数：${missingFieldsText}，暂未生成正式报价。您可以直接继续补充这些规格，我会接着完成报价。`
        : '当前还缺少部分参数，暂未生成正式报价。请继续补充关键规格后，我会继续完成报价。',
    }
  }

  return {
    status: 'progress_inquiry',
    reply: '当前询价正在处理中，尚未生成正式报价。如果您还有尺寸、数量、纸张或工艺信息，也可以继续补充，以加快报价进度。',
  }
}

export function buildSampleRequestReply(): IntentBusinessResult {
  return {
    status: 'sample_request',
    reply: '已识别为打样或样品咨询。当前 MVP 可先记录您的样品需求，您可以继续补充产品类型、尺寸、数量和打样目的；如需更快确认，也可直接联系人工继续处理。',
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
        ? `当前还缺少关键参数，暂不适合直接比较最终价格。先给您一个更省成本的常见参考方案：${knowledgeCard?.shortAnswer} 如果您认可，我可以继续按这个方案补齐参数并估价。`
        : '当前还缺少关键参数，暂不适合直接比较更经济方案。您先补齐尺寸、数量、纸张或工艺后，我可以按更常见、更省成本的配置给您提供参考价。',
      recommendedParams: recommendationPayload,
    }
  }

  if (conversation?.status === 'QUOTED' || (conversation?.quotes?.length || 0) > 0) {
    return {
      status: 'bargain_request',
      reply: recommendationPayload
        ? `当前正式报价不会直接修改，也不会自动给出折扣。如果您更想控成本，可以先参考这个更贴合预算的常见方案：${knowledgeCard?.shortAnswer} 如果需要，我也可以按这个方案继续估价。`
        : '当前正式报价不会直接修改，也不会自动给出折扣。如果您希望控制成本，我可以按更常见或更经济的方案重新给您提供参考价，例如调整纸张、克重、单双面或工艺。',
      recommendedParams: recommendationPayload,
    }
  }

  return {
    status: 'bargain_request',
    reply: recommendationPayload
      ? `可以的。按您现在提到的用途和预算倾向，先给您一个更贴合的常见方案：${knowledgeCard?.shortAnswer} 如果您认可，我也可以按这个方案继续估价。`
      : '可以的。当前不会直接改正式报价，但我可以按更常见或更经济的方案先给您参考价。您可以继续告诉我产品、尺寸、数量，或说明想优先压缩哪部分成本。',
    recommendedParams: recommendationPayload,
  }
}

export function buildUnknownIntentReply(): IntentBusinessResult {
  return {
    status: 'intent_only',
    reply: '已收到您的消息。您可以直接告诉我产品、尺寸和数量；如果需要人工协助，也可以直接说“转人工”。',
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