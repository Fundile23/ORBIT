# Future integration guide

## Contract

Source of truth: `lib/api-spec/openapi.yaml`, version 1.0.0. Personal endpoints live at `/api/v1`, and require the signed-in owner's verified identity. The public exercise library is the only unauthenticated wellbeing resource.

| Resource | Operations |
|---|---|
| `/conversations` | GET list, POST create |
| `/conversations/{id}` | GET messages/detail, PATCH title, DELETE with messages |
| `/conversations/{id}/messages` | POST streaming AI turn |
| `/conversations/{id}/summary` | POST AI-generated summary |
| `/check-ins` | GET chronological list, POST |
| `/check-ins/{id}` | PATCH, DELETE |
| `/journal` | GET, POST |
| `/journal/{id}` | PATCH, DELETE |
| `/exercises` | GET public educational library |
| `/settings` | GET, PATCH |
| `/memories` | GET, POST with memory consent |
| `/memories/{id}` | DELETE |
| `/overview` | GET actual counts, latest check-in, latest-30 averages and configuration availability |
| `/data/export` | GET personal JSON |
| `/data` | DELETE all ORBIT records, not authentication account |

IDs are UUIDs. Timestamps are UTC ISO 8601 instants. Mutation bodies contain no ownership or server timestamps. An out-of-scope ID returns 404, not another user's record. Errors are JSON `{ "error": "message" }` with standard HTTP statuses. Streaming errors after HTTP headers are SSE events.

### Chat streaming

Send `POST /api/v1/conversations/{id}/messages`:

```json
{"content":"I miss home today.","clientMessageId":"550e8400-e29b-41d4-a716-446655440000"}
```

Events:

```text
data: {"avatar":{"tone":"supportive","certainty":"clear"}}

data: {"content":"That sounds"}

data: {"content":" difficult."}

data: {"done":true,"message":{"id":"...","role":"assistant","content":"That sounds difficult.","clientMessageId":null,"createdAt":"..."}}
```

`avatar` is an optional ephemeral presentation cue from the same generation request, not a measured mood or diagnosis. Allowlisted tones and certainty values are defined in OpenAPI `AvatarCue`. Treat missing, invalid or `uncertain` cues as neutral. Do not display metadata as dialogue, persist it as a mood profile, or replay celebrations from saved history. Cached-reply retries emit neutral. The immediate-support path emits concerned without a model call. Clients that ignore this additive SSE record continue to work.

On failure, `data: {"error":"..."}` ends the stream. Retry the **same content with the same clientMessageId**, not a new UUID. 409 means another reply is running, or a retry conflicts with a newer turn. Do not auto-send offline drafts. A model reply can be delayed; this endpoint says nothing about Earth-to-space communications latency.

## Integration later, not now

1. Put the independent repositories in GitHub and review interfaces and licenses.
2. Agree a shared identity provider or trusted identity exchange; map external astronaut identity to an ORBIT identity through a reviewed bridge. Do not trust a browser-supplied astronaut ID.
3. Define explicit user consent and field-level sharing boundaries. Connecting the systems must not expose raw conversations, journal entries or memories.
4. Add narrowly scoped, documented integration endpoints only for agreed use cases.
5. Keep each system's tables private; do not query the other system's database.
6. Agree actual approved emergency procedures, communication-delay handling and operational ownership.

No machine-to-machine token system, external health-record ingestion, automatic clinical sharing or webhooks have been created in this first version. The current API is for ORBIT's own authenticated frontend. Implementing a trusted cross-system API requires a separate security design, not simply exposing the current session endpoints.
