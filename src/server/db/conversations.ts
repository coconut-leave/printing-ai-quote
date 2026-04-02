import { prisma } from './prisma'

export async function createConversation(options?: { customerName?: string; customerId?: string }) {
  return prisma.conversation.create({
    data: {
      customerName: options?.customerName,
      customerId: options?.customerId,
      status: 'OPEN',
    },
  })
}

export async function getConversationById(conversationId: number) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
  })
}

export async function addMessageToConversation(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) {
  return prisma.message.create({
    data: {
      conversationId,
      sender,
      type: 'TEXT',
      content,
      metadata: metadata ? metadata : undefined,
    },
  })
}

export async function updateConversationStatus(conversationId: number, status: 'OPEN' | 'MISSING_FIELDS' | 'QUOTED' | 'PENDING_HUMAN' | 'CLOSED') {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status },
  })
}

export async function createHandoffRecord(conversationId: number, reason: string, assignedTo?: string) {
  return prisma.handoffRecord.create({
    data: {
      conversationId,
      reason,
      assignedTo: assignedTo || null,
      resolved: false,
    },
  })
}

export async function getConversationWithDetails(conversationId: number) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
      },
      handoffs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function getQuoteById(quoteId: number) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      conversation: true,
      productCategory: true,
    },
  })
}

export async function getLatestParametersForConversation(conversationId: number): Promise<Record<string, any> | null> {
  // 优先从最新的 Quote 中获取参数
  const latestQuote = await prisma.quote.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  })

  if (latestQuote?.parameters) {
    const params = latestQuote.parameters as Record<string, any>
    // 移除不必要的字段
    const { missingFields, ...cleanParams } = params
    return cleanParams
  }

  // 如果没有 Quote，从最新的 ASSISTANT 消息中尝试提取
  const latestAssistantMessage = await prisma.message.findFirst({
    where: {
      conversationId,
      sender: 'ASSISTANT',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (latestAssistantMessage?.metadata) {
    const metadata = latestAssistantMessage.metadata as Record<string, any>
    if (metadata.mergedParams) {
      const params = metadata.mergedParams as Record<string, any>
      // 移除不必要的字段
      const { missingFields, ...cleanParams } = params
      return cleanParams
    }
  }

  return null
}

export async function createQuoteRecord(params: {
  conversationId: number
  productType: string
  summary: string
  unitPrice: number
  totalPrice: number
  shippingFee: number
  tax: number
  finalPrice: number
  normalizedParams: object
  pricingDetails?: object
}) {
  // 查找或创建默认品类 brochure
  let productCategory = await prisma.productCategory.findFirst({ where: { slug: 'brochure' } })
  if (!productCategory) {
    productCategory = await prisma.productCategory.create({
      data: {
        name: 'Brochure',
        slug: 'brochure',
        description: 'Album/brochure product category',
        isActive: true,
      },
    })
  }

  return prisma.quote.create({
    data: {
      conversationId: params.conversationId,
      productCategoryId: productCategory.id,
      parameters: {
        productType: params.productType,
        ...params.normalizedParams,
      },
      pricingDetails: params.pricingDetails ?? {
        unitPrice: params.unitPrice,
        totalPrice: params.totalPrice,
        shippingFee: params.shippingFee,
        tax: params.tax,
        finalPrice: params.finalPrice,
      },
      subtotalCents: Math.round(params.totalPrice * 100),
      shippingCents: Math.round(params.shippingFee * 100),
      taxCents: Math.round(params.tax * 100),
      totalCents: Math.round(params.finalPrice * 100),
      status: 'PENDING',
    },
  })
}

export async function listConversations() {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      quotes: {
        take: 1,
      },
    },
  })
}
