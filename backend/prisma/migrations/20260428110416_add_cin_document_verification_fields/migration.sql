DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Doctor' AND column_name = 'cinDocumentVerifiedAt'
  ) THEN
    ALTER TABLE "public"."Doctor" ALTER COLUMN "cinDocumentVerifiedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Doctor' AND column_name = 'cinDocumentRejectedAt'
  ) THEN
    ALTER TABLE "public"."Doctor" ALTER COLUMN "cinDocumentRejectedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Patient' AND column_name = 'cinDocumentVerifiedAt'
  ) THEN
    ALTER TABLE "public"."Patient" ALTER COLUMN "cinDocumentVerifiedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Patient' AND column_name = 'cinDocumentRejectedAt'
  ) THEN
    ALTER TABLE "public"."Patient" ALTER COLUMN "cinDocumentRejectedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;
END $$;
