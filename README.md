# ORBIT

A standalone AI psychological-wellbeing companion for astronauts on long-duration missions. A research prototype, **not a clinically validated or flight-certified medical system**.

## Development

This is a pnpm TypeScript workspace. Use Node.js 24 and pnpm 10.

```sh
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push  # development database only
pnpm run typecheck
```

On Replit, run the managed API Server and ORBIT web workflows. Outside Replit, the API needs `PORT=5000`, and Vite needs `PORT=3000` and `BASE_PATH=/`. Configure a same-origin reverse proxy: `/api/*` to the API, other paths to the frontend, preserving SSE streaming. Use HTTPS outside localhost. Do not add browser credentials to source control.

### Environment

- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: stable random server-only root used to derive the private-record encryption key. **Do not rotate/delete it without re-encrypting existing records; doing so makes them unreadable.** Never reuse a public credential.
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`: provisioned by managed authentication. The Vite publishable key is intentionally public.
- `VITE_CLERK_PROXY_URL`: managed production proxy configuration; intentionally blank in managed development.
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`: managed AI provider configuration. Only the backend reads these.

Managed auth and AI configuration are Replit-specific. A GitHub checkout outside Replit needs equivalent Clerk configuration and a model provider implementation/configuration. See the provider boundary and architecture documentation; no personal API keys are included.

## Structure

- `artifacts/orbit`: React/Vite frontend, private pages, public exercises, offline assets.
- `artifacts/api-server`: Express API, authenticated identity boundary, encrypted persistence, AI orchestration.
- `lib/api-spec/openapi.yaml`: versioned API source of truth.
- `lib/api-client-react`, `lib/api-zod`: generated client and validation contracts. Regenerate after spec edits.
- `lib/db`: Drizzle schemas and development database tooling.
- `lib/integrations-openai-ai-server`: isolated managed provider client.
- `docs/architecture.md`: security, privacy and architectural decisions.
- `docs/integration.md`: contract and future platform integration.

## Current features

Streaming contextual AI chat, history/rename/delete/summaries, emotional check-ins, user-entered sleep records, wellbeing trends, private journaling, guided wellness exercises, explicit memory controls, data export and deletion.

No fabricated crew records, mission telemetry or medical data. No main-platform dependency or automatic clinical sharing.

## Operational limits

Hosted AI needs connectivity. The app cannot monitor an astronaut or contact medical staff. Browser connectivity indicators are not mission communications telemetry. Cached exercises and tab-local drafts support limited offline use; service-worker caching is enabled in production builds. Full disconnected operation after a cold start with third-party auth unavailable is not guaranteed.

Do not use real sensitive medical records in a research demonstration without institutional approval and a reviewed data-processing policy. Professional clinical review, safety evaluations, independent security review, tested emergency procedures and mission-specific reliability work are required before operational use.
