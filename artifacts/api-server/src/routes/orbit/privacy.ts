import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, conversations, messages, checkIns, journal, memories, preferences } from "@workspace/db";
import {
  GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse, ListMemoriesResponse,
  CreateMemoryBody, CreateMemoryResponse, DeleteMemoryParams, ExportDataResponse,
} from "@workspace/api-zod";
import { owner } from "../../middlewares/identity";
import { readSettings, saveSettings } from "../../modules/privacy/preferences";
import { seal } from "../../modules/privacy/crypto";
import { checkInView, journalView, memoryView, conversationView, messageView } from "../../modules/conversations/serializers";

const router: IRouter = Router();
router.get("/settings", async (req, res): Promise<void> => {
  res.json(GetSettingsResponse.parse(await readSettings(owner(req))));
});
router.patch("/settings", async (req, res): Promise<void> => {
  const input = UpdateSettingsBody.parse(req.body);
  res.json(UpdateSettingsResponse.parse(await saveSettings(owner(req), input)));
});
router.get("/memories", async (req, res): Promise<void> => {
  const rows = await db.select().from(memories).where(eq(memories.userId, owner(req))).orderBy(desc(memories.createdAt));
  res.json(ListMemoriesResponse.parse(rows.map(memoryView)));
});
router.post("/memories", async (req, res): Promise<void> => {
  const input = CreateMemoryBody.parse(req.body);
  if (!input.content.trim()) { res.status(400).json({ error: "A memory cannot be blank." }); return; }
  const userId = owner(req);
  if (!(await readSettings(userId)).memoryEnabled) {
    res.status(403).json({ error: "Enable memory consent before saving a memory." }); return;
  }
  const [row] = await db.insert(memories).values({ userId, content: seal(input.content.trim(), userId) }).returning();
  res.status(201).json(CreateMemoryResponse.parse(memoryView(row!)));
});
router.delete("/memories/:id", async (req, res): Promise<void> => {
  const { id } = DeleteMemoryParams.parse(req.params);
  const rows = await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, owner(req)))).returning({ id: memories.id });
  if (!rows.length) { res.status(404).json({ error: "Memory not found." }); return; }
  res.sendStatus(204);
});
router.get("/data/export", async (req, res): Promise<void> => {
  const userId = owner(req);
  const result = await db.transaction(async (tx) => {
    const [conversationRows, checkInRows, journalRows, memoryRows] = await Promise.all([
      tx.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt)),
      tx.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(asc(checkIns.createdAt)),
      tx.select().from(journal).where(eq(journal.userId, userId)),
      tx.select().from(memories).where(eq(memories.userId, userId)),
    ]);
    const threads = [];
    for (const row of conversationRows) {
      const history = await tx.select().from(messages).where(eq(messages.conversationId, row.id)).orderBy(asc(messages.createdAt));
      threads.push({ ...conversationView(row), messages: history.map((m) => messageView(m, userId)) });
    }
    return {
      exportedAt: new Date().toISOString(), settings: await readSettings(userId),
      conversations: threads, checkIns: checkInRows.map(checkInView),
      journal: journalRows.map(journalView), memories: memoryRows.map(memoryView),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  res.setHeader("Content-Disposition", 'attachment; filename="orbit-personal-data.json"');
  res.json(ExportDataResponse.parse(result));
});
router.delete("/data", async (req, res): Promise<void> => {
  const userId = owner(req);
  await db.transaction(async (tx) => {
    await tx.delete(conversations).where(eq(conversations.userId, userId));
    await tx.delete(checkIns).where(eq(checkIns.userId, userId));
    await tx.delete(journal).where(eq(journal.userId, userId));
    await tx.delete(memories).where(eq(memories.userId, userId));
    await tx.delete(preferences).where(eq(preferences.userId, userId));
  });
  res.sendStatus(204);
});
export default router;
