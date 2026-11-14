import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const memories = pgTable("orbit_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("orbit_memory_owner_idx").on(table.userId)]);
export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true });
export type MemoryRow = typeof memories.$inferSelect;
