// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profileTable } from "@/lib/data/defs/profile";
import { jobsTable } from "@/lib/data/defs/jobs";

export const applicationTable = pgTable("applications", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	profileId: uuid("profile_id").notNull().references(()=>profileTable.id),
	message: text("message").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at"),
	status: text("status").default("applied"),
	jobId: uuid("job_id").notNull().references(()=>jobsTable.id),
	withdrawnAt: timestamp("withdrawn_at"),
	withdrawlReason: text("withdrawl_reason")
}, (table)=>[unique().on(table.jobId, table.profileId)]);

export const selectedApplicationTable = pgTable("selected_applications", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	applicationId: uuid("application_id").notNull().references(()=>applicationTable.id),
	jobId: uuid("job_id").notNull().references(()=>jobsTable.id),
	applicantProfileId: uuid("applicant_profile_id").notNull().references(()=>profileTable.id),
	createdAt: timestamp("created_at").defaultNow()
}, (table)=>[unique().on(table.jobId, table.applicationId)]);
