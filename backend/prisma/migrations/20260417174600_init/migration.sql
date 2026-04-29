-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Sexe" AS ENUM ('HOMME', 'FEMME');

-- CreateEnum
CREATE TYPE "public"."GroupeSanguin" AS ENUM ('O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG');

-- CreateEnum
CREATE TYPE "public"."JourSemaine" AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE');

-- CreateEnum
CREATE TYPE "public"."StatutRendezVous" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ANNULE', 'COMPLETE', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."TypeConsultation" AS ENUM ('PRESENTIEL', 'TELECONSULTATION');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('RAPPEL_RDV', 'RDV_CONFIRME', 'RDV_ANNULE', 'PAIEMENT_RECU', 'SYSTEME');

-- CreateEnum
CREATE TYPE "public"."MethodePaiement" AS ENUM ('CASH', 'CMI', 'VIREMENT');

-- CreateEnum
CREATE TYPE "public"."StatutPaiement" AS ENUM ('EN_ATTENTE', 'PAYE', 'ECHOUE', 'REMBOURSE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "dateOfNaissance" TIMESTAMP(3) NOT NULL,
    "sexe" "public"."Sexe" NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "groupeSanguin" "public"."GroupeSanguin",
    "antecedents" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Doctor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inpe" TEXT NOT NULL,
    "specialite" TEXT NOT NULL,
    "diplomes" TEXT[],
    "languesParlees" TEXT[],
    "tarifConsultation" DECIMAL(10,2) NOT NULL,
    "accepteAssurance" BOOLEAN NOT NULL DEFAULT false,
    "assurancesAcceptees" TEXT[],
    "bio" TEXT,
    "experience" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cabinet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "phone" TEXT NOT NULL,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoctorCabinet" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorCabinet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Disponibilite" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "jourSemaine" "public"."JourSemaine" NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "dureeConsultation" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RendezVous" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "disponibiliteId" TEXT,
    "statut" "public"."StatutRendezVous" NOT NULL DEFAULT 'EN_ATTENTE',
    "motif" TEXT NOT NULL,
    "typeConsultation" "public"."TypeConsultation" NOT NULL,
    "notes" TEXT,
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Avis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "note" SMALLINT NOT NULL,
    "commentaire" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Paiement" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "methode" "public"."MethodePaiement" NOT NULL,
    "statut" "public"."StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "public"."Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cin_key" ON "public"."Patient"("cin");

-- CreateIndex
CREATE INDEX "Patient_ville_idx" ON "public"."Patient"("ville");

-- CreateIndex
CREATE INDEX "Patient_sexe_idx" ON "public"."Patient"("sexe");

-- CreateIndex
CREATE INDEX "Patient_createdAt_idx" ON "public"."Patient"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "public"."Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_inpe_key" ON "public"."Doctor"("inpe");

-- CreateIndex
CREATE INDEX "Doctor_specialite_idx" ON "public"."Doctor"("specialite");

-- CreateIndex
CREATE INDEX "Doctor_accepteAssurance_idx" ON "public"."Doctor"("accepteAssurance");

-- CreateIndex
CREATE INDEX "Doctor_experience_idx" ON "public"."Doctor"("experience");

-- CreateIndex
CREATE INDEX "Doctor_createdAt_idx" ON "public"."Doctor"("createdAt");

-- CreateIndex
CREATE INDEX "Cabinet_ville_quartier_idx" ON "public"."Cabinet"("ville", "quartier");

-- CreateIndex
CREATE INDEX "Cabinet_latitude_longitude_idx" ON "public"."Cabinet"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Cabinet_createdAt_idx" ON "public"."Cabinet"("createdAt");

-- CreateIndex
CREATE INDEX "DoctorCabinet_cabinetId_idx" ON "public"."DoctorCabinet"("cabinetId");

-- CreateIndex
CREATE INDEX "DoctorCabinet_doctorId_idx" ON "public"."DoctorCabinet"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorCabinet_doctorId_cabinetId_key" ON "public"."DoctorCabinet"("doctorId", "cabinetId");

-- CreateIndex
CREATE INDEX "Disponibilite_doctorId_jourSemaine_isActive_idx" ON "public"."Disponibilite"("doctorId", "jourSemaine", "isActive");

-- CreateIndex
CREATE INDEX "Disponibilite_cabinetId_jourSemaine_isActive_idx" ON "public"."Disponibilite"("cabinetId", "jourSemaine", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Disponibilite_doctorId_cabinetId_jourSemaine_heureDebut_heu_key" ON "public"."Disponibilite"("doctorId", "cabinetId", "jourSemaine", "heureDebut", "heureFin");

-- CreateIndex
CREATE INDEX "RendezVous_doctorId_dateHeure_idx" ON "public"."RendezVous"("doctorId", "dateHeure");

-- CreateIndex
CREATE INDEX "RendezVous_patientId_dateHeure_idx" ON "public"."RendezVous"("patientId", "dateHeure");

-- CreateIndex
CREATE INDEX "RendezVous_cabinetId_dateHeure_idx" ON "public"."RendezVous"("cabinetId", "dateHeure");

-- CreateIndex
CREATE INDEX "RendezVous_statut_idx" ON "public"."RendezVous"("statut");

-- CreateIndex
CREATE INDEX "RendezVous_typeConsultation_idx" ON "public"."RendezVous"("typeConsultation");

-- CreateIndex
CREATE INDEX "RendezVous_rappelEnvoye_idx" ON "public"."RendezVous"("rappelEnvoye");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_rendezVousId_key" ON "public"."Avis"("rendezVousId");

-- CreateIndex
CREATE INDEX "Avis_doctorId_createdAt_idx" ON "public"."Avis"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Avis_patientId_createdAt_idx" ON "public"."Avis"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Avis_note_idx" ON "public"."Avis"("note");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "public"."Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "public"."Notification"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_rendezVousId_key" ON "public"."Paiement"("rendezVousId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "public"."Paiement"("reference");

-- CreateIndex
CREATE INDEX "Paiement_doctorId_createdAt_idx" ON "public"."Paiement"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Paiement_statut_createdAt_idx" ON "public"."Paiement"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "Paiement_methode_createdAt_idx" ON "public"."Paiement"("methode", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorCabinet" ADD CONSTRAINT "DoctorCabinet_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoctorCabinet" ADD CONSTRAINT "DoctorCabinet_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "public"."Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Disponibilite" ADD CONSTRAINT "Disponibilite_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Disponibilite" ADD CONSTRAINT "Disponibilite_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "public"."Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "public"."Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_disponibiliteId_fkey" FOREIGN KEY ("disponibiliteId") REFERENCES "public"."Disponibilite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Avis" ADD CONSTRAINT "Avis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Avis" ADD CONSTRAINT "Avis_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Avis" ADD CONSTRAINT "Avis_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "public"."RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "public"."RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

