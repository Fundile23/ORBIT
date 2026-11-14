# Architecture and privacy

## Development agreement

ORBIT is built independently of the main astronaut healthcare platform. The creator's partner is developing that separate system; no main application is available here. Build ORBIT as a modular standalone application first. Review and integrate the repositories through GitHub later. Do not invent dependencies, duplicate the partner's platform or integrate without a new request.

## Modular monolith

React/TypeScript/Vite presents the interface. An Express/TypeScript API owns authentication checks, validation, business logic and AI orchestration. PostgreSQL/Drizzle owns persistence. The shared OpenAPI contract generates React Query clients and server validators. A separate provider adapter isolates model implementation from chat routing.

The workspace layout follows the supplied pnpm structure rather than renaming it to a separate `client/server` project. Domain modules and versioned API boundaries preserve the approved architecture.

## Identity and permissions

Clerk provides sign-in and account verification. The server derives the user ID from the verified session, never a body/header-supplied owner ID. All personal queries and mutations filter by that owner. Messages inherit ownership through their conversation. There is no crew-wide read endpoint, admin clinical portal, shared medical feed or guest data identity.

Cookie-authenticated writes must originate from the same host. Personal responses are `no-store`; browser caches and the service worker must never persist personal API responses. Query caches and draft state clear when identity changes. Production traffic needs HTTPS.

## Data protection

Conversation titles, messages, summaries, check-in payloads, journal payloads, saved memories and preferences are encrypted using AES-256-GCM before entering PostgreSQL. An HKDF-derived key comes from the stable server-only `SESSION_SECRET`. The opaque owner ID is authenticated as additional data. Metadata (opaque IDs, owner IDs, roles, timestamps, generation lease metadata) remains queryable.

This is **not end-to-end encryption**: the application server decrypts records for their owner and, with AI-processing consent, sends conversation context to a hosted model. Authorized infrastructure operators may have access. Content is not included in request logs or upstream exception logs. Encryption-key loss makes records unreadable; use a deliberate key-management and rotation strategy before operational deployment.

Deletion removes active application records, not historical provider retention or infrastructure recovery copies. Those retention policies require separate institutional review. Deleting ORBIT data does not delete the authentication account.

## Consent and context

AI-processing consent starts false and is required server-side for chat and summaries. History remains persistent; long-term memory is a separate explicit setting, also false by default. Memories are manually added/deleted by the owner. Turning memory off stops their use but retains them for inspection/deletion. No automatic personal-fact extraction occurs.

The model sees the current conversation's latest 40 messages, up to 30 explicitly saved memories when enabled, and user-configured display name/emergency guidance. It does not automatically receive journals, check-ins or any external health records. Older messages remain visible/exportable but are outside the live context window. The separate summary action processes the conversation up to an explicit input-size ceiling; it rejects oversized requests instead of silently omitting older content. Summaries are AI-generated, not clinical assessments or automatic persistent memories.

## Reliability

The message endpoint streams server-sent events. User messages persist before generation; only complete assistant replies persist. A client-generated UUID deduplicates a user turn and recovers its completed reply on retry. A database-backed conversation generation lease prevents concurrent replies across server instances; a timeout releases failed generations.

Failed generation is visible, never replaced with a canned wellness response. An explicit high-risk phrase guard supplies immediate-support guidance as a safety intervention; ambiguous distress also relies on model safety instructions. This is not a validated risk classifier.

Browser drafts are user-scoped in sessionStorage (not encrypted transcripts) and cleared on sign-out/data deletion. Offline drafts are not silently transmitted on reconnection. Public exercise content can be cached in localStorage; production service-worker caching includes public exercise responses and static assets, not private APIs/auth. Offline support is limited; the hosted model and identity provider remain network dependencies.

## Clinical and emergency boundaries

The creator-supplied ORBIT speaking instructions are versioned on the server, separate from operational safety rules. The app is an AI wellbeing companion, not a psychologist, diagnosis tool, medication prescriber, emergency service or flight-certified system.

Mission contact/protocol fields start blank. User-entered guidance is not independently verified or represented as mission-approved. ORBIT cannot call anyone, notify mission control, transmit a distress alert or initiate escalation. Acute distress guidance encourages real human support. Never fabricate mission procedures or phone numbers.

## Before operational use

Obtain clinical review, model-specific safety evaluation (including indirect distress and adversarial prompts), independent access-control/security testing, a retention and data-processing agreement, institutional approvals, backup/key-management procedures, audited shared-identity design, and mission-specific offline/reliability validation. Development sign-in accounts and real flight usage are not interchangeable.
