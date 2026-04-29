-- AlterTable
ALTER TABLE "public"."Disponibilite" ADD COLUMN     "bookingVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."RendezVous" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByRole" "public"."UserRole",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "RendezVous_disponibiliteId_dateHeure_idx" ON "public"."RendezVous"("disponibiliteId", "dateHeure");

-- CreateIndex
CREATE INDEX "RendezVous_statut_dateHeure_idx" ON "public"."RendezVous"("statut", "dateHeure");
