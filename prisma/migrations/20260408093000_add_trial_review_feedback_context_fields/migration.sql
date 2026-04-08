-- AlterTable
ALTER TABLE "TrialReviewCase"
ADD COLUMN "rejectionCategory" TEXT,
ADD COLUMN "contextSnapshot" JSONB;