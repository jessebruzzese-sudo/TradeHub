ALTER TABLE "business_trade" ADD CONSTRAINT "business_trade_business_id_trade_id_unique" UNIQUE("business_id","trade_id");--> statement-breakpoint
ALTER TABLE "google_places" ADD CONSTRAINT "google_places_place_id_business_id_unique" UNIQUE("place_id","business_id");--> statement-breakpoint
ALTER TABLE "profile_like" ADD CONSTRAINT "profile_like_user_id_profile_id_unique" UNIQUE("user_id","profile_id");--> statement-breakpoint
ALTER TABLE "work" ADD CONSTRAINT "work_id_profile_id_unique" UNIQUE("id","profile_id");