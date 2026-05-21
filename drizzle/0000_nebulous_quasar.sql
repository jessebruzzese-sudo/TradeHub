CREATE TABLE "users" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"name" text,
	"role" text,
	"password" text,
	"trust_status" text,
	"avatar" text,
	"bio" text,
	"rating" real,
	"reliability_rating" real,
	"completed_jobs" integer,
	"member_since" timestamp DEFAULT now()
);
