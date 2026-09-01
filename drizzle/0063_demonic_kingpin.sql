ALTER TABLE "job_alerts" DROP CONSTRAINT "job_alerts_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mobile_code" text;