// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profileTable } from "@/lib/data/defs/profile";

export const workTable = pgTable("work", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	profileId: uuid("profile_id").notNull().references(()=>profileTable.id),
	caption: text("caption").notNull(), // full name, profile?
	title: text("title").notNull(), // display name, profile?
	location: text("location"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
}, (table)=>[unique().on(table.id, table.profileId)]);

export const workImageTable = pgTable("work_image", {
	id: uuid("id").notNull().default(sql`gen_random_uuid()`),
	workId: uuid("work_id").notNull().references(()=>workTable.id),
	mime: text("mime").notNull(),
	createdAt: timestamp("created_at").defaultNow()
});
