// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import {
  PUBLIC_SUPABASE_PROJECT_ID,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "./src/lib/public-config";

// Fallbacks for builds that run outside Lovable (e.g. Vercel from git), where
// `.env` is absent because it is git-ignored. Real env vars always win.
const publicFallbacks: Record<string, string> = {
  VITE_SUPABASE_URL: PUBLIC_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: PUBLIC_SUPABASE_PROJECT_ID,
  SUPABASE_URL: PUBLIC_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_PROJECT_ID: PUBLIC_SUPABASE_PROJECT_ID,
};

const define: Record<string, string> = {};
for (const [key, value] of Object.entries(publicFallbacks)) {
  if (process.env[key]) continue;
  const literal = JSON.stringify(value);
  define[key.startsWith("VITE_") ? `import.meta.env.${key}` : `process.env.${key}`] = literal;
  
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { define },
});
