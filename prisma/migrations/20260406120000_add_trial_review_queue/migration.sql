-- CreateEnum
CREATE TYPE "TrialReviewStatus" AS ENUM ('PENDING_REVIEW', 'MANUAL_CONFIRMED', 'RETURNED_AS_ESTIMATE', 'HANDOFF_TO_HUMAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TrialReviewSourceKind" AS ENUM ('REFERENCE_QUOTE', 'MANUAL_REVIEW', 'HUMAN_FOLLOWUP');

-- CreateEnum
CREATE TYPE "TrialReviewActionType" AS ENUM ('QUEUED', 'MANUAL_CONFIRMED', 'RETURNED_AS_ESTIMATE', 'HANDOFF_TO_HUMAN', 'CLOSED');

-- CreateTable
CREATE TABLE "TrialReviewCase" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "quoteId" INTEGER,
    "status" "TrialReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "sourceKind" "TrialReviewSourceKind" NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "queueReason" TEXT NOT NULL,
    "queueReasonCode" TEXT,
    "deliveryScopeLabel" TEXT,
    "deliveryScopeNote" TEXT,
    "currentQuoteStatusLabel" TEXT,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "operatorName" TEXT,
    "lastActionNote" TEXT,
    "manualConfirmedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialReviewCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialReviewAuditLog" (
    "id" SERIAL NOT NULL,
    "reviewCaseId" INTEGER NOT NULL,
    "fromStatus" "TrialReviewStatus",
    "toStatus" "TrialReviewStatus" NOT NULL,
    "actionType" "TrialReviewActionType" NOT NULL,
    "operatorName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialReviewAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialReviewCase_conversationId_key" ON "TrialReviewCase"("conversationId");

-- CreateIndex
CREATE INDEX "TrialReviewCase_status_updatedAt_idx" ON "TrialReviewCase"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrialReviewCase_sourceKind_updatedAt_idx" ON "TrialReviewCase"("sourceKind", "updatedAt");

-- CreateIndex
CREATE INDEX "TrialReviewAuditLog_reviewCaseId_createdAt_idx" ON "TrialReviewAuditLog"("reviewCaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrialReviewCase" ADD CONSTRAINT "TrialReviewCase_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialReviewCase" ADD CONSTRAINT "TrialReviewCase_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialReviewAuditLog" ADD CONSTRAINT "TrialReviewAuditLog_reviewCaseId_fkey" FOREIGN KEY ("reviewCaseId") REFERENCES "TrialReviewCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;