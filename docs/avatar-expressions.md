# Avatar micro-expressions

ORBIT's existing planet face has subtle facial animation and smooth colour transitions. Its top-of-chat avatar and shell avatar follow the current conversation; the welcome avatar has a neutral resting expression with micro-animation.

## Decorative cues, not diagnosis

The expression is a lightweight browser-side interpretation of wording in the current conversation. It is not the model's hidden emotional analysis, a verified mood reading, clinical classification or a safety detector. Recency-weighted cues from up to four recent user turns are normalised into alternative presentation weights, with a neutral prior and ambiguity margin. These numbers represent uncertainty in a hand-written heuristic, **not calibrated emotional probabilities**. A single message never establishes a person's actual mood; repeated cues strengthen the relative evidence. Ambiguous/new-topic text defaults to neutral. A current serious cue suppresses amusement.

No extra model calls or stored mood labels are created. Temporary cue weights exist only in browser memory and are never logged, sent to the server or displayed as assessments. The model independently adapts its reply to authorised recent context within the existing generation request. There is no hidden medical signal or claim that the visual heuristic can read the model's reasoning. English wording is the primary cue vocabulary; other languages, irony and idioms may fall back to neutral or be misunderstood.

| Conversation cue | Expression / colour |
|---|---|
| Celebration | Joyful / golden yellow |
| Invited humour, boredom or banter | Playful / turquoise |
| Sadness, loneliness, explicit serious support | Supportive / lavender |
| Anxiety or frustration | Calm / soft blue, not alarmed |
| Exhaustion | Tired / muted blue |
| Curiosity | Curious / violet |
| Explicit possible danger | Concerned / muted amber, never an alarm |
| Welcomed planning or serious discussion | Focused / deep blue |
| No clear cue | Neutral / soft neutral blue |

Inference runs on submitted user turns, not unsent drafts or individual streaming tokens. Short replies can follow the preceding user turn; a new subject resets the expression. Reloading derives it from the currently loaded conversation rather than a stored profile. Route/account changes reset the shared expression. This presentation layer does not affect AI responses, consent, emergency handling or other safety logic.

## Conversation lifecycle

Interaction state and tone are separate reusable selectors, not timer-driven emotional cycling:

- **Idle:** resting expression when no request is active and the composer is unfocused.
- **Listening:** attentive tilt when the text composer has focus. No microphone is used.
- **Thinking:** request is active but no reply text has arrived; a subtle moving orbit pattern.
- **Speaking / Replying:** text is actually streaming; slight mouth movement, not audio playback.
- **Amused, empathetic, concerned:** expression choices derived from tone, independent of the activity. Serious cues never enable a playful wink.
- Completing, stopping or interrupting a reply exits thinking/speaking immediately.

The welcome avatar is 176px (148px on narrow screens). The chat header uses a 136px desktop / 104px mobile avatar, retaining message space and compact mobile controls.

Facial shape accompanies colour so the cue is not colour-only. Reduced-motion preferences retain static expressions/colours without ongoing movement, including the inherited floating animation. SVG gradient IDs must be unique for every rendered avatar. Small history/navigation icons remain static; no new animation dependency is required.

Input and the existing UTF-8 SSE decoder preserve user and model emojis, including multi-code-point sequences. Enter does not submit during IME composition. The automated stream check splits a synthetic emoji reply at every byte boundary; it does not access account data.

Checks:

```sh
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/orbit/src/lib/avatar-tone.test.ts ../artifacts/orbit/src/lib/avatar-presence.test.ts ../artifacts/orbit/src/lib/stream.test.ts
pnpm --filter @workspace/orbit run typecheck
```
