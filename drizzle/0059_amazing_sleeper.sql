CREATE TABLE "logs" (
	"user_id" uuid,
	"method" text,
	"path" text,
	"authenticated" boolean,
	"status" integer,
	"user_agent" text,
	"referer" text,
	"forwarded_for" text,
	"time" bigint,
	"date" text
) PARTITION BY LIST(date);
