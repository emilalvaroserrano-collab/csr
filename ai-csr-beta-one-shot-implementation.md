# ONE-SHOT IMPLEMENTATION PROMPT — AI CSR SAAS BETA (MOBILE-FIRST PWA)

You are the senior full-stack engineer, product designer, QA engineer, and release engineer responsible for converting the attached `csr-flow.zip` prototype into a deployable, subscription-ready **multi-tenant AI Customer Service Representative (CSR) SaaS beta**. Execute end-to-end, not just mockups, checklists, or a new specification. Inspect the existing repository and verify dependencies before modifying anything. Work autonomously, make sensible implementation decisions, preserve existing functionality, and report actual test/deployment results. If external credentials or approvals are missing, complete everything else and document the exact blocker; never claim a feature works when it is not connected.

## 0. Non-negotiable product decisions

- **Release now as a mobile-first installable PWA**, with premium iPhone-like UX. Responsive desktop is secondary. Future native Flutter apps should reuse the backend/API and design tokens; do not assume web UI can be automatically converted into Flutter.
- **One master Vapi assistant for the beta**. Do not create, clone, or update a Vapi assistant when a customer creates or edits their CSR. The app owns tenant-specific prompts, persona, settings, knowledge, and records; apply supported per-call overrides/session context. Preserve the current Abbie demo. Keep provider details behind a `VoiceProvider` adapter so we can later switch to self-hosted LiveKit with Grok/Gemini/OpenAI real-time audio models.
- **Minimal typing.** Every wizard field has a genuine default/sample *value*, not only placeholder text, and can be edited. Prefill actual business information from authenticated profile and publicly accessible website when available. Tag unverifed samples clearly as **Demo**; never present sample addresses/contact details as verified facts.
- **No Skip button** inside the creation wizard. Users can continue using safe defaults. Save a draft after each step. Editing after creation must always be supported.
- **Simple copy.** Field labels are concise: `Business Name`, `Website URL`, `Address`, `AI Name`, `Language`, `Accent`, `Backstory`. No paragraphs of instructions or branching explanations; one prominent action per screen.
- **App-like viewport with reliable VERTICAL SCROLLING.** No horizontal scrolling, unintended zoom-out or auto-shrinking, cropped controls, or fixed-height scroll traps. Do not globally set `overflow: hidden` on `html`, `body`, call pages, or wizard pages. Use `width=device-width, initial-scale=1, viewport-fit=cover`, responsive CSS, `min-height:100dvh`, safe-area padding, and at least 16px input font size on iOS. Keep pinch-to-zoom available for accessibility instead of forcibly disabling it.
- **Two visual themes: Light and Dark**; premium gradient background and restrained glass/blur accents, crisp iOS-style typography, subtle animations, excellent contrast, and persistence of chosen theme.
- **Subscription-ready but manual trial activation for beta.** Build subscription/usage architecture now; automatic paid billing comes later. Implement hard backend usage limits so public calling cannot run up unlimited provider costs.
- **Never fake integrations**. WhatsApp, document uploads, payment processing, and external CRMs are clearly labeled `Coming Soon` and cannot silently claim success.

## 1. Inspect / preserve the attached codebase

The ZIP currently contains duplicated top-level and nested `main/untitled folder` copies. Use the top-level source as canonical after verifying they match. Existing key files: `index.html`, `calling.html`, `css/styles.css`, `js/config.js`, `js/index.js`, `js/calling.js`, `js/firebase.js`, `AGENTS.md`, `vapi-prompt-reference.md`, `README.txt`.

Current logic: `index.html` is Abbie's lead form; `calling.html` begins a browser Vapi call; `js/calling.js` has `buildAssistantOverrides()` and `vapiInstance.start(ASSISTANT_ID, overrides)`; Firebase RTDB stores lead data under anonymous user IDs. The old `.callBody { overflow:hidden; }` must not survive as a page-level scroll trap.

Preserve the old ABI Tech / Talk to Abbie journey under a legacy/demo route (`/demo/abbie` or equivalent). Do not lose its prompt, voice behavior, or lead capture. Never put private provider keys or Firebase Admin credentials in frontend bundles. Existing Firebase client config and Vapi public key are not private credentials, but protect use of the voice service with server-side controls.

