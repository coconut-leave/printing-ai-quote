import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { getProductCategoryLookup } from '@/lib/catalog/productCategoryMapping'
import { collectReflectionMissingFields } from '@/lib/reflection/context'
import { type ReflectionIssueType } from '@/lib/reflection/issueTypes'

async function getOrCreateProductCategory(productType: string) {
  const { canonical, legacySlugs, legacyNames } = getProductCategoryLookup(productType)

  const canonicalCategory = await prisma.productCategory.findUnique({
    where: { slug: canonical.slug },
  })

  if (canonicalCategory) {
    return canonicalCategory
  }

  const orConditions = []
  if (legacySlugs.length > 0) {
    orConditions.push({ slug: { in: legacySlugs } })
  }
  if (legacyNames.length > 0) {
    orConditions.push({ name: { in: legacyNames } })
  }

  if (orConditions.length > 0) {
    const legacyCategory = await prisma.productCategory.findFirst({
      where: {
        OR: orConditions,
      },
    })

    if (legacyCategory) {
      const needsCanonicalUpdate =
        legacyCategory.slug !== canonical.slug ||
        legacyCategory.name !== canonical.name ||
        legacyCategory.description !== canonical.description ||
        legacyCategory.isActive !== true

      if (!needsCanonicalUpdate) {
        return legacyCategory
      }

      console.warn(
        `[createQuoteRecord] canonicalizing legacy product category id=${legacyCategory.id} `
          + `from slug=${legacyCategory.slug} name=${legacyCategory.name} to slug=${canonical.slug} name=${canonical.name}`
      )

      return prisma.productCategory.update({
        where: { id: legacyCategory.id },
        data: {
          slug: canonical.slug,
          name: canonical.name,
          description: canonical.description,
          isActive: true,
        },
      })
    }
  }

  return prisma.productCategory.create({
    data: {
      name: canonical.name,
      slug: canonical.slug,
      description: canonical.description,
      isActive: true,
    },
  })
}

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
  try {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    })
  } catch (error) {
    const message = `[updateConversationStatus] failed conversationId=${conversationId}, status=${status}`
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
      throw error
    }

    // Keep local development usable while migrations are still being aligned.
    console.warn(`${message} (development mode tolerated)`) 
    console.warn(error)
    return null
  }
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
      reflections: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createReflectionRecord(params: {
  conversationId: number
  quoteId?: number
  originalExtractedParams?: Record<string, any>
  correctedParams?: Record<string, any>
  originalQuoteSummary?: string
  correctedQuoteSummary?: string
  issueType: ReflectionIssueType
  reflectionText: string
  suggestionDraft: string
}) {
  return prisma.reflectionRecord.create({
    data: {
      conversationId: params.conversationId,
      quoteId: params.quoteId ?? null,
      originalExtractedParams: params.originalExtractedParams,
      correctedParams: params.correctedParams,
      originalQuoteSummary: params.originalQuoteSummary ?? null,
      correctedQuoteSummary: params.correctedQuoteSummary ?? null,
      issueType: params.issueType,
      reflectionText: params.reflectionText,
      suggestionDraft: params.suggestionDraft,
      status: 'NEW',
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
  const productCategory = await getOrCreateProductCategory(params.productType)

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

type ConversationListOptions = {
  status?: 'OPEN' | 'MISSING_FIELDS' | 'QUOTED' | 'PENDING_HUMAN' | 'CLOSED'
  updatedAt?: {
    gte?: Date
    lt?: Date
  }
}

export async function listConversations(options: ConversationListOptions = {}) {
  return prisma.conversation.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.updatedAt ? { updatedAt: options.updatedAt } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
}

export async function listConversationsForExport(options: ConversationListOptions = {}) {
  return prisma.conversation.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.updatedAt ? { updatedAt: options.updatedAt } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function getConsultationTrackingDataset(limit: number = 200) {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          sender: true,
          metadata: true,
          createdAt: true,
        },
      },
      quotes: {
        select: {
          id: true,
        },
      },
      handoffs: {
        select: {
          reason: true,
          createdAt: true,
        },
      },
    },
  })
}

