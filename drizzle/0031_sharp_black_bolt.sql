ALTER TABLE "users" ADD COLUMN "activated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activated_at" timestamp;