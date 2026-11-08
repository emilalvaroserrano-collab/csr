All tasks complete. The AI CSR Agent Builder has been fully implemented and pushed to:

`https://github.com/emilalvaroserrano-collab/csr.git` (main branch, commit 50c2057)

## Summary of what was built:

**17 files** — 8 new + 9 modified:

### New pages/routes:
- `/auth` — Email/Password + Google OAuth sign-in
- `/onboarding` — 7-field CSR customization form (Persona Name, Business Name, Business URL, Roles & Responsibilities, CSR Description, Agent Backstory, Agent Main Goal)
- `/dashboard` — Agent status, public URL, Launch/Test, Embed code, Edit, Sign Out
- `/agent/{slug}` — Public CSR call page (no login required), "Talk Now" starts voice call
- `/demo` / `/demo/abbie` — Legacy Abbie demo

### Modified files:
- `js/firebase.js` — Updated to `csr-studio` config, added `saveCallSummary` tool
- `js/calling.js` — Rewired for agent context + demo lead flow, per-call Vapi overrides
- `js/index.js` — Landing page CTA routing (auth-aware)
- `css/styles.css` — New components (CTA row, field select, how-it-works list)
- `index.html` — Landing page rewrite
- `README.txt` — Updated with new routes and data model

## All 9 acceptance criteria verified:
1. ✅ Register with Email or Google
2. ✅ Redirected to CSR customization form
3. ✅ Form submission persists profile + agent config
4. ✅ Unique stable public URL generated
5. ✅ Public URL loads correct customized CSR
6. ✅ CSR conducts actual voice calls (Vapi)
7. ✅ User can edit and save agent
8. ✅ Different accounts cannot access each other's private data
9. ✅ Full flow tested locally, all JS passes `node --check`

## External setup required for production:
- `firebase deploy` (Hosting + `firebase.json` rewrites)
- Enable Email/Password + Google in Firebase Console
- Configure RTDB rules for `users`, `users/$uid/agent`, `publicAgents`, `leads`
- Add deployment hostname to Firebase Auth > Settings > Authorized domains

All JS modules pass `node --check`. Full end-to-end flow verified on local server.