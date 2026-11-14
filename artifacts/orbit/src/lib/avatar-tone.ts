import type { AvatarCueTone } from '@workspace/api-client-react';
/** Tentative decorative cues, never a diagnosis or a safety/escalation signal. */
export type AvatarTone = AvatarCueTone;
type Turn = { role: string; content: string };
const tones: AvatarTone[] = ['neutral', 'joyful', 'excited', 'playful', 'supportive', 'calm', 'tired', 'curious', 'concerned', 'focused', 'frustrated', 'surprised'];
type Scores = Record<AvatarTone, number>;
export type ToneEstimate = {
  tone: AvatarTone;
  /** Relative cue weight, NOT a calibrated or clinical probability. */
  confidence: number;
  probabilities: Scores;
  evidenceTurns: number;
};
const empty = (): Scores => Object.fromEntries(tones.map((tone) => [tone, 0])) as Scores;
const normalise = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[’]/g, "'");
const followThrough = /^(?:yes|yeah|yep|exactly|that's it|thank you|thanks|tell me more|go on)[.! ,]*$/i;
const seriousRequest = /\b(no jokes|jokes aside|just listen|not (?:feeling )?(?:happy|okay|ok|fine|good))\b/;

function scoreTurn(content: string): Scores {
  const raw = normalise(content);
  const scores = empty();
  const text = raw.replace(/\b(?:not|never|no longer|don't feel|do not feel|not feeling)\s+(?:very |really |so )?(?:getting married|engaged|sad|lonely|anxious|worried|happy|excited|tired|exhausted|angry|frustrated|surprised)\b/g, '');
  if (seriousRequest.test(raw)) scores.supportive += 2;
  if (/\b(kill myself|end my life|suicid\w*|self[- ]harm|hurt myself|can't (?:go on|keep going)|better off without me)\b/.test(text)) scores.concerned += 2;
  if (/\b(sad|lonely|homesick|miss (?:my |home|family)|crying|cried|grief|heartbroken|feel awful|alone|depressed|terrible news|bad news|devastated|passed away|against my will)\b/.test(text) || /[😢😭]/u.test(text)) scores.supportive += 1.4;
  if (/\b(anxious|anxiety|worried|panic\w*|scared|afraid|terrified|overwhelmed|stressed|racing thoughts|thoughts.*racing)\b/.test(text)) scores.calm += 1.4;
  if (/\b(frustrated|frustrating|angry|fed up|furious|irritated)\b/.test(text)) scores.frustrated += 1.6;
  if (/\b(exhausted|tired|sleepy|drained|worn out|burnt out|low energy|no energy)\b/.test(text) || /[😴🥱]/u.test(text)) scores.tired += 1.4;
  if (/\b(happy|celebrat\w*|proud|nailed it|nailed the|great news|feel(?:ing)? (?:great|amazing)|we did it)\b/.test(text) || /[🥳🎉]/u.test(text)) scores.joyful += 1.4;
  if (/\b(excited|thrilled|can't wait|over the moon)\b/.test(text)) scores.excited += 1.8;
  if (/\b(?:i(?:'m| am)|we(?:'re| are)) getting married\b|\b(?:i|we) (?:just )?got engaged\b|\b(?:i|we) (?:just )?(?:won|graduated|got promoted)\b|\bi got the job\b|\bwe(?:'re| are) having a baby\b/.test(text)) scores.excited += 2.4;
  if (/\b(surprised|unexpected|didn't see that coming|cannot believe it|can't believe it|what a surprise)\b/.test(text)) scores.surprised += 1.4;
  // Compatible positive cues reinforce excitement rather than cancelling one
  // another out as though "happy" and "excited" were opposing interpretations.
  if (scores.excited > 0 && scores.joyful > 0) {
    scores.excited += scores.joyful * .5;
    scores.joyful *= .25;
  }
  if (/\b(haha+|lol|lmao|funny|bored)\b/.test(text) || /[😂🤣]/u.test(text)) scores.playful += .85;
  if (/\b(banter|roast me|roast my|tell me (?:a |another )?joke|make me laugh|pun|play a game)\b/.test(text)) scores.playful += 1.4;
  if (/\bembarrass(?:ed|ing)\b/.test(text)) scores.playful += .4;
  if (/\b(curious|wondering|teach me|how does|how do|why does|why do|what if|tell me about|surprise me)\b/.test(text)) scores.curious += 1.4;
  if (/\b(feel(?:ing)? better|calm|relaxed|at peace|settled)\b/.test(text)) scores.calm += 1.4;
  if (/\b(let's focus|serious discussion|work through|help me plan|focus on|step by step)\b/.test(text)) scores.focused += 1.4;
  // General questions, quoted fiction and third-party descriptions are weaker
  // evidence than self-description. Do not infer sadness from "sad music".
  if (/\bsad (?:music|song|film|movie|story)\b/.test(text)) {
    scores.supportive *= .18;
  }
  if (/\b(character|in the (?:novel|book|movie)|my (?:friend|crewmate) (?:is|feels))\b/.test(text)) {
    for (const tone of tones) scores[tone] *= .18;
  }
  if (/\b(maybe|perhaps|not sure|might be)\b/.test(text)) {
    for (const tone of tones) scores[tone] *= .65;
  }
  return scores;
}

/**
 * Recency-weighted alternatives with a neutral prior and ambiguity margin.
 * A single phrase can invite a gentle presentation but never establishes an
 * astronaut's actual mood. Repeated cues strengthen relative confidence.
 */
export function estimateConversationTone(history: readonly Turn[], pendingText?: string): ToneEstimate {
  const userTurns = history.filter((turn) => turn.role === 'user').map((turn) => turn.content).slice(-6);
  // Pending messages can also appear in a refreshed server result: don't count
  // that same turn twice and manufacture extra confidence.
  if (pendingText !== undefined && pendingText !== userTurns.at(-1)) userTurns.push(pendingText);
  const latest = userTurns.at(-1) ?? '';
  const newest = scoreTurn(latest);
  const hasNewCue = tones.some((tone) => newest[tone] > 0);
  const isFollowThrough = followThrough.test(latest.trim());
  const scores = empty();
  scores.neutral = isFollowThrough ? .45 : .8;
  let evidenceTurns = 0;
  // A new, unrecognised subject is not evidence of a continuing emotional state.
  if (hasNewCue || isFollowThrough) {
    userTurns.slice(-4).reverse().forEach((text, age) => {
      const turnScores = age === 0 ? newest : scoreTurn(text);
      if (tones.some((tone) => turnScores[tone] > 0)) evidenceTurns++;
      for (const tone of tones) scores[tone] += turnScores[tone] * (.48 ** age);
    });
  }
  // A current serious disclosure suppresses amusement, without determining
  // clinical severity or affecting the independent server-side safety path.
  const serious = seriousRequest.test(normalise(latest)) || newest.concerned >= 1;
  const gentle = newest.supportive >= 1 || newest.calm >= 1 || newest.tired >= 1 || newest.frustrated >= 1;
  if (serious || gentle) {
    scores.playful = 0;
    scores.joyful = 0;
    scores.excited = 0;
    scores.surprised = 0;
    scores.curious *= .3;
  }
  const total = tones.reduce((sum, tone) => sum + scores[tone], 0);
  const probabilities = empty();
  for (const tone of tones) probabilities[tone] = scores[tone] / total;
  const ranked = [...tones].sort((a, b) => probabilities[b] - probabilities[a]);
  const first = ranked[0]!;
  const second = ranked[1]!;
  const isClear = probabilities[first] >= .42 && probabilities[first] - probabilities[second] >= .12;
  const tone = isClear ? first : 'neutral';
  return { tone, confidence: probabilities[tone], probabilities, evidenceTurns };
}

export function inferAvatarTone(history: readonly Turn[], pendingText?: string): AvatarTone {
  return estimateConversationTone(history, pendingText).tone;
}
