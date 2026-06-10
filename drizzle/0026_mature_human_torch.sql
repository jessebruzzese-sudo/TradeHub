CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text,
	"description" text,
	"trade_category" text,
	"location" text,
	"postcode" text,
	"dates" text[],
	"duration_days" integer,
	"pay_type" text,
	"rate" real,
	"status" text DEFAULT 'open' NOT NULL,
	"start_date" timestamp,
	"start_time" text,
	"cancelled_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	"starts_at" timestamp,
	"approved_at" timestamp,
	"approved_by" uuid,
	"approval_status" text DEFAULT 'approved',
	"approval_notes" text
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