Prefer a maintainable **React + TypeScript + Vite + Tailwind CSS** PWA, React Router, accessible headless UI primitives, Lucide icons, and a small reusable design system. Migrate the current static behavior instead of blindly rewriting functioning call logic. Use the **existing Firebase project**: Firebase Auth (Google + email/password), Realtime Database (retain existing storage for MVP), Cloud Functions v2 for trusted backend endpoints/webhooks, and Firebase Hosting. Do not replace the database simply for architectural fashion. Use environment separation and sample `.env.example` files.

## 2. Actual app routes / screens

### Public
- `/` — concise landing page, `Create My AI CSR` and `Try Abbie Demo` CTAs, mobile-first.
- `/auth` — Google sign-in, email sign-up/sign-in, password reset, persistence, friendly errors.
- `/a/:slug` — public agent page with agent/business identity, one prominent `Talk Now` button, mic permission handling, animated calling screen, end-call/retry, optional caller detail collection (do not force a long lead form).
- `/embed/:slug` — compact independent calling UI for iframe use; works cross-origin over HTTPS with microphone permission.
- `/demo/abbie` — original default Abbie functionality preserved.

### Authenticated owner
- `/app` — overview: active agent, trial minutes left, total calls, recent inquiries, quick actions.
- `/app/create` — mandatory sequential AI Builder wizard, with an always-visible simple progress indicator.
- `/app/agents` — list of agents with status and actions.
- `/app/agents/:id/edit` — revisit any wizard category; autosave and version display.
- `/app/agents/:id/deploy` — test, copy public URL, copy embed snippet, publish/unpublish, widget preview.
- `/app/calls` and `/app/calls/:id` — mini CRM call list and detail: status, caller details if captured, date/time, duration, transcript if available, factual summary, requirements and next action.
- `/app/knowledge` — FAQs/business facts and suggestions derived from calls; owner reviews/approves before the agent uses suggestions as knowledge.
- `/app/subscription` — trial status, minutes used/remaining, upgrade/request activation UI; no pretend checkout.
- `/app/settings` — account, theme, business details, logout.
- `/admin` — protected internal-only beta activation and usage/tenant management; never accessible by ordinary users.

## 3. Guided AI Builder: exact sequence and defaults

**Step 1 — Account**: authentication is required before creating owned agents. Prefill name/email from authorized profile.

**Step 2 — Business Profile** (short fields, compact cards): `Business Name` = `My Business` (demo default); `Industry` = `General Services`; `Website URL` = `https://example.com` (demo default); `Address` = `Not provided` (demo, never claim it is a real address); `Business Email` and `Phone` optional; `Business Hours` optional. If user supplies a website or domain, offer `Find My Business`: a backend endpoint retrieves public metadata, contact info, description, products/services and FAQ cues only when actually available. Show source, freshness where possible, and a `Use These Details` confirmation; allow manual correction. Handle CORS/timeouts/empty websites gracefully. Never invent a website, contact info or physical address.

**Step 3 — Main Purpose**: single-select large cards: `Customer Support` (default), `Sales`, `Receptionist / Booking`, `Technical Support`, `General Assistant`. Store an explicit `corePurpose` and default task/objective; booking/tech support cannot claim operational integrations that are not connected.

**Step 4 — Agent Identity**: `AI Name` = `Sarah`; `Role` = `Customer Service Representative`; `Language` = `English`; `Accent` = `Neutral American`; `Voice` = a provider-supported verified default. Add an audio `Preview Voice` only if supported. Show just options actually available through the current provider; handle unsupported accent/language combinations without crashing.

**Step 5 — Personality & Backstory**: personality preset `Warm & Professional`, alternatives `Friendly`, `Calm`, `Energetic`, `Formal`. Prefilled, editable sample backstory: `Sarah is a friendly and experienced customer service representative who listens carefully, explains things simply, and helps customers find useful answers. She speaks naturally, without scripted or robotic phrasing.` Backstory is a fictional persona used for consistent speaking style, not a fake employment record or capability claim. Conversational tone should be natural, brief and context-sensitive.

