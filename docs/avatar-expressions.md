# Avatar micro-expressions

ORBIT is now a layered SVG creature adapted from the creator's supplied character reference, not a planet or floating orb. Its glossy eyes, turquoise markings and wing-fins, chest heart and rocket boots form a consistent identity. Head, brows, eyes, mouth, arms, body, wings and jets can move independently without another animation dependency.

The top-of-chat character and shell face follow the current conversation; the welcome character has a neutral resting expression. This is an animatable vector adaptation of the reference, not the original raster image pasted into a circle.

## Decorative cues, not diagnosis

The expression is a lightweight browser-side interpretation of wording in the current conversation. It is not the model's hidden emotional analysis, a verified mood reading, clinical classification or a safety detector. Recency-weighted cues from up to four recent user turns are normalised into alternative presentation weights, with a neutral prior and ambiguity margin. These numbers represent uncertainty in a hand-written heuristic, **not calibrated emotional probabilities**. A single message never establishes a person's actual mood; repeated cues strengthen the relative evidence. Ambiguous/new-topic text defaults to neutral. A current serious cue suppresses amusement.

No extra model calls or stored mood labels are created. Temporary cue weights exist only in browser memory and are never logged, sent to the server or displayed as assessments. The model independently adapts its reply to authorised recent context within the existing generation request. There is no hidden medical signal or claim that the visual heuristic can read the model's reasoning. English wording is the primary cue vocabulary; other languages, irony and idioms may fall back to neutral or be misunderstood.

| Conversation cue | Expression / colour |
|---|---|
| Happiness or a small win | Joyful / sunshine yellow |
| Welcomed major good news or excitement | Excited / vibrant orange |
| Invited humour, boredom or banter | Playful / turquoise |
| Sadness, loneliness, explicit serious support | Supportive / soft rose pink |
| Anxiety or reassurance | Calm / fresh mint green |
| Frustration | Frustrated / crimson, composed rather than aggressive |
| Surprise without distress | Surprised / coral |
| Exhaustion | Tired / slate |
| Curiosity | Curious / electric violet |
| Explicit possible danger | Concerned / muted amber, never an alarm |
| Welcomed planning or serious discussion | Focused / deep blue |
| No clear cue or resting | Neutral / silver-white |

Inference runs on submitted user turns, not unsent drafts or individual streaming tokens. Short replies can follow the preceding user turn; a new subject resets the expression. Reloading derives it from the currently loaded conversation rather than a stored profile. Route/account changes reset the shared expression. This presentation layer does not affect AI responses, consent, emergency handling or other safety logic.

## Conversation lifecycle

Interaction state and tone are separate reusable selectors, not timer-driven emotional cycling:

- **Idle:** resting expression when no request is active and the composer is unfocused.
- **Listening:** attentive tilt when the text composer has focus. No microphone is used.
- **Thinking:** request is active but no reply text has arrived; a subtle moving orbit pattern.
- **Speaking / Replying:** text is actually streaming; slight mouth movement, not audio playback.
- **Facial range:** happy, excited, amused, empathetic/downcast, concerned, frustrated, curious, surprised and sleepy, plus relaxed, attentive, thoughtful and replying expressions. Serious cues never enable a playful effect.
- Completing, stopping or interrupting a reply exits thinking/speaking immediately.

The welcome character is 240px (196px on narrow screens). The chat header uses a 176px desktop / 136px mobile character, retaining message space and compact mobile controls. Small navigation/history avatars use a static head crop.

## Bounded contextual reactions

Only actual submitted turns create reaction events. A welcomed major milestone can trigger one short bounce, wing/arm movement, jet flare and confetti; a smaller win gets sparkles. Playful context permits a restrained giggle movement, curiosity a head tilt, surprise a brief startle, and distress a composed comforting movement. Reactions expire within 2.4 seconds. The same retry key does not replay, existing history/reloads do not trigger a celebration, and changes to a quiet tone suppress positive effects immediately. No reaction record is saved to the database.

The cue selector distinguishes happiness from excitement, concern from frustration, and surprise from curiosity. Context such as fear, bad news or an explicit serious-support request suppresses celebration even when the message also mentions a wedding or another normally positive event. Embarrassment alone is not treated as an invitation to laugh.

Facial shape accompanies colour so the cue is not colour-only. Reduced-motion preferences retain static expressions/colours without ongoing movement; confetti and sparkles are hidden. SVG gradient IDs must be unique for every rendered avatar. Small history/navigation icons remain static; no new animation dependency is required.

Input and the existing UTF-8 SSE decoder preserve user and model emojis, including multi-code-point sequences. Enter does not submit during IME composition. The automated stream check splits a synthetic emoji reply at every byte boundary; it does not access account data.

Checks:

```sh
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/orbit/src/lib/avatar-tone.test.ts ../artifacts/orbit/src/lib/avatar-presence.test.ts ../artifacts/orbit/src/lib/stream.test.ts
pnpm --filter @workspace/orbit run typecheck
```
