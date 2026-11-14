import assert from 'node:assert/strict';
import test from 'node:test';
import { streamMessage } from './stream';
import type { AvatarCue } from '@workspace/api-client-react';

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

test('SSE delivers a validated cue once, separately from the streamed reply', async () => {
  const originalFetch = globalThis.fetch;
  const message = {
    id: 'reply', role: 'assistant', content: 'That is a lot to carry. 🌙',
    createdAt: '2026-11-14T14:00:00.000Z', clientMessageId: null,
  };
  const cue = { tone: 'supportive', certainty: 'clear' };
  globalThis.fetch = async () => {
    const bytes = new TextEncoder().encode([
      { avatar: cue }, { content: message.content }, { avatar: { tone: 'excited', certainty: 'clear' } },
      { done: true, message },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''));
    return new Response(new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    }));
  };
  try {
    const cues: AvatarCue[] = [];
    let text = '';
    const result = await streamMessage('synthetic', { content: 'Hello', clientMessageId: 'turn' },
      (delta) => { text += delta; }, undefined, (value) => cues.push(value));
    assert.equal(text, message.content);
    assert.deepEqual(result, message);
    assert.deepEqual(cues, [cue]);
  } finally { globalThis.fetch = originalFetch; }
});

test('invalid SSE cue becomes neutral without losing a successful reply', async () => {
  const originalFetch = globalThis.fetch;
  const message = {
    id: 'reply', role: 'assistant', content: 'Hello',
    createdAt: '2026-11-14T14:00:00.000Z', clientMessageId: null,
  };
  globalThis.fetch = async () => new Response([
    { avatar: { tone: 'invalid', certainty: 'clear' } }, { content: 'Hello' }, { done: true, message },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''));
  try {
    const cues: AvatarCue[] = [];
    await streamMessage('synthetic', { content: 'Hello', clientMessageId: 'turn' },
      () => undefined, undefined, (cue) => cues.push(cue));
    assert.deepEqual(cues, [{ tone: 'neutral', certainty: 'uncertain' }]);
  } finally { globalThis.fetch = originalFetch; }
});
