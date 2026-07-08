// vim: ts=2
import { 
	unique, pgTable, boolean, 
	text, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tradesTable } from "@/lib/data/defs/trades";

export const businessTable = pgTable("business", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	businessName: text("business_name"),
	abn: text("abn"),
	abnEntityName: text("abn_entity_name"),
	abnEntityType: text("abn_entity_type"),
	abnGstActiveDate: date("abn_gst_active_date"),
	abnVerified: boolean("abn_verified").default(false),
	location: text("location"), // address, move locations details to own table?
	postcode: text("postcode"),
	locationLat: text("latitude"),
	locationLng: text("longitude"),
	price: real("price"),
	showPricing: boolean("show_pricing").default(false),
	priceType: text("price_type")
});

export const googlePlacesTable = pgTable("google_places", {
	placeId: text("place_id"),
	businessId: uuid("business_id").notNull().references(()=>businessTable.id),
	mapsUrl: text("maps_url"),
	businessName: text("business_name"),
	businessAddress: text("business_address"),
	rating: real("rating"),
	reviewCount: real("review_count"),
	claimed: boolean("claimed")
});

export const businessTradeTable = pgTable("business_trade", {
	businessId: uuid("business_id").notNull().references(()=>businessTable.id),
	tradeId: uuid("trade_id").notNull().references(()=>tradesTable.id),
	isPrimary: boolean("is_primary").default(false)
}, (table)=>[unique().on(table.businessId, table.tradeId)]);
