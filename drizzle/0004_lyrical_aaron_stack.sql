CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "trades_name_unique" UNIQUE("name"),
	CONSTRAINT "trades_slug_unique" UNIQUE("slug")
);
