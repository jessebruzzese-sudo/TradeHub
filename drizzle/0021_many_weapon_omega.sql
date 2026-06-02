CREATE TABLE "google_places" (
	"place_id" text NOT NULL,
	"business_id" uuid NOT NULL,
	"maps_url" text,
	"business_name" text,
	"business_address" text,
	"rating" real,
	"review_count" real,
	"claimed" boolean
);
