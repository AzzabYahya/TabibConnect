-- AlterTable
ALTER TABLE "public"."Doctor" ADD COLUMN     "nomComplet" TEXT;

-- CreateIndex
CREATE INDEX "Doctor_nomComplet_idx" ON "public"."Doctor"("nomComplet");
