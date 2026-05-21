ALTER TABLE "users" ADD COLUMN "account_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public" boolean DEFAULT false;