import { createFileRoute, Outlet, redirect, useRouter, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/_authenticated")({
  // Supabase persists the session in localStorage, which the server cannot read.
  ssr: false,
  beforeLoad: async () => {
    // getSession() reads the PERSISTED session first (and refreshes it if needed),
    // so a refresh never bounces a signed-in user to /auth — and a transient
    // network failure does not either.
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error("[auth] session restore failed", error);
    if (!data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  ),
  errorComponent: AppErrorFallback,
  notFoundComponent: () => (
    <AppShell>
      <div className="surface-card mx-auto mt-10 max-w-md p-10 text-center">
        <h1 className="font-display text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist or has moved.</p>
        <Link to="/home" className="mt-6 inline-flex text-sm font-semibold text-primary">
          Back to dashboard
        </Link>
      </div>
    </AppShell>
  ),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

function AppErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[greenpulse] route error", error);
    reportLovableError(error, { boundary: "authenticated_layout" });
  }, [error]);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const message = offline
    ? "You appear to be offline. Reconnect and try again."
    : /fetch|network|Failed to fetch/i.test(error.message)
      ? "We couldn't reach the GreenPulse servers. This is usually a temporary network issue."
      : /jwt|auth|session|401/i.test(error.message)
        ? "Your session expired. Please sign in again to continue."
        : "Something went wrong loading this screen. Your data is safe.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="surface-card max-w-md p-10 text-center">
        <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-xl font-semibold">This screen didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <p className="mt-3 break-words text-[11px] text-muted-foreground/70">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Try again
          </button>
          <Link
            to="/auth"
            className="rounded-full border border-input bg-card px-5 py-2.5 text-sm font-medium"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </div>
  );
}
