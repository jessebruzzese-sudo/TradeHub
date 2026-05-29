CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bio" text,
	"mini_bio" text,
	"show_abn" boolean DEFAULT false,
	"show_business_name" boolean DEFAULT false,
	"premium" boolean DEFAULT false,
	"trust_status" text,
	"avatar" text,
	"rating" real,
	"reliability_rating" real,
	"completed_jobs" integer
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "trust_status";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reliability_rating";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "completed_jobs";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "member_since";