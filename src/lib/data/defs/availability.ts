// vim: ts=2
import { 
	unique, pgTable, boolean, 
	text, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tradesTable } from "@/lib/data/defs/trades";
import { businessTable } from "@/lib/data/defs/business";

export const availabilityTable = pgTable("availability", {
	businessId: uuid("business_id").notNull().primaryKey().references(()=>businessTable.id),
	description: text("description"), // two apprentices available ...
	dates: text("dates").array() // list of dates when we're free
});