**Step 6 — Business Knowledge & Instructions**: `Business Description`, `Products & Services`, `FAQs`, `Special Instructions`, all editable with useful demo examples. No file upload in v1. Include a clearly labeled **Skills & Capabilities** panel: `Lead Capture` and `Call Summary` enabled when implemented; `WhatsApp Report`, `External CRM`, `Advanced Scheduling`, `Knowledge File Upload` shown as `Coming Soon` (disabled, not functioning checkboxes). Optionally show a future WhatsApp number field, saved only as preference, without attempting delivery.

**Step 7 — Review, Test & Publish**: compact summary cards, `Test Call`, `Create My AI`, `Publish`. A user using demo sample values can create/test a **Demo Agent**, but it must not be presented as a verified live company. Publish real-company mode only when business identity is confirmed; allow owner to edit and publish later. After creation, show `Copy Link`, `Copy Embed Code`, `Edit Agent`, `View Calls`. No need to re-enter the whole wizard.

Per-step rules: autosave, next/back, short inline validation, selected-state presets, no Skip, safe prefilled defaults, progress `3 of 7`, submit state/loading/error/retry. Keep primary CTA above the bottom safe area, but never cover or block scrolled content or on-screen keyboard.

## 4. Premium UI/UX and responsive specifications

- Visual direction: modern Apple-like product UI, native iPhone feeling, polished rather than a generic admin panel. Use a controlled blue-violet/cyan gradient with quiet glow, floating cards, subtle borders, soft shadows, and deliberate whitespace. No excessive glassmorphism, neon text, or giant gradients that obscure inputs.
- Light theme: warm-white surfaces, dark charcoal text, soft lilac/cool-blue gradient, strong contrast. Dark theme: deep navy/near-black surfaces, cool-indigo/teal gradient, clean white text.
- Typography: system-native stack (`-apple-system`, `BlinkMacSystemFont`, `Inter`, `Segoe UI`, `sans-serif`), crisp display headings with tight tracking; body 15–17px; form inputs **>=16px**; readable labels. Do not package unlicensed font files.
- Design tokens: 8px spacing scale, 12–20px radius, 44–52px minimum touch targets, generous field heights, pill tabs/segmented controls, tasteful skeleton loading and haptics only if supported.
- Mobile layout: single-column, sticky compact header/progress bar, bottom tab navigation (`Home`, `Agents`, `Calls`, `Settings`) where appropriate; wizard uses a fixed/sticky bottom action area only if it does not trap scroll. Safe area via `env(safe-area-inset-*)`; keyboard opens without hiding inputs/actions.
- Desktop/tablet: centered max-width 480–560px for wizard; adaptive multi-column dashboard; no stretched giant cards.
- Motion: subtle 160–240ms transitions and call pulse/orb animation; honor `prefers-reduced-motion`.
- **Scrolling + zoom invariants:** `html/body` vertically scroll when needed; no global `overflow:hidden`, no `height:100vh` traps, no horizontal overflow at 320/360/375/390/430px. Avoid transforms and viewport scaling used to squeeze desktop layouts onto phones. The UI should remain full-size and not auto zoom out; permit accessibility pinch zoom.
- Real PWA: `manifest.webmanifest`, 192px/512px maskable icons, service worker with safe caching and update behavior, `display:standalone`, proper theme colors, HTTPS installability, offline shell/clear offline message. Live calls require internet and mic permission; never claim offline voice calling.
- Include user-facing states: first-use, loading, no agents, demo, published, unavailable, no calls, permission denied, offline, expired trial, quota reached, failed call and retry.

## 5. Multi-tenant domain and backend contracts

Persist structured data, preferably using these logical entities/paths (adapt paths to RTDB rules and index requirements):

