CREATE TABLE "job_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text,
	"job_id" uuid,
	"recipients" text[]
);
--> statement-breakpoint
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
