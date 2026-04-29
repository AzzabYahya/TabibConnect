-- Add CIN document verification status fields
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

ALTER TABLE "Patient"
  ADD COLUMN "cinDocumentVerificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "cinDocumentVerificationScore" INTEGER,
  ADD COLUMN "cinDocumentVerificationNote" TEXT,
  ADD COLUMN "cinDocumentVerifiedAt" TIMESTAMP,
  ADD COLUMN "cinDocumentRejectedAt" TIMESTAMP;

ALTER TABLE "Doctor"
  ADD COLUMN "cinDocumentVerificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "cinDocumentVerificationScore" INTEGER,
  ADD COLUMN "cinDocumentVerificationNote" TEXT,
  ADD COLUMN "cinDocumentVerifiedAt" TIMESTAMP,
  ADD COLUMN "cinDocumentRejectedAt" TIMESTAMP;
