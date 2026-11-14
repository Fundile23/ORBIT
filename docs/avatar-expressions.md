# Avatar micro-expressions

ORBIT's existing planet face has subtle facial animation and smooth colour transitions. Its top-of-chat avatar and shell avatar follow the current conversation; the welcome avatar has a neutral resting expression with micro-animation.

## Decorative cues, not diagnosis

The expression is a lightweight browser-side interpretation of wording in the current conversation. It is not the model's hidden emotional analysis, a verified mood reading, clinical classification or a safety detector. Uncertain/new-topic text defaults to neutral. A serious cue overrides a playful cue. There are no extra model calls, generated emotion scores or stored mood labels.

| Conversation cue | Expression |
|---|---|
| Celebration | Joyful |
| Invited humour, boredom or banter | Playful |
| Sadness, loneliness, explicit serious support | Supportive |
| Anxiety or frustration | Calm, not alarmed |
| Exhaustion | Tired, gently attentive |
| Curiosity | Curious |
| No clear cue | Neutral |

Inference runs on submitted user turns, not unsent drafts or individual streaming tokens. Short replies can follow the preceding user turn; a new subject resets the expression. Reloading derives it from the currently loaded conversation rather than a stored profile. Route/account changes reset the shared expression. This presentation layer does not affect AI responses, consent, emergency handling or other safety logic.

The avatar has a separate attentive thinking state during live replies. Facial shape accompanies colour so the cue is not colour-only. Reduced-motion preferences retain static expressions/colours without ongoing movement. SVG gradient IDs must be unique for every rendered avatar.

Checks:

```sh
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/orbit/src/lib/avatar-tone.test.ts
pnpm --filter @workspace/orbit run typecheck
```
