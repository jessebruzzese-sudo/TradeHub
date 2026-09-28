ALTER TABLE "google_sessions" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "google_sessions" ADD CONSTRAINT "google_sessions_email_unique" UNIQUE("email");