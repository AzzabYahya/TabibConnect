-- AlterTable
ALTER TABLE "public"."Doctor" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Patient" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Ordonnance" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicaments" JSONB NOT NULL,
    "instructions" TEXT,
    "renouvelable" BOOLEAN NOT NULL DEFAULT false,
    "qrCode" TEXT NOT NULL,
    "pdfPath" TEXT,
    "uploadedFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ordonnance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "payload" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ordonnance_rendezVousId_key" ON "public"."Ordonnance"("rendezVousId");

-- CreateIndex
CREATE UNIQUE INDEX "Ordonnance_qrCode_key" ON "public"."Ordonnance"("qrCode");

-- CreateIndex
CREATE INDEX "Ordonnance_doctorId_createdAt_idx" ON "public"."Ordonnance"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Ordonnance_patientId_createdAt_idx" ON "public"."Ordonnance"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Ordonnance_qrCode_idx" ON "public"."Ordonnance"("qrCode");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "public"."AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Ordonnance" ADD CONSTRAINT "Ordonnance_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "public"."RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ordonnance" ADD CONSTRAINT "Ordonnance_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ordonnance" ADD CONSTRAINT "Ordonnance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

