import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, checkIns, journal } from "@workspace/db";
import {
  ListCheckInsResponse, CreateCheckInBody, CreateCheckInResponse,
  UpdateCheckInParams, UpdateCheckInBody, UpdateCheckInResponse, DeleteCheckInParams,
  ListJournalEntriesResponse, CreateJournalEntryBody, CreateJournalEntryResponse,
  UpdateJournalEntryParams, UpdateJournalEntryBody, UpdateJournalEntryResponse, DeleteJournalEntryParams,
} from "@workspace/api-zod";
import { owner } from "../../middlewares/identity";
import { seal } from "../../modules/privacy/crypto";
import { checkInView, journalView } from "../../modules/conversations/serializers";

const router: IRouter = Router();
router.get("/check-ins", async (req, res): Promise<void> => {
  const rows = await db.select().from(checkIns).where(eq(checkIns.userId, owner(req))).orderBy(asc(checkIns.createdAt));
  res.json(ListCheckInsResponse.parse(rows.map(checkInView)));
});
router.post("/check-ins", async (req, res): Promise<void> => {
  const input = CreateCheckInBody.parse(req.body);
  const userId = owner(req);
  const [row] = await db.insert(checkIns).values({ userId, payload: seal(JSON.stringify(input), userId) }).returning();
  res.status(201).json(CreateCheckInResponse.parse(checkInView(row!)));
});
router.patch("/check-ins/:id", async (req, res): Promise<void> => {
  const { id } = UpdateCheckInParams.parse(req.params);
  const input = UpdateCheckInBody.parse(req.body);
  const userId = owner(req);
  const [row] = await db.update(checkIns).set({ payload: seal(JSON.stringify(input), userId) })
    .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId))).returning();
  if (!row) { res.status(404).json({ error: "Check-in not found." }); return; }
  res.json(UpdateCheckInResponse.parse(checkInView(row)));
});
router.delete("/check-ins/:id", async (req, res): Promise<void> => {
  const { id } = DeleteCheckInParams.parse(req.params);
  const rows = await db.delete(checkIns).where(and(eq(checkIns.id, id), eq(checkIns.userId, owner(req)))).returning({ id: checkIns.id });
  if (!rows.length) { res.status(404).json({ error: "Check-in not found." }); return; }
  res.sendStatus(204);
});
router.get("/journal", async (req, res): Promise<void> => {
  const rows = await db.select().from(journal).where(eq(journal.userId, owner(req))).orderBy(desc(journal.updatedAt));
  res.json(ListJournalEntriesResponse.parse(rows.map(journalView)));
});
router.post("/journal", async (req, res): Promise<void> => {
  const input = CreateJournalEntryBody.parse(req.body);
  if (!input.title.trim()) { res.status(400).json({ error: "A title is required." }); return; }
  const userId = owner(req);
  const [row] = await db.insert(journal).values({ userId, payload: seal(JSON.stringify(input), userId) }).returning();
  res.status(201).json(CreateJournalEntryResponse.parse(journalView(row!)));
});
router.patch("/journal/:id", async (req, res): Promise<void> => {
  const { id } = UpdateJournalEntryParams.parse(req.params);
  const input = UpdateJournalEntryBody.parse(req.body);
  if (!input.title.trim()) { res.status(400).json({ error: "A title is required." }); return; }
  const userId = owner(req);
  const [row] = await db.update(journal).set({ payload: seal(JSON.stringify(input), userId), updatedAt: new Date() })
    .where(and(eq(journal.id, id), eq(journal.userId, userId))).returning();
  if (!row) { res.status(404).json({ error: "Journal entry not found." }); return; }
  res.json(UpdateJournalEntryResponse.parse(journalView(row)));
});
router.delete("/journal/:id", async (req, res): Promise<void> => {
  const { id } = DeleteJournalEntryParams.parse(req.params);
  const rows = await db.delete(journal).where(and(eq(journal.id, id), eq(journal.userId, owner(req)))).returning({ id: journal.id });
  if (!rows.length) { res.status(404).json({ error: "Journal entry not found." }); return; }
  res.sendStatus(204);
});
export default router;
