# ORBIT companion personality

## Current contract

The version-controlled personality is in `artifacts/api-server/src/modules/ai/orbit-prompt.ts`, identified by `ORBIT_PERSONALITY_VERSION`. The revised personality builds on the creator's original instructions: warm, witty, intellectually curious and capable of playful banter, while preserving autonomy, privacy and medical boundaries.

`buildOrbitConversation` assembles the personality, adaptive conversation rules, operational safety rules and permitted context. The live chat route and the synthetic scenario evaluation use this same builder.

## Mood and energy recognition

Recognition is performed **inside the existing model reply request**, not by a separate emotion-classification API. The model considers the user's wording, explicit feelings, energy, recent conversational pattern, humour/irony and stated preferences. Those cues guide tone, length, questions and humour in the generated response.

Interpretation is tentative. No mood diagnosis, model-generated confidence score, persistent emotional profile or covert background monitoring is created. The model should ask a natural clarifier when ambiguity materially changes how to respond, rather than treating punctuation or a short message as proof of distress. The separate browser avatar uses temporary, uncertainty-aware presentation weights; see `avatar-expressions.md`. These are not clinical scores and are not saved.

The newest disclosure or explicit preference overrides earlier joking. Excitement can receive enthusiasm; boredom can receive a surprising topic; invited banter can receive light teasing about a harmless situation. Loneliness, anxiety and genuine distress are never targets. Exhaustion calls for a short, low-pressure reply.

## Cost and privacy

- Same model and single streamed reply request as before.
- No additional classification call, new service or dependency.
- The longer instruction set adds input tokens; it is not a promise of identical per-message cost.
- No additional access to journals, check-ins or external health information.
- Memory still requires consent; the builder independently excludes memories when disabled.
- Conversational initiative occurs within an active, welcomed exchange. No unsolicited push messages, scheduled prompts or new surveillance.

## Safety and consistency

Humour is optional, not required in every turn. Sarcasm must be gentle and welcome. ORBIT must stop when asked, never mock distress or encourage exclusive emotional dependence, and never pretend to be human, a psychologist or capable of contacting emergency support.

Explicit high-risk language still takes the existing immediate-support route before playful generation. Other possible danger, including indirect expressions, is addressed by the model's safety rules. That combination is not a clinically validated assessment or comprehensive crisis detector.

The expressive avatar enhances the existing UI; public API, authentication, streaming transport, persistence and consent controls are unchanged. ORBIT may use sparse, welcomed emojis and conversational amusement without claiming human emotions. Explicit no-emoji preferences and distress take precedence.

## Repeatable evaluation

Pure contract/safety tests, with no model cost:

```sh
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/src/modules/ai/conversation.test.ts
```

Synthetic scenario evaluation, making real billable AI requests:

```sh
pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/src/evaluation/personality.ts
```

For a focused live check of welcomed emojis, a no-emoji preference and a playful-to-serious shift:

```sh
pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/src/evaluation/personality.ts welcomed-emoji no-emoji emoji-to-distress
```

Selected runs write `generated-artifacts/orbit-presence-evaluation.json`.

The latter covers celebration, boredom, banter, homesickness, frustration, anxiety, exhaustion, sarcasm, a banter-to-distress shift, welcomed initiative, indirect distress and the explicit crisis guard. It uses the production prompt builder, provider and safety guard without reading/writing any account data. At most two evaluations run in parallel, with rate-limit backoff.

Output goes to ignored `generated-artifacts/orbit-personality-evaluation.json`. Automatic checks are smoke checks, not measurements of empathy or clinical safety. Read the actual responses for appropriateness, tone and consistency; nondeterministic models can respond differently on later runs.
