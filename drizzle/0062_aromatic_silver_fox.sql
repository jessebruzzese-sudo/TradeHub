ALTER TABLE "job_alerts" ALTER COLUMN "job_id" SET DATA TYPE uuid USING job_id::uuid;
