// Baked-in PUBLIC backend config (publishable values only — safe to commit).
//
// Why this exists: `.env` is git-ignored, so a deploy that builds from the git
// repo (Vercel, Netlify, self-host) has no VITE_SUPABASE_* variables at build
// time. The generated Supabase client then throws while rendering, which is why
// the deployed app showed "This page didn't load".
//
// These are used as fallbacks in vite.config.ts. Real env vars, when present,
// always win. Never put secret keys (service role, API secrets) in this file.
export const PUBLIC_SUPABASE_URL = "https://mpmvkimzpqdwqygkiezr.supabase.co";
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cVpATTY-BLnak2i6MxIEeA_4bf2q6W9";
export const PUBLIC_SUPABASE_PROJECT_ID = "mpmvkimzpqdwqygkiezr";
