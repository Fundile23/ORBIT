import { db, preferences } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetSettingsResponse } from "@workspace/api-zod";
import { seal, unseal } from "./crypto";

export const defaultSettings = {
  displayName: "",
  memoryEnabled: false,
  aiConsent: false,
  emergencyContact: "",
  emergencyProtocol: "",
};
export async function readSettings(userId: string) {
  const [row] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  return row ? GetSettingsResponse.parse(JSON.parse(unseal(row.payload, userId))) : { ...defaultSettings };
}
export async function saveSettings(userId: string, patch: Partial<typeof defaultSettings>) {
  const merged = { ...await readSettings(userId), ...patch };
  const payload = seal(JSON.stringify(merged), userId);
  await db.insert(preferences).values({ userId, payload }).onConflictDoUpdate({
    target: preferences.userId, set: { payload, updatedAt: new Date() },
  });
  return merged;
}
