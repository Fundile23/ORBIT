import type { Message } from '@workspace/api-client-react';

export type StreamFailure = 'network' | 'http' | 'server' | 'interrupted';

export class StreamError extends Error {
  kind: StreamFailure;
  status?: number;
  constructor(message: string, kind: StreamFailure, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

type Parsed = { content?: unknown; done?: unknown; message?: Message; error?: unknown };

/**
 * POSTs a message and reads the SSE reply. Handles events split across
 * arbitrary chunk boundaries. Resolves with the final assistant message.
 */
export async function streamMessage(
  conversationId: string,
  body: { content: string; clientMessageId: string },
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<Message> {
  let res: Response;
  try {
    res = await fetch(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new StreamError('Could not reach ORBIT. Check your connection.', 'network');
  }

  if (!res.ok) {
    let msg = '';
    try {
      const j = await res.json();
      msg = typeof j?.error === 'string' ? j.error : '';
    } catch {
      /* not json */
    }
    throw new StreamError(msg || `The server responded with ${res.status}.`, 'http', res.status);
  }
  if (!res.body) throw new StreamError('The reply stream was empty.', 'interrupted');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (raw: string): Message | null => {
    const data = raw
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) return null;
    let parsed: Parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
    if (typeof parsed.error === 'string') throw new StreamError(parsed.error, 'server');
    if (parsed.done && parsed.message) return parsed.message;
    if (typeof parsed.content === 'string') onDelta(parsed.content);
    return null;
  };

  const drain = (): Message | null => {
    buffer = buffer.replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const evt = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const done = handleEvent(evt);
      if (done) return done;
    }
    return null;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const finished = drain();
      if (finished) {
        reader.cancel().catch(() => undefined);
        return finished;
      }
    }
  } catch (err) {
    if (err instanceof StreamError || (err as Error)?.name === 'AbortError') throw err;
    throw new StreamError('The connection dropped mid-reply.', 'interrupted');
  }
  buffer += decoder.decode();
  const tail = drain() ?? (buffer.trim() ? handleEvent(buffer) : null);
  if (tail) return tail;
  throw new StreamError('The reply ended before it finished.', 'interrupted');
}
