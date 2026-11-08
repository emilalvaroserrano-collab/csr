# Vercel Deployment Fix

## Problem
404 errors on `/auth`, `/onboarding`, `/dashboard`, `/agent/{slug}`, `/demo` routes.

## Cause
Vercel doesn't know about your custom HTML routes. By default, it only serves `index.html`.

## Solution
I've created `vercel.json` with all the route redirects. Deploy this to fix 404s.

## Steps to Deploy

### 1. Add vercel.json to your project
The file is already at `/Volumes/1TB-extended/cs-emil/vercel.json`.

### 2. Deploy to Vercel
```bash
# From the project root
vercel
# Or for production:
vercel --prod
```

### 2a. Or via GitHub integration
1. Connect your GitHub repo to Vercel
2. Add a `vercel.json` file at the root
3. Deploy

### 3. Route mapping after deploy
All routes will now work:
- `https://your-site.vercel.app/` → Landing page
- `https://your-site.vercel.app/auth` → Auth sign-in
- `https://your-site.vercel.app/onboarding` → CSR customization form
- `https://your-site.vercel.app/dashboard` → Agent dashboard
- `https://your-site.vercel.app/agent/{slug}` → Public CSR call page
- `https://your-site.vercel.app/demo` / `abbie` → Legacy demo

## Important Notes

### Firebase Backend still needed
Vercel only hosts the static frontend. You still need:
- Firebase project with Auth (Email/Password + Google) enabled
- Realtime Database configured (for leads and agent data)
- Firebase config updated with your Vercel deployment URL in `js/firebase.js` (or keep the existing config if using anonymous auth + existing RTDB rules)

### CORS / Authorized Domains
Add your Vercel URL to Firebase Console:
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add: `https://*.vercel.app` or your specific domain

### Environment variables (if needed)
No build step. All config is in `js/config.js` (browser-safe public keys only).

### Files changed
- **Added:** `vercel.json` — Route redirects for all new pages

### Unchanged
- `js/firebase.js` — Firebase client config (keep as-is for anonymous auth)
- `js/calling.js` — Voice call logic
- All HTML, CSS, JS files remain the same

## Verify deployment
After deploying, test these URLs:
- `/` — Should show ABI Tech landing page
- `/auth` — Should show sign-in page
- `/onboarding` — Should show CSR builder form
- `/dashboard` — Should show agent dashboard (requires auth)
- `/agent/test-slug` — Should show public CSR call page
- `/demo` / `/demo/abbie` — Should show Abbie demo

All 404 errors should now be resolved.