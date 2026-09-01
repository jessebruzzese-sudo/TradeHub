// vim: ts=2
import { 
	pgTable, boolean, text, 
	unique, uuid, date, timestamp, 
	integer, real, bigint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jobsTable } from "@/lib/data/defs/jobs";

export const jobAlertsTable = pgTable("job_alerts", {
	id: uuid("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
	status: text("status"),
	jobId: uuid("job_id"), // dont need foreign key for alerts, they aren't critical
	recipients: text("recipients").array() // user profiles that have received the alerts
});
