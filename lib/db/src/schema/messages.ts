import { pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { conversations } from "./conversations";

export const messages = pgTable("orbit_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  clientMessageId: uuid("client_message_id"),
  replyTo: uuid("reply_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("orbit_message_conversation_idx").on(table.conversationId),
  uniqueIndex("orbit_message_dedup_idx").on(table.conversationId, table.clientMessageId),
  uniqueIndex("orbit_reply_dedup_idx").on(table.conversationId, table.replyTo),
]);
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type MessageRow = typeof messages.$inferSelect;
