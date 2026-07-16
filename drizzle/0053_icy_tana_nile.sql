ALTER TABLE "google_places" DROP CONSTRAINT "google_places_place_id_business_id_unique";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_system" boolean DEFAULT false;