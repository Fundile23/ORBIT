import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const journal = pgTable("orbit_journal", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("orbit_journal_owner_idx").on(table.userId)]);
export const insertJournalSchema = createInsertSchema(journal).omit({ id: true, createdAt: true, updatedAt: true });
export type JournalRow = typeof journal.$inferSelect;