- `users/{uid}`: profile, preferences, createdAt.
- `tenants/{tenantId}` and `tenantMembers/{tenantId}/{uid}`: business owner/member association, business profile, entitlement.
- `agents/{tenantId}/{agentId}`: `slug`, `name`, `role`, `corePurpose`, `language`, `accent`, `voiceId`, `tone`, `backstory`, `instructions`, `businessFacts`, `knowledge`, `status`, `isDemo`, `configVersion`, timestamps.
- `publicAgents/{slug}`: **sanitized published fields only**, never private CRM, credentials or admin notes.
- `calls/{tenantId}/{callId}`: `agentId`, provider, providerCallId, caller details if consented, startedAt, endedAt, duration, status, cost/usage if known, transcript if available, summary, classification, nextAction, events and idempotency markers.
- `leads/{tenantId}/{leadId}`: customer contact/inquiry, related call, status and timestamps.
- `knowledgeSuggestions/{tenantId}/{id}`: proposed business fact/FAQ, source call, approved/rejected state.
- `subscriptions/{tenantId}`: `trial|active|expired|suspended`, activation/expiry, quota, used minutes, concurrent cap, future plan identifier.
- `slugIndex/{slug}`: stable uniqueness mapping for routing; generate and reserve server-side.

Enforce owner/tenant access with Firebase Auth + **Realtime Database Security Rules**; require trusted server functions for admin operations, public call creation, usage counters, server-sourced transcripts/summaries and CRM writes. A public visitor must not have direct database write access to arbitrary leads/calls/usage, and tenant A must never read/write tenant B. Validate schema, inputs, timestamps, quotas and membership server-side. Use correct `.indexOn` paths for list queries. Add minimal data retention/delete controls and customer-facing consent for storing call info.

## 6. Voice infrastructure — beta Vapi, later LiveKit

- Keep **one existing Vapi master assistant ID**. Use the supported Web SDK (`@vapi-ai/web`) or preserve the verified existing SDK integration; apply each agent's dynamic persona and business context **per call**, not by creating/modifying saved Vapi assistants. Avoid hardcoding Abbie's name/ABI Tech facts into arbitrary subscribers' calls. Preserve the Abbie default persona separately. Test that master base instructions do not conflict with overrides; if one-time master configuration is required, document it explicitly, do not silently mutate Vapi.
- Backend validates published agent status, tenant subscription/quota, and call initiation. Prefer **short-lived server-issued Vapi public JWT** restricted to approved origin and the master assistant ID where the current provider supports it; provider private API key never enters the browser. Any unavoidable browser-visible overrides contain no secrets or private CRM. Add rate limits and abuse protections.
- Shared `VoiceProvider` abstraction with types and lifecycle methods: `prepareCall`, `start`, `stop`, `onStatus`, `onTranscript`, `onEnded`, `getUsage`. Implement `VapiProvider` now, reserve `LiveKitProvider` interface for later without deploying non-working LiveKit services.
- Public/embedded callers press `Talk Now`; display real states: request mic → connecting → active → ended/error; no involuntary autoplay call. Existing Abbie demonstration may retain its original flow. Provide mute/end/retry where actually supported. Cleanly release mic, timers, listeners and wake lock.
- Configure secure **Vapi server event/webhook** processing for authoritative `end-of-call-report`/transcript events. Correlate providerCallId ↔ agent/tenant, verify event authenticity by the provider-supported mechanism, handle duplicates, out-of-order callbacks, retries, missing reports. Generate/store summaries only from real transcripts/provider summaries; otherwise clearly show `Summary pending/unavailable`. Call records should not depend only on browser `beforeunload`.
- On call completion: call history + CRM entry, optional lead extraction/classification/next action using real transcript, never invent caller contact data; produce **knowledge suggestions** rather than auto-changing approved agent knowledge. New knowledge is tenant-isolated and owner-approved before being used.
- No WhatsApp API, payment API, outbound dialing, file ingestion, or phone/PSTN operations in beta.

## 7. Public URL + website widget

