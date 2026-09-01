// vim: ts=2
'use server'
import { or, and, eq, ne, sql, isNull, inArray, asc, gte, gt, lt, lte } from "drizzle-orm";
import { getDB, getDataService, callDb } from "@/lib/data/service";
import { deleteJobAttachments } from "@/lib/images/service";
import { jobsTable, jobAttachmentsTable } from "@/lib/data/defs/jobs";
import { applicationTable, selectedApplicationTable } from "@/lib/data/defs/applications";
import { usersTable } from "@/lib/data/defs/users";
import { profileTable } from "@/lib/data/defs/profile";
import { businessTable } from "@/lib/data/defs/business";
import { writeFile, mkdir } from "node:fs/promises";
import { ENV } from "@/lib/env";
import { subDays } from "date-fns";

export const getJobAlertsForStatus = async (status:string) => {
	return (await getDB()).select().from().where(eq(jobsAlertsTable.status, status));
};

export const getPendingJobAlerts = async () => {
	return await getJobAlertsForStatus("pending");
};

export const getJobAlerts = async () => {
	return (await getDB()).select().from(jobAlertsTable);
};
