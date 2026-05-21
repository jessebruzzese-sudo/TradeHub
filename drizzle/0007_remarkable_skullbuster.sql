CREATE TABLE "availability" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"description" text,
	"dates" text[]
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" DROP COLUMN "availability";
