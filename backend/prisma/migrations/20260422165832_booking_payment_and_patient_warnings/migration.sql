-- AlterTable
ALTER TABLE "public"."Patient" ADD COLUMN     "bookingWarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastNoShowAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."RendezVous" ADD COLUMN     "acceptedCashPolicy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptedGeneralTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "methodePaiement" "public"."MethodePaiement" NOT NULL DEFAULT 'CASH';
