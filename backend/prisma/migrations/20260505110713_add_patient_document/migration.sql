-- CreateEnum
CREATE TYPE "public"."DoctorChangeRequestType" AS ENUM ('PROFILE_UPDATE', 'PROFILE_PHOTO_UPDATE', 'LOCATION_CREATE', 'LOCATION_UPDATE');

-- CreateEnum
CREATE TYPE "public"."DoctorChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PatientChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Doctor" ALTER COLUMN "cinDocumentVerifiedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cinDocumentRejectedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."DoctorDocument" ADD COLUMN     "isProfilePhoto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Patient" ALTER COLUMN "cinDocumentVerifiedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cinDocumentRejectedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PatientChangeRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "public"."PatientChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reviewNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorChangeRequest" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "type" "public"."DoctorChangeRequestType" NOT NULL,
    "status" "public"."DoctorChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reviewNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isProfilePhoto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorPatientNote" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "isVisibleToPeers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorPatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientChangeRequest_patientId_status_createdAt_idx" ON "public"."PatientChangeRequest"("patientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientChangeRequest_status_createdAt_idx" ON "public"."PatientChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorChangeRequest_doctorId_status_createdAt_idx" ON "public"."DoctorChangeRequest"("doctorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorChangeRequest_status_createdAt_idx" ON "public"."DoctorChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_idx" ON "public"."PatientDocument"("patientId");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_isProfilePhoto_idx" ON "public"."PatientDocument"("patientId", "isProfilePhoto");

-- CreateIndex
CREATE INDEX "DoctorPatientNote_doctorId_createdAt_idx" ON "public"."DoctorPatientNote"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorPatientNote_patientId_createdAt_idx" ON "public"."DoctorPatientNote"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorPatientNote_rendezVousId_createdAt_idx" ON "public"."DoctorPatientNote"("rendezVousId", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorPatientNote_isVisibleToPeers_createdAt_idx" ON "public"."DoctorPatientNote"("isVisibleToPeers", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorDocument_doctorId_isProfilePhoto_idx" ON "public"."DoctorDocument"("doctorId", "isProfilePhoto");

-- AddForeignKey
ALTER TABLE "public"."PatientChangeRequest" ADD CONSTRAINT "PatientChangeRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientChangeRequest" ADD CONSTRAINT "PatientChangeRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorChangeRequest" ADD CONSTRAINT "DoctorChangeRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorChangeRequest" ADD CONSTRAINT "DoctorChangeRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorPatientNote" ADD CONSTRAINT "DoctorPatientNote_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorPatientNote" ADD CONSTRAINT "DoctorPatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorPatientNote" ADD CONSTRAINT "DoctorPatientNote_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "public"."RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
