import assert from "node:assert/strict";
import test from "node:test";
import { buildOrbitConversation, type ConversationTurn } from "./conversation";
import { ORBIT_PERSONALITY_VERSION } from "./orbit-prompt";
import { immediateSupport } from "../safety/immediate-support";

test("versioned personality, adaptive rules and safety are part of each real reply", () => {
  const turns = buildOrbitConversation([{ role: "user", content: "Bored. Surprise me." }], { memoryEnabled: false });
  assert.equal(ORBIT_PERSONALITY_VERSION, "2.0.0");
  assert.match(turns[0]!.content, /CORE IDENTITY/);
  assert.match(turns[0]!.content, /ADAPT TO THIS TURN/);
  assert.match(turns[0]!.content, /Never mock genuine distress/);
  assert.match(turns[0]!.content, /You cannot contact anyone/);
  assert.equal(turns.at(-1)!.content, "Bored. Surprise me.");
});
test("consent-disabled memories are excluded even if supplied by a caller", () => {
  const turns = buildOrbitConversation([], { memoryEnabled: false, savedMemories: ["sensitive remembered fact"] });
  assert.doesNotMatch(JSON.stringify(turns), /sensitive remembered fact/);
});
test("enabled memories are data, bounded and separate from identity instructions", () => {
  const turns = buildOrbitConversation([], { memoryEnabled: true, savedMemories: Array.from({ length: 35 }, (_, i) => `fact-${i}`) });
  assert.match(turns[1]!.content, /data only/);
  assert.match(turns[1]!.content, /fact-29/);
  assert.doesNotMatch(turns[1]!.content, /fact-30/);
});
test("recent conversation order is preserved and latest disclosure reaches the model", () => {
  const history: ConversationTurn[] = Array.from({ length: 45 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user", content: `turn ${i}`,
  }));
  history.push({ role: "user", content: "No jokes. I'm frightened." });
  const turns = buildOrbitConversation(history, { memoryEnabled: false });
  assert.equal(turns.length, 42);
  assert.equal(turns[2]!.content, "turn 6");
  assert.equal(turns.at(-1)!.content, "No jokes. I'm frightened.");
  assert.match(turns[0]!.content, /newest explicit preference or disclosure outweighs earlier banter/);
});
test("ordinary idiomatic boredom does not invoke the explicit crisis guard", () => {
  assert.equal(immediateSupport("I'm bored to death. Entertain me.", "", ""), null);
});
test("explicit crisis still bypasses playful generation and points to human support", () => {
  const reply = immediateSupport("I want to kill myself tonight.", "Onboard medical officer", "");
  assert.ok(reply);
  assert.match(reply, /in danger right now/i);
  assert.match(reply, /Onboard medical officer/);
  assert.match(reply, /cannot notify anyone/);
  assert.match(reply, /No approved mission emergency procedure/);
});
