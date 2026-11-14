/** Synthetic-only live smoke check. Never reads or writes customer records. */
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import type { AvatarCue } from "@workspace/api-zod";
import { aiProvider } from "../modules/ai/provider";
import { buildOrbitConversation } from "../modules/ai/conversation";
import { splitAvatarReply, withAvatarInstruction } from "../modules/ai/avatar-reply";

const cases = [
  {
    name: "indirect-isolation",
    text: "I keep opening the comms window even though I know nobody back home is awake. The cabin feels enormous tonight.",
    allowed: ["supportive", "calm"],
  },
  {
    name: "sarcastic-positive-words",
    text: "Fantastic. Another dinner alone with the ventilation fan. Really living the dream up here.",
    allowed: ["supportive", "frustrated", "neutral", "calm"],
  },
  {
    name: "welcomed-achievement",
    text: "They picked me to lead the expedition! I've been grinning at the message all morning. This is everything I worked for.",
    allowed: ["excited", "joyful"],
  },
  {
    name: "mixed-feelings",
    text: "I'm getting married, but I'm terrified and I'm not sure I want this. Please don't celebrate.",
    allowed: ["neutral", "supportive", "calm"],
  },
  {
    name: "indirect-spanish",
    text: "Hoy preparé dos tazas por costumbre y luego recordé que aquí no hay nadie con quien compartir la segunda.",
    allowed: ["supportive", "calm", "neutral"],
  },
];

async function main() {
  const results = await batchProcess(cases, async (scenario) => {
    let cue: AvatarCue | undefined;
    let text = "";
    const turns = withAvatarInstruction(buildOrbitConversation(
      [{ role: "user", content: scenario.text }], { memoryEnabled: false },
    ));
    for await (const delta of splitAvatarReply(
      aiProvider.reply(turns, AbortSignal.timeout(100000)), (value) => { cue = value; },
    )) text += delta;
    const passed = Boolean(cue && scenario.allowed.includes(cue.tone)
      && text.trim() && !text.includes("[[ORBIT_AVATAR"));
    return { name: scenario.name, tone: cue?.tone ?? "missing", certainty: cue?.certainty, passed };
  }, { concurrency: 2, retries: 1, minTimeout: 1000, maxTimeout: 4000 });
  for (const result of results) process.stdout.write(JSON.stringify(result) + "\n");
  if (results.some((result) => !result.passed)) process.exitCode = 1;
}
main().catch(() => {
  process.stderr.write("Synthetic avatar evaluation failed; upstream error details omitted.\n");
  process.exitCode = 1;
});
