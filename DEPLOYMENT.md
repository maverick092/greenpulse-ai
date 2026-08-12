# Deploying GreenPulse AI

This app is a **TanStack Start (SSR)** app. It is not a static SPA, so it needs a
server runtime. There is no `_redirects` / SPA-fallback needed — routes such as
`/`, `/home`, `/reports`, `/analytics`, `/profile`, `/messages` are resolved by the
server, and refreshing any of them works.

## Recommended: Lovable hosting

Click **Publish** in Lovable. Backend env vars (Supabase URL/keys, the AI gateway
key, service role key) are injected automatically. Nothing to configure.

## Vercel

`vercel.json` in the repo already sets the correct server build preset
(`NITRO_PRESET=vercel`) so the SSR handler is deployed instead of a static-only
output. That was the cause of the "This page didn't load" screen together with
missing env vars.

Public backend config (project URL + publishable key) is baked in through
`src/lib/public-config.ts`, so the app boots even when `.env` is not committed.

For the features that need **server secrets**, add these in
Vercel → Project → Settings → Environment Variables (they cannot be baked in):

| Variable | Needed for |
| --- | --- |
| `LOVABLE_API_KEY` | AI report analysis + GreenBot assistant |
| `SUPABASE_SERVICE_ROLE_KEY` | privileged/admin server operations |
| `SUPABASE_URL` | optional override (defaults to baked-in value) |
| `SUPABASE_PUBLISHABLE_KEY` | optional override |

Without `LOVABLE_API_KEY` the AI endpoints return a friendly error instead of
crashing; the rest of the app works.

## Auth notes

- The Supabase session is persisted in `localStorage` and restored before any
  redirect: the protected layout (`src/routes/_authenticated/route.tsx`) is
  `ssr: false` and awaits `supabase.auth.getUser()` in `beforeLoad`.
- `/auth` redirects already-signed-in users into the app, so there are no
  redirect loops.
