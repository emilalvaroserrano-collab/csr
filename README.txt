ABI Tech — Your AI Customer Care Agent (CSR SaaS Beta)

Multi-tenant AI CSR agent platform. Static frontend + Firebase (Auth + Realtime Database) + Vapi voice.

## Routes

- `/` — landing page. CTAs: "Create My AI CSR" (auth-aware) and "Try Abbie Demo".
- `/auth` — sign in / create account (email + password or Google). After auth: redirects to `/onboarding` (first agent) or `/dashboard` (returning).
- `/onboarding` — AI CSR customization form (Persona Name, Business Name, Business URL, CSR Roles & Responsibilities, CSR Description, Agent Backstory, Agent Main Goal, Voice). Creates the agent and generates a unique public slug.
- `/dashboard` — agent dashboard: status, public URL + copy, launch/test, edit, embed code, sign out.
- `/agent/<slug>` — public customized AI CSR call page (no login required). "Talk Now" starts the voice call with the customized persona.
- `/demo` and `/demo/abbie` — legacy Abbie demo lead form + call flow (`/calling.html`).

## Agent data model (Realtime Database)

- `users/{uid}` — owner profile.
- `users/{uid}/agent` — owner-scoped agent record (persona, business, roles, description, backstory, primary goal, voice, system prompt, status, slug).
- `publicAgents/{slug}` — sanitized public agent record keyed by unique public slug.

Relationships: `User UID → Business Profile → CSR Agent → Agent Configuration → Public Slug`.

## Agent generation

`js/agents.js` composes the system prompt from the base Abbie playbook plus the CUSTOM AGENT CONTEXT injected from the owner-submitted fields.

## Voice flow

`js/calling.js` resolves the call context (demo lead vs. public agent by slug) and builds Vapi assistant overrides per call.

## Required external configuration

- Firebase: enable Email/Password + Google auth providers; update Realtime Database rules for `users`, `users/$uid/agent`, `publicAgents`, and existing `leads` paths.
- Vapi: master assistant (public key + assistant ID) reused; per-call persona overrides applied.
- Firebase Hosting: deploy with rewrites defined in `firebase.json`.
- Authorized domain must be added in Firebase Auth > Settings > Authorized domains for Google auth + HTTPS mic access.

## Local run

No build step. Serve statically, e.g. `python3 -m http.server`, then open pages. Production must be served over HTTPS.
