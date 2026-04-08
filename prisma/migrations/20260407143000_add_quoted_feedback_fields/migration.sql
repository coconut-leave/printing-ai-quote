-- AlterEnum
ALTER TYPE "TrialReviewSourceKind" ADD VALUE 'QUOTED_FEEDBACK';

-- AlterTable
ALTER TABLE "TrialReviewCase"
ADD COLUMN "manualConfirmationResult" TEXT,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "rejectionTargetArea" TEXT,
ADD COLUMN "calibrationSignal" TEXT,
ADD COLUMN "driftSourceCandidate" TEXT,
ADD COLUMN "driftDirection" TEXT;