-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationTokenHash" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;

-- CreateTable
CREATE TABLE "public"."DoctorDocument" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorDocument_doctorId_idx" ON "public"."DoctorDocument"("doctorId");

-- CreateIndex
CREATE INDEX "User_emailVerificationTokenHash_idx" ON "public"."User"("emailVerificationTokenHash");

-- CreateIndex
CREATE INDEX "User_passwordResetTokenHash_idx" ON "public"."User"("passwordResetTokenHash");

-- AddForeignKey
ALTER TABLE "public"."DoctorDocument" ADD CONSTRAINT "DoctorDocument_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
