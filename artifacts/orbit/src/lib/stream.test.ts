import assert from 'node:assert/strict';
import test from 'node:test';
import { streamMessage } from './stream';

test('emoji input and streamed replies survive split UTF-8 and SSE boundaries', async () => {
  const originalFetch = globalThis.fetch;
  const reply = {
    id: 'synthetic-assistant', role: 'assistant', content: 'A stellar win 🥳🚀',
    createdAt: '2026-11-14T14:00:00.000Z', clientMessageId: null,
  };
  let received = '';
  globalThis.fetch = async (_input, init) => {
    received = JSON.parse(String(init?.body)).content;
    const bytes = new TextEncoder().encode(
      `data: ${JSON.stringify({ content: 'A stellar win 🥳🚀' })}\r\n\r\n` +
      `data: ${JSON.stringify({ done: true, message: reply })}\n\n`,
    );
    return new Response(new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1));
        controller.close();
      },
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    let streamed = '';
    const result = await streamMessage('synthetic-conversation', {
      content: 'Nailed it! 👩🏽‍🚀✨', clientMessageId: 'synthetic-user',
    }, (text) => { streamed += text; });
    assert.equal(received, 'Nailed it! 👩🏽‍🚀✨');
    assert.equal(streamed, reply.content);
    assert.deepEqual(result, reply);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
