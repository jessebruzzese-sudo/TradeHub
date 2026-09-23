CREATE TABLE "google_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"access_type" text,
	"refresh_token" text,
	"access_token" text,
	CONSTRAINT "google_sessions_state_unique" UNIQUE("state")
);
