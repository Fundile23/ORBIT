import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db, conversations, messages, memories } from "@workspace/db";
import {
  CreateConversationBody, CreateConversationResponse, ListConversationsResponse,
  GetConversationParams, GetConversationResponse, UpdateConversationBody, UpdateConversationResponse,
  DeleteConversationParams, SendMessageParams, SendMessageBody,
  SummarizeConversationParams, SummarizeConversationResponse,
} from "@workspace/api-zod";
import { owner } from "../../middlewares/identity";
import { seal } from "../../modules/privacy/crypto";
import { readSettings } from "../../modules/privacy/preferences";
import { conversationView, messageView, memoryView } from "../../modules/conversations/serializers";
import { aiProvider } from "../../modules/ai/provider";
import { buildOrbitConversation } from "../../modules/ai/conversation";
import { immediateSupport } from "../../modules/safety/immediate-support";

const router: IRouter = Router();
const aiLimit = rateLimit({
  windowMs: 60000, limit: 12, keyGenerator: (req) => owner(req),
  standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Please wait a moment before sending more AI requests." },
});
const scope = (id: string, userId: string) => and(eq(conversations.id, id), eq(conversations.userId, userId));

router.get("/conversations", async (req, res): Promise<void> => {
  const rows = await db.select().from(conversations).where(eq(conversations.userId, owner(req))).orderBy(desc(conversations.updatedAt));
  res.json(ListConversationsResponse.parse(rows.map(conversationView)));
});
router.post("/conversations", async (req, res): Promise<void> => {
  const input = CreateConversationBody.parse(req.body);
  if (!input.title.trim()) { res.status(400).json({ error: "A title is required." }); return; }
  const userId = owner(req);
  const [row] = await db.insert(conversations).values({ userId, title: seal(input.title.trim(), userId) }).returning();
  res.status(201).json(CreateConversationResponse.parse(conversationView(row!)));
});
router.get("/conversations/:id", async (req, res): Promise<void> => {
  const { id } = GetConversationParams.parse(req.params);
  const userId = owner(req);
  const [row] = await db.select().from(conversations).where(scope(id, userId));
  if (!row) { res.status(404).json({ error: "Conversation not found." }); return; }
  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt), asc(messages.id));
  res.json(GetConversationResponse.parse({ ...conversationView(row), messages: history.map((m) => messageView(m, userId)) }));
});
router.patch("/conversations/:id", async (req, res): Promise<void> => {
  const { id } = GetConversationParams.parse(req.params);
  const { title } = UpdateConversationBody.parse(req.body);
  if (!title.trim()) { res.status(400).json({ error: "A title is required." }); return; }
  const userId = owner(req);
  const [row] = await db.update(conversations).set({ title: seal(title.trim(), userId), updatedAt: new Date() }).where(scope(id, userId)).returning();
  if (!row) { res.status(404).json({ error: "Conversation not found." }); return; }
  res.json(UpdateConversationResponse.parse(conversationView(row)));
});
router.delete("/conversations/:id", async (req, res): Promise<void> => {
  const { id } = DeleteConversationParams.parse(req.params);
  const rows = await db.delete(conversations).where(scope(id, owner(req))).returning({ id: conversations.id });
  if (!rows.length) { res.status(404).json({ error: "Conversation not found." }); return; }
  res.sendStatus(204);
});
router.post("/conversations/:id/summary", aiLimit, async (req, res): Promise<void> => {
  const { id } = SummarizeConversationParams.parse(req.params);
  const userId = owner(req);
  const settings = await readSettings(userId);
  if (!settings.aiConsent) { res.status(403).json({ error: "Consent to AI processing is required." }); return; }
  const [row] = await db.select().from(conversations).where(scope(id, userId));
  if (!row) { res.status(404).json({ error: "Conversation not found." }); return; }
  if (row.generatingUntil && row.generatingUntil > new Date()) { res.status(409).json({ error: "Wait for your current reply before summarizing." }); return; }
  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  if (!history.length) { res.status(400).json({ error: "Start a conversation before creating a summary." }); return; }
  const turns = history.map((m) => ({ role: m.role, content: messageView(m, userId).content }));
  if (turns.reduce((size, turn) => size + turn.content.length, 0) > 150000) {
    res.status(400).json({ error: "This conversation is too long to summarize in one request. Your messages remain available in history and export." }); return;
  }
  try {
    const summary = await aiProvider.summarize(turns);
    const [updated] = await db.update(conversations).set({ summary: seal(summary, userId) })
      .where(and(scope(id, userId), eq(conversations.updatedAt, row.updatedAt))).returning();
    if (!updated) { res.status(409).json({ error: "Conversation changed. Please request a new summary." }); return; }
    res.json(SummarizeConversationResponse.parse(conversationView(updated)));
  } catch {
    res.status(503).json({ error: "The AI summary is unavailable. Please try again." });
  }
});

router.post("/conversations/:id/messages", aiLimit, async (req, res): Promise<void> => {
  const { id } = SendMessageParams.parse(req.params);
  const input = SendMessageBody.parse(req.body);
  if (!input.content.trim()) { res.status(400).json({ error: "Write a message first." }); return; }
  const userId = owner(req);
  const settings = await readSettings(userId);
  if (!settings.aiConsent) { res.status(403).json({ error: "Please consent to hosted AI processing before sending." }); return; }
  const [existingConversation] = await db.select().from(conversations).where(scope(id, userId));
  if (!existingConversation) { res.status(404).json({ error: "Conversation not found." }); return; }
  const generationId = randomUUID();
  const [lease] = await db.update(conversations)
    .set({ generationId, generatingUntil: new Date(Date.now() + 150000) })
    .where(and(scope(id, userId), or(isNull(conversations.generatingUntil), lt(conversations.generatingUntil, new Date())))).returning();
  if (!lease) { res.status(409).json({ error: "ORBIT is already replying. Please wait." }); return; }

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 120000);
  const disconnected = () => { if (!res.writableEnded) abort.abort(); };
  res.on("close", disconnected);
  const emit = (event: unknown) => { if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`); };
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    const [prior] = await db.select().from(messages).where(and(eq(messages.conversationId, id), eq(messages.clientMessageId, input.clientMessageId)));
    if (prior && messageView(prior, userId).content !== input.content.trim()) {
      res.status(409).json({ error: "Retry ID belongs to a different message." }); return;
    }
    const [previousReply] = await db.select().from(messages).where(and(eq(messages.conversationId, id), eq(messages.replyTo, input.clientMessageId)));
    if (previousReply) {
      res.setHeader("Content-Type", "text/event-stream");
      const view = messageView(previousReply, userId);
      emit({ content: view.content }); emit({ done: true, message: view }); res.end(); return;
    }
    // Reject retrying an older unanswered turn once newer turns exist.
    if (prior) {
      const [latest] = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(desc(messages.createdAt)).limit(1);
      if (latest?.id !== prior.id) { res.status(409).json({ error: "This older turn cannot be retried after newer messages." }); return; }
    }
    if (!prior) {
      await db.insert(messages).values({ conversationId: id, role: "user", content: seal(input.content.trim(), userId), clientMessageId: input.clientMessageId });
      await db.update(conversations).set({ updatedAt: new Date(), summary: null }).where(scope(id, userId));
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    heartbeat = setInterval(() => { if (!res.destroyed) res.write(": heartbeat\n\n"); }, 15000);
    const safetyReply = immediateSupport(input.content, settings.emergencyContact, settings.emergencyProtocol);
    let full = "";
    if (safetyReply) { full = safetyReply; emit({ content: full }); }
    else {
      const recent = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(desc(messages.createdAt)).limit(40);
      const savedMemories = settings.memoryEnabled
        ? await db.select().from(memories).where(eq(memories.userId, userId)).orderBy(desc(memories.createdAt)).limit(30)
        : [];
      const turns = buildOrbitConversation(
        recent.reverse().map((m) => ({ role: m.role, content: messageView(m, userId).content })),
        {
          ...settings,
          savedMemories: savedMemories.map(memoryView).map((m) => m.content),
        },
      );
      for await (const delta of aiProvider.reply(turns, abort.signal)) { full += delta; emit({ content: delta }); }
    }
    if (!full.trim()) throw new Error("Empty reply");
    // Persist only complete replies. A retry can recover a completed reply after disconnect.
    const [assistant] = await db.insert(messages).values({
      conversationId: id, role: "assistant", content: seal(full, userId), replyTo: input.clientMessageId,
    }).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(scope(id, userId));
    emit({ done: true, message: messageView(assistant!, userId) });
    res.end();
  } catch {
    // Never log messages, model payloads or upstream error objects.
    req.log.warn("AI reply could not complete");
    if (res.headersSent) { emit({ error: "ORBIT could not finish this reply. Your message was saved; retry when ready." }); res.end(); }
    else res.status(503).json({ error: "ORBIT is unavailable. Please try again." });
  } finally {
    clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);
    res.off("close", disconnected);
    await db.update(conversations).set({ generationId: null, generatingUntil: null })
      .where(and(scope(id, userId), eq(conversations.generationId, generationId)));
  }
});
export default router;
