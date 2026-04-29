-- Store CIN document references for patient and doctor profiles (audit/admin)
ALTER TABLE "Patient"
ADD COLUMN "cinDocumentFileName" TEXT,
ADD COLUMN "cinDocumentFilePath" TEXT,
ADD COLUMN "cinDocumentMimeType" TEXT,
ADD COLUMN "cinDocumentSize" INTEGER,
ADD COLUMN "cinDocumentUploadedAt" TIMESTAMP(3);

ALTER TABLE "Doctor"
ADD COLUMN "cinDocumentFileName" TEXT,
ADD COLUMN "cinDocumentFilePath" TEXT,
ADD COLUMN "cinDocumentMimeType" TEXT,
ADD COLUMN "cinDocumentSize" INTEGER,
ADD COLUMN "cinDocumentUploadedAt" TIMESTAMP(3);
