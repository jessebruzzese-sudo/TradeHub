ALTER TABLE "profile_like" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "profile_view" ADD COLUMN "created_at" timestamp DEFAULT now();