// ===== Reflection review & aggregation =====
export async function updateReflectionStatus(
  reflectionId: number,
  status: 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
) {
  return prisma.reflectionRecord.update({
    where: { id: reflectionId },
    data: { status },
  })
}

export async function updateReflectionRecord(
  reflectionId: number,
  updates: {
    status?: 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
    issueType?: ReflectionIssueType
    correctedParams?: Record<string, any> | null
    correctedQuoteSummary?: string | null
  }
) {
  return prisma.reflectionRecord.update({
    where: { id: reflectionId },
    data: {
      status: updates.status,
      issueType: updates.issueType,
      correctedParams: updates.correctedParams === null ? Prisma.JsonNull : updates.correctedParams,
      correctedQuoteSummary: updates.correctedQuoteSummary,
    },
  })
}

export async function getAllReflections(
  limit: number = 50,
  offset: number = 0,
  filters?: {
    status?: 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
    issueType?: ReflectionIssueType
  }
) {
  const where = {
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.issueType ? { issueType: filters.issueType } : {}),
  }

  const records = await prisma.reflectionRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: {
      conversation: {
        select: {
          id: true,
          customerName: true,
          status: true,
          createdAt: true,
        },
      },
      quote: {
        select: {
          id: true,
          totalCents: true,
        },
      },
    },
  })

  const total = await prisma.reflectionRecord.count({ where })

  return { records, total }
}

export async function getReflectionStats() {
  // Function to compute stats from recent reflections
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get issue type distribution (last 7 days)
  const issueTypeDistribution = await prisma.reflectionRecord.groupBy({
    by: ['issueType'],
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    _count: true,
  })

  // Get most common missing fields
  const reflectionsWithMissing = await prisma.reflectionRecord.findMany({
    where: {
      issueType: { in: ['PARAM_MISSING', 'PACKAGING_PARAM_MISSING'] },
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      originalExtractedParams: true,
      correctedParams: true,
    },
  })

  const missingFieldsCount: Record<string, number> = {}
  reflectionsWithMissing.forEach((r) => {
    collectReflectionMissingFields(
      r.originalExtractedParams as Record<string, any> | null,
      r.correctedParams as Record<string, any> | null
    ).forEach((field) => {
      missingFieldsCount[field] = (missingFieldsCount[field] || 0) + 1
    })
  })

  // Get handoff reasons (SHOULD_HANDOFF type)
  const handoffReflections = await prisma.reflectionRecord.findMany({
    where: {
      issueType: { in: ['SHOULD_HANDOFF', 'SHOULD_HANDOFF_BUT_NOT'] },
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      suggestionDraft: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Get status breakdown
  const statusBreakdown = await prisma.reflectionRecord.groupBy({
    by: ['status'],
    _count: true,
  })

  return {
    issueTypeDistribution,
    topMissingFields: Object.entries(missingFieldsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => ({ field, count })),
    recentHandoffReasons: handoffReflections.map((r) => r.suggestionDraft).slice(0, 5),
    statusBreakdown: statusBreakdown.map((item) => ({
      status: item.status,
      count: item._count,
    })),
    period: '7 days',
  }
}

// ===== Improvement suggestions (derived from APPROVED reflections) =====
export async function getApprovedReflections(limit: number = 50, offset: number = 0) {
  const records = await prisma.reflectionRecord.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: {
      conversation: {
        select: {
          id: true,
          customerName: true,
          status: true,
        },
      },
      quote: {
        select: {
          id: true,
          totalCents: true,
        },
      },
    },
  })

  const total = await prisma.reflectionRecord.count({
    where: { status: 'APPROVED' },
  })

  return { records, total }
}
