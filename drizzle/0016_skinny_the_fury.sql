ALTER TABLE "profile" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "show_email" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "show_phone" boolean DEFAULT false;