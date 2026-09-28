ALTER TABLE "google_sessions" ADD COLUMN "expiry" bigint;--> statement-breakpoint
ALTER TABLE "google_sessions" ADD COLUMN "sub" text;--> statement-breakpoint
ALTER TABLE "google_sessions" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "google_sessions" ADD COLUMN "token_type" text;--> statement-breakpoint
ALTER TABLE "google_sessions" DROP COLUMN "access_token";