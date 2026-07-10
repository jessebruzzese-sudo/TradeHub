UPDATE profile SET completed_jobs = 0;
ALTER TABLE "profile" ALTER COLUMN "completed_jobs" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "completed_jobs" SET NOT NULL;
