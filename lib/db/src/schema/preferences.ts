import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const preferences = pgTable("orbit_preferences", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertPreferencesSchema = createInsertSchema(preferences);
export type PreferencesRow = typeof preferences.$inferSelect;
