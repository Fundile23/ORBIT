# ORBIT

A standalone AI psychological-wellbeing companion for astronauts. Research prototype, not clinical or flight-certified care.

## Run & operate

- `pnpm --filter @workspace/api-server run dev` — managed API workflow.
- `pnpm --filter @workspace/orbit run dev` — managed frontend workflow.
- `pnpm run typecheck` — full workspace typecheck.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks/validators after contract changes.
- `pnpm --filter @workspace/db run push` — development schema only.

## Stack and source of truth

- pnpm, Node/TypeScript; Express backend in `artifacts/api-server`.
- React/Vite frontend in `artifacts/orbit`, root preview.
- PostgreSQL/Drizzle in `lib/db`; OpenAPI in `lib/api-spec/openapi.yaml`.
- Clerk sign-in; hosted OpenAI behind `modules/ai/provider.ts`.
- Read `README.md`, `docs/architecture.md`, `docs/integration.md` before cross-cutting work.

## Standing scope

- ORBIT is independent first. The partner's main healthcare application is a separate, unavailable project. Do not integrate now.
- Later collaboration/integration will happen after GitHub code review. Keep APIs modular and avoid dependencies on the partner's application.
- Creator-supplied conversation instructions govern ORBIT's voice. Preserve them in the server prompt.
- Never fabricate medical data, crew telemetry or mission emergency procedures.
- Do not imply clinical validation, automatic emergency notification or end-to-end encryption.

## Privacy and safety

- All personal routes derive ownership from verified Clerk identity. No guest/shared data identity.
- AI processing consent and long-term memory start off. Memory is explicitly saved by the user, not automatically extracted.
- Journals/check-ins are not automatically passed to the hosted model.
- Personal text payloads use AES-256-GCM. `SESSION_SECRET` is the stable encryption root: changing it without re-encryption loses access to records.
- No private content in logs, browser persistent query caches or service-worker API caching.
- Settings emergency guidance is user-entered, not independently approved; no automatic escalation.
