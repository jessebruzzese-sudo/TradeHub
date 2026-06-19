CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'applied',
	"job_id" uuid NOT NULL,
	CONSTRAINT "applications_job_id_profile_id_unique" UNIQUE("job_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "work" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;