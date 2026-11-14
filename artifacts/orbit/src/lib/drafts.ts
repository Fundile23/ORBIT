const PREFIX = 'orbit:draft:';

function key(userId: string, scope: string) {
  return `${PREFIX}${userId}:${scope}`;
}

export function loadDraft(userId: string | null, scope: string): string {
  if (!userId) return '';
  try {
    return sessionStorage.getItem(key(userId, scope)) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(userId: string | null, scope: string, text: string) {
  if (!userId) return;
  try {
    if (text.trim()) sessionStorage.setItem(key(userId, scope), text);
    else sessionStorage.removeItem(key(userId, scope));
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft(userId: string | null, scope: string) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(key(userId, scope));
  } catch {
    /* ignore */
  }
}

/** Wipe every ORBIT draft in this tab, used when the signed-in identity changes. */
export function clearAllDrafts() {
  pendingFirstMessage.clear();
  try {
    const doomed: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** First message handed from the home composer to a freshly created conversation (memory only). */
export const pendingFirstMessage = new Map<string, string>();

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
