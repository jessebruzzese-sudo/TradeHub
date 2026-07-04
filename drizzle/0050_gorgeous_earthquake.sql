ALTER TABLE "jobs" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "was_confirmed" boolean;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;