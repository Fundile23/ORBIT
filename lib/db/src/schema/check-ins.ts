import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const checkIns = pgTable("orbit_check_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("orbit_checkin_owner_idx").on(table.userId)]);
export const insertCheckInSchema = createInsertSchema(checkIns).omit({ id: true, createdAt: true });
export type CheckInRow = typeof checkIns.$inferSelect;
