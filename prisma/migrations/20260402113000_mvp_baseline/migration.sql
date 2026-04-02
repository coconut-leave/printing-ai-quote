-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'MISSING_FIELDS', 'QUOTED', 'PENDING_HUMAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'ASSISTANT', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'FILE', 'NOTE', 'COMMAND');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ParameterDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('BASE', 'ADDITIONAL', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "FeedbackUserType" AS ENUM ('CUSTOMER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReflectionIssueType" AS ENUM ('PARAM_MISSING', 'PARAM_WRONG', 'QUOTE_INACCURATE', 'SHOULD_HANDOFF');

-- CreateEnum
CREATE TYPE "ReflectionStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT,
    "customerId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "productCategoryId" INTEGER NOT NULL,
    "parameters" JSONB NOT NULL,
    "pricingDetails" JSONB,
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductParameterDefinition" (
    "id" SERIAL NOT NULL,
    "productCategoryId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "ParameterDataType" NOT NULL DEFAULT 'STRING',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "example" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductParameterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" SERIAL NOT NULL,
    "productCategoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "PricingRuleType" NOT NULL DEFAULT 'BASE',
    "condition" JSONB,
    "valueCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" SERIAL NOT NULL,
    "productCategoryId" INTEGER,
    "region" TEXT NOT NULL,
    "minWeightGrams" INTEGER,
    "maxWeightGrams" INTEGER,
    "costCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoffRecord" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "assignedTo" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HandoffRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAnnotation" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "quoteId" INTEGER,
    "userType" "FeedbackUserType" NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionRecord" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "quoteId" INTEGER,
    "originalExtractedParams" JSONB,
    "correctedParams" JSONB,
    "originalQuoteSummary" TEXT,
    "correctedQuoteSummary" TEXT,
    "issueType" "ReflectionIssueType" NOT NULL,
    "reflectionText" TEXT NOT NULL,
    "suggestionDraft" TEXT NOT NULL,
    "status" "ReflectionStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReflectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductParameterDefinition_productCategoryId_key_key" ON "ProductParameterDefinition"("productCategoryId", "key");

-- CreateIndex
CREATE INDEX "ReflectionRecord_conversationId_createdAt_idx" ON "ReflectionRecord"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductParameterDefinition" ADD CONSTRAINT "ProductParameterDefinition_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRule" ADD CONSTRAINT "ShippingRule_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffRecord" ADD CONSTRAINT "HandoffRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAnnotation" ADD CONSTRAINT "FeedbackAnnotation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAnnotation" ADD CONSTRAINT "FeedbackAnnotation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionRecord" ADD CONSTRAINT "ReflectionRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionRecord" ADD CONSTRAINT "ReflectionRecord_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;