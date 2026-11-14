import type { ConversationRow, MessageRow, CheckInRow, JournalRow, MemoryRow } from "@workspace/db";
import { unseal } from "../privacy/crypto";
import { CreateCheckInBody, CreateJournalEntryBody } from "@workspace/api-zod";

export function conversationView(row: ConversationRow) {
  return {
    id: row.id, title: unseal(row.title, row.userId),
    summary: row.summary === null ? null : unseal(row.summary, row.userId),
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
export function messageView(row: MessageRow, userId: string) {
  return { id: row.id, role: row.role, content: unseal(row.content, userId), clientMessageId: row.clientMessageId, createdAt: row.createdAt };
}
export function checkInView(row: CheckInRow) {
  return { ...CreateCheckInBody.parse(JSON.parse(unseal(row.payload, row.userId))), id: row.id, createdAt: row.createdAt };
}
export function journalView(row: JournalRow) {
  return { ...CreateJournalEntryBody.parse(JSON.parse(unseal(row.payload, row.userId))), id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
export function memoryView(row: MemoryRow) {
  return { id: row.id, content: unseal(row.content, row.userId), createdAt: row.createdAt };
}
