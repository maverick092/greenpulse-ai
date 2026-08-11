import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Leaf, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import logo from "@/assets/greenpulse-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GreenPulse AI" },
      {
        name: "description",
        content: "Sign in or create your GreenPulse AI account to report campus sustainability issues.",
      },
      { property: "og:title", content: "Sign in — GreenPulse AI" },
      { property: "og:description", content: "Join GreenPulse AI and start building a greener campus." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/home" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { full_name: fullName, college },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      setAwaitingConfirm(true);
      return;
    }
    navigate({ to: "/home" });
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      return toast.error("Google sign-in failed. Please try again.");
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-10">
      <Leaf className="animate-float-slow absolute -left-10 top-16 h-40 w-40 text-primary/10" />
      <Leaf className="animate-float-slow absolute -right-8 bottom-10 h-52 w-52 text-primary/10" />

      <div className="animate-rise surface-glass w-full max-w-md rounded-3xl p-7">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="GreenPulse AI" width={56} height={56} className="h-14 w-14" />
          <h1 className="mt-3 font-display text-2xl font-bold">GreenPulse AI</h1>
          <p className="text-sm text-muted-foreground">Smart Campus. Green Future.</p>
        </div>

        {awaitingConfirm ? (
          <div className="mt-8 rounded-2xl bg-accent p-5 text-center">
            <p className="font-semibold text-accent-foreground">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to {email}. Confirm it to activate your account.
            </p>
            <Button variant="ghost" className="mt-3" onClick={() => setAwaitingConfirm(false)}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="login" className="mt-7">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1">
              <TabsTrigger value="login" className="rounded-full">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Harsh Sharma"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="college">College</Label>
                  <Input
                    id="college"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="Green Valley Institute of Technology"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {!awaitingConfirm && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="h-11 w-full rounded-xl border-border bg-card"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.1 7.1 0 0 1 0-4.6V6.7H1.4a11.9 11.9 0 0 0 0 10.7l4-3Z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 11.9 11.9 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8Z" />
              </svg>
              Continue with Google
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="font-medium text-primary">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
