CREATE TABLE "orbit_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"generation_id" uuid,
	"generating_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"client_message_id" uuid,
	"reply_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orbit_messages" ADD CONSTRAINT "orbit_messages_conversation_id_orbit_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."orbit_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orbit_conversation_owner_idx" ON "orbit_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orbit_message_conversation_idx" ON "orbit_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orbit_message_dedup_idx" ON "orbit_messages" USING btree ("conversation_id","client_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orbit_reply_dedup_idx" ON "orbit_messages" USING btree ("conversation_id","reply_to");--> statement-breakpoint
CREATE INDEX "orbit_checkin_owner_idx" ON "orbit_check_ins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orbit_journal_owner_idx" ON "orbit_journal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orbit_memory_owner_idx" ON "orbit_memories" USING btree ("user_id");