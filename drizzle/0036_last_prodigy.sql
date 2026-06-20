CREATE TABLE "selected_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"applicant_profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "selected_applications_job_id_application_id_unique" UNIQUE("job_id","application_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "selected_applications" ADD CONSTRAINT "selected_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_applications" ADD CONSTRAINT "selected_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_applications" ADD CONSTRAINT "selected_applications_applicant_profile_id_profile_id_fk" FOREIGN KEY ("applicant_profile_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "completed_jobs";