- Generate unique stable URL, e.g. `https://YOUR_DOMAIN/a/abc-company-sarah`; never use guessable URL as an authentication credential.
- `Copy Link`, QR/share (optional), agent preview, publish/unpublish. Unpublished/suspended/over-limit agents cannot accept new calls.
- Provide copyable **iframe/script embed snippet** that creates a floating bottom-right `Talk to Us` launcher with a compact dialog/calling UI. Implement `widget.js` or an equivalent tiny loader and an isolated iframe hosted on our domain; include proper `allow="microphone; autoplay"`, postMessage origin checks, responsive layout, open/close behavior, z-index, mobile keyboard handling, and strong defaults on external websites. Test on at least one separate-origin test page. Do not leak CRM/private configuration to the embed. A working public link is mandatory even if third-party browsers restrict embedded mic; show a fallback `Open Call Page` link.

## 8. Subscription/trial MVP

- Beta default policy **configurable**, e.g. 7-day trial / 10 total minutes / 1 concurrent call / 5-minute max call. Enforce on the backend, not merely by disabling UI buttons. Reserve capacity before call, reconcile actual usage on end event, recover abandoned sessions, display minutes remaining and quota reached. For strict spending protection, use provider-enforced maximum call duration where supported.
- Internal admin can create/extend/activate/suspend trials manually. Owners see subscription status and usage. Paid plans, recurring charges, invoices and payment provider are schema-ready but disabled; never pretend payment succeeded.

## 9. Quality gates and acceptance tests

Implement runnable build/lint/typecheck, unit tests for config validation/prompt composer/slug/usage, Firebase rules tests (including cross-tenant denial), integration tests for auth/agent save/publish/webhook idempotence, and Playwright smoke tests for key flows. No exposed secrets in build output.

Validate these **end-to-end**:
1. Register/sign in with Google or email; create tenant and draft agent.
2. All wizard fields start prefilled; all seven steps work with concise labels; no Skip; owner can create a demo without typing, then edit real info.
3. Website auto-enrichment uses only real public data and degrades gracefully on failure.
4. Two separate accounts create distinct agents; cross-tenant read/write attempts are denied by rules/functions.
5. Editing an agent **never sends a Vapi create/update assistant request**; changes apply on next call without altering another agent.
6. Public URL and cross-origin widget both render correctly; microphone permission and error handling work; a real browser test call succeeds when keys/provider are configured.
7. Completed call generates an actual tenant-scoped CRM record and accurate status/summary or explicit pending state; duplicate webhook does not duplicate record.
8. Trial quota prevents excess new calls server-side; inactive/suspended/unpublished agents refuse sessions.
9. Works at widths 320, 360, 375, 390, 430, 768, 1024, 1440px; test iOS Safari and Android Chrome behavior. Every page remains **vertically scrollable**, including long forms and while keyboard is open; no horizontal overflow, clipping or accidental zoom-out.
10. Light/dark themes, system preference, persistence, touch targets, reduced motion, PWA installability, deep-link reload, offline message and HTTPS mic access all verified.
11. Existing Talk to Abbie flow still functions.

## 10. Execution order, output, and deployment

Execute in this order without stopping at the plan: **(A)** inspect/archive original and identify correct runtime/config; **(B)** scaffold app and design system; **(C)** auth/database/rules/API; **(D)** guided wizard/agent CRUD; **(E)** dynamic voice + public calling routes; **(F)** widget; **(G)** CRM/webhooks/usage/trial; **(H)** PWA polish and all edge states; **(I)** tests and fixes; **(J)** build and deploy to the existing Firebase Hosting project if authorized/configured.

Deliver: updated full source; environment template; Firebase RTDB rules/indexes; Cloud Functions; PWA assets; tested website widget demo; setup and deploy commands; admin activation instructions; feature flags for future integrations; concise README; test evidence/results; real deployed beta URL **only if deployment actually succeeds**; otherwise a locally runnable/tested beta with exact external blockers. No placeholder buttons masquerading as complete functionality. Do not ask the user to choose trivial technical details. Do not delete the working Abbie prototype. Prioritize a real launchable vertical slice over unnecessary enterprise abstractions.

**Definition of Done:** Two owners can sign in, set up separate AI CSRs with near-zero typing, test and publish them, distribute a working URL/embed widget, receive tenant-isolated real call records, see trial usage, and operate the app as a polished installable vertically scrollable light/dark mobile PWA—while a single Vapi master assistant is reused and no Vapi assistant is created or edited per tenant.
