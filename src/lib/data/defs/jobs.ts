// vim: ts=2
import { 
	unique, pgTable, boolean, 
	text, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "@/lib/data/defs/users";
import { profileTable } from "@/lib/data/defs/profile";

export const jobsTable = pgTable("jobs", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	profileId: uuid("profile_id").notNull().references(()=>profileTable.id),
	title:	text("title"),
	description: text("description"),
	tradeCategory: text("trade_category"),
	location: text("location"),
	postcode: text("postcode"),
	placeId: text("place_id"),
	latitude: real("latitude"),
	longitude: real("longitude"),
	dates: text("dates").array(),
	durationDays: integer("duration_days"),
	payType: text("pay_type"),
	rate: real("rate"),
	status: text("status").notNull().default("open"),
	startDate: timestamp("start_date"),
	startTime: text("start_time"),
	cancelledAt: timestamp("cancelled_at"),	
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at"),
	deletedAt: timestamp("deleted_at"),
	startsAt: timestamp("starts_at"),	
	approvedAt: timestamp("approved_at"),
	approvedBy: uuid("approved_by").references(()=>usersTable.id),
	approvalStatus: text("approval_status").default("approved"),
	approvalNotes: text("approval_notes")
});

export const jobAttachmentsTable = pgTable("job_attachments", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	jobId: uuid("job_id").notNull().references(()=>jobsTable.id),
	fileName: text("file_name").notNull(),
	mime: text("mime")
});
