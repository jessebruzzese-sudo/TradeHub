CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text,
	"abn" text,
	"abn_entity_name" text,
	"abn_entity_type" text,
	"abn_verified" text,
	"location" text,
	"postcode" text,
	"latitude" text,
	"longitude" text,
	"availability" text
);
--> statement-breakpoint
CREATE TABLE "business_trade" (
	"business_id" uuid NOT NULL,
	"trade_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "visible_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "business_id" uuid;--> statement-breakpoint
ALTER TABLE "business_trade" ADD CONSTRAINT "business_trade_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trade" ADD CONSTRAINT "business_trade_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;