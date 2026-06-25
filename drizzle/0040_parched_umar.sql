CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now(),
	"read" boolean DEFAULT false,
	"conversation_id" uuid NOT NULL,
	CONSTRAINT "messages_conversation_id_id_unique" UNIQUE("conversation_id","id")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;