/** Decorative conversation cues only; not emotion detection or a safety signal. */
export type AvatarTone = 'neutral' | 'joyful' | 'playful' | 'supportive' | 'calm' | 'tired' | 'curious';
type Turn = { role: string; content: string };

function cue(content: string): AvatarTone | null {
  const text = content.toLowerCase().replace(/[’]/g, "'");
  // Serious cues win over laughter, irony or a request for banter.
  if (/\b(no jokes|jokes aside|just listen|not (?:feeling )?(?:happy|okay|ok|fine|good)|kill myself|end my life|suicid\w*|self[- ]harm|hurt myself|can't (?:go on|keep going)|better off without me)\b/.test(text)) return 'supportive';
  // Avoid treating a simple negation as proof of the opposite emotion.
  const explicit = text.replace(/\b(?:not|no longer|don't feel|do not feel|not feeling)\s+(?:very |really |so )?(?:sad|lonely|anxious|worried|happy|excited|tired|exhausted|angry|frustrated)\b/g, '');
  if (/\b(sad|lonely|homesick|miss (?:my |home|family)|crying|cried|grief|heartbroken|feel awful|alone|depressed)\b/.test(explicit)) return 'supportive';
  if (/\b(anxious|anxiety|worried|panic\w*|scared|afraid|frustrated|angry|overwhelmed|stressed|fed up|racing thoughts|thoughts.*racing)\b/.test(explicit)) return 'calm';
  if (/\b(exhausted|tired|sleepy|drained|worn out|burnt out|low energy|no energy)\b/.test(explicit)) return 'tired';
  if (/\b(excited|happy|thrilled|celebrat\w*|proud|nailed it|nailed the|great news|feel(?:ing)? (?:great|amazing)|we did it)\b/.test(explicit)) return 'joyful';
  if (/\b(haha+|lol|lmao|banter|roast me|roast my|tell me (?:a |another )?joke|make me laugh|pun|funny|bored|play a game)\b/.test(explicit)) return 'playful';
  if (/\b(curious|wondering|teach me|how does|how do|why does|why do|what if|tell me about|surprise me)\b/.test(explicit)) return 'curious';
  if (/\b(feel(?:ing)? better|calm|relaxed|at peace|settled)\b/.test(explicit)) return 'calm';
  return null;
}

export function inferAvatarTone(history: readonly Turn[], pendingText?: string): AvatarTone {
  const userTurns = history.filter((turn) => turn.role === 'user').slice(-3);
  const latest = pendingText ?? userTurns.at(-1)?.content ?? '';
  const direct = cue(latest);
  if (direct) return direct;
  // Short conversational continuations may inherit the preceding tone. Do not
  // carry a label across a new subject, ambiguous "fine", or unrelated prose.
  if (/^(?:yes|yeah|yep|exactly|that's it|thank you|thanks|tell me more|go on)[.! ,]*$/i.test(latest.trim())) {
    const previous = pendingText === undefined ? userTurns.at(-2) : userTurns.at(-1);
    return previous ? cue(previous.content) ?? 'neutral' : 'neutral';
  }
  return 'neutral';
}
