// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profileTable } from "@/lib/data/defs/profile";
import { jobsTable } from "@/lib/data/defs/jobs";

export const conversationTable = pgTable("conversations", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	ownerProfileId: uuid("owner_profile_id").notNull().references(()=>profileTable.id),
	guestProfileId: uuid("guest_profile_id").notNull().references(()=>profileTable.id),
	isSystem: boolean("is_system").default(false),
	jobId: uuid("job_id").references(()=>jobsTable.id),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
}, (table)=>[unique().on(table.ownerProfileId, table.guestProfileId)]);

export const messagesTable = pgTable("messages", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	message: text("message"),
	createdAt: timestamp("created_at").defaultNow(),
	read: boolean("read").default(false), // recipient has read
	conversationId: uuid("conversation_id").notNull().references(()=>conversationTable.id),
	senderProfileId: uuid("sender_profile_id").notNull() // profile id of sender
}, (table)=>[unique().on(table.conversationId, table.id)]);
