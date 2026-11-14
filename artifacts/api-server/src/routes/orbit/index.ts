import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, checkIns, conversations, journal } from "@workspace/db";
import { GetOverviewResponse, ListExercisesResponse } from "@workspace/api-zod";
import { owner, requireIdentity, sameOriginWrite } from "../../middlewares/identity";
import { exerciseLibrary } from "../../modules/exercises/library";
import { readSettings } from "../../modules/privacy/preferences";
import { checkInView } from "../../modules/conversations/serializers";
import { aiProvider } from "../../modules/ai/provider";
import conversationsRouter from "./conversations";
import wellbeingRouter from "./wellbeing";
import privacyRouter from "./privacy";

const router: IRouter = Router();
router.get("/exercises", (_req, res): void => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(ListExercisesResponse.parse(exerciseLibrary));
});
router.use(requireIdentity, sameOriginWrite);
router.get("/overview", async (req, res): Promise<void> => {
  const userId = owner(req);
  const [threadCounts, journalCounts, recentRows, allCounts, settings] = await Promise.all([
    db.select({ value: count() }).from(conversations).where(eq(conversations.userId, userId)),
    db.select({ value: count() }).from(journal).where(eq(journal.userId, userId)),
    db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(30),
    db.select({ value: count() }).from(checkIns).where(eq(checkIns.userId, userId)),
    readSettings(userId),
  ]);
  const recent = recentRows.map(checkInView);
  const average = (field: "mood" | "stress") => recent.length
    ? Math.round(recent.reduce((sum, row) => sum + row[field], 0) / recent.length * 10) / 10 : null;
  res.json(GetOverviewResponse.parse({
    conversationCount: threadCounts[0]?.value ?? 0, journalCount: journalCounts[0]?.value ?? 0,
    checkInCount: allCounts[0]?.value ?? 0, averageMood: average("mood"), averageStress: average("stress"),
    latestCheckIn: recent[0] ?? null, aiAvailable: aiProvider.available(),
    communication: aiProvider.available() ? "online" : "unavailable",
    emergencyContact: settings.emergencyContact, emergencyProtocol: settings.emergencyProtocol,
  }));
});
router.use(conversationsRouter);
router.use(wellbeingRouter);
router.use(privacyRouter);
export default router;
