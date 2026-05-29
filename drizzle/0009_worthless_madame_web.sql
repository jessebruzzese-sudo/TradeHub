ALTER TABLE "users" RENAME COLUMN "last_login" TO "last_active_at";--> statement-breakpoint
ALTER TABLE "business" ALTER COLUMN "show_pricing" SET DEFAULT false;