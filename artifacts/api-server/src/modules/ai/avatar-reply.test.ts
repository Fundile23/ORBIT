import assert from "node:assert/strict";
import test from "node:test";
import type { AvatarCue } from "@workspace/api-zod";
import { splitAvatarReply, withAvatarInstruction } from "./avatar-reply";

async function collect(chunks: string[]) {
  const cues: AvatarCue[] = [];
  let text = "";
  async function* source() { for (const chunk of chunks) yield chunk; }
  for await (const delta of splitAvatarReply(source(), (cue) => cues.push(cue))) text += delta;
  return { cues, text };
}
const header = (tone = "supportive", certainty = "clear") =>
  `[[ORBIT_AVATAR ${JSON.stringify({ tone, certainty })}]]\n`;

test("metadata is stripped at every possible stream boundary without changing reply emojis", async () => {
  const text = "That sounds like a lonely evening. I'm here with you. 🌙";
  const raw = header() + text;
  for (let i = 0; i <= raw.length; i++) {
    const result = await collect([raw.slice(0, i), raw.slice(i)]);
    assert.equal(result.text, text);
    assert.deepEqual(result.cues, [{ tone: "supportive", certainty: "clear" }]);
  }
});

test("all supported tones survive single-character chunks", async () => {
  for (const tone of ["neutral", "joyful", "excited", "playful", "supportive", "calm",
    "tired", "curious", "concerned", "focused", "frustrated", "surprised"]) {
    const result = await collect([...header(tone) + "Hello"]);
    assert.equal(result.cues[0]?.tone, tone);
    assert.equal(result.text, "Hello");
  }
});

test("uncertain, invalid, and extra-field metadata explicitly become neutral", async () => {
  for (const raw of [
    header("excited", "uncertain"),
    header("diagnosed", "clear"),
    header("playful", "very confident"),
    '[[ORBIT_AVATAR {"tone":"excited","certainty":"clear","score":99}]]\n',
    "[[ORBIT_AVATAR not json]]\n",
    "[[ORBIT_AVATAR null]]\n",
  ]) {
    const result = await collect([raw, "I can listen."]);
    assert.equal(result.cues.length, 1);
    assert.equal(result.cues[0]?.tone, "neutral");
    assert.equal(result.text, "I can listen.");
  }
});

test("plain replies remain readable, with exactly one neutral fallback", async () => {
  const result = await collect(["A", " quiet evening", "\nWould talking help?"]);
  assert.equal(result.text, "A quiet evening\nWould talking help?");
  assert.deepEqual(result.cues, [{ tone: "neutral", certainty: "uncertain" }]);
});

test("oversized or truncated reserved headers cannot leak into saved dialogue", async () => {
  const oversized = "[[ORBIT_AVATAR " + "x".repeat(2000);
  assert.deepEqual(await collect([...oversized]), {
    cues: [{ tone: "neutral", certainty: "uncertain" }], text: "",
  });
  assert.equal((await collect([...oversized, "\n", "Normal reply."])).text, "Normal reply.");
  assert.equal((await collect([oversized + "\nNormal reply."])).text, "Normal reply.");
  assert.equal((await collect(["[[ORBIT_AVATAR {\"tone\":"])).text, "");
  assert.equal((await collect(["[[ORBIT_AV"])).text, "");
});

test("metadata does not swallow following newlines or re-parse body text", async () => {
  const body = "\nHello\n" + header("excited") + "This is quoted text.";
  assert.equal((await collect([header(), body])).text, body);
});

test("an interrupted upstream stays a failure rather than a completed reply", async () => {
  async function* failed() { yield header(); yield "Partial"; throw new Error("interrupted"); }
  await assert.rejects(async () => {
    for await (const _delta of splitAvatarReply(failed(), () => undefined)) { /* consume */ }
  }, /interrupted/);
});

test("transport instruction adds no user data or extra generation and preserves safety instructions", () => {
  const turns = [{ role: "system" as const, content: "Safety rules" }, { role: "user" as const, content: "Synthetic turn" }];
  const result = withAvatarInstruction(turns);
  assert.equal(result.length, 3);
  assert.deepEqual(result.slice(0, 2), turns);
  assert.equal(turns.length, 2);
  assert.match(result[2]!.content, /sarcasm/);
  assert.match(result[2]!.content, /not a diagnosis/);
  assert.match(result[2]!.content, /Distress.*override celebration/);
});
