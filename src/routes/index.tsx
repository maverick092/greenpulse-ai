import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Camera, LineChart, Leaf, ShieldCheck, Sparkle } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import logo from "@/assets/greenpulse-logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GreenPulse AI — Report, Analyse, Resolve Campus Sustainability" },
      {
        name: "description",
        content:
          "GreenPulse AI lets students report campus sustainability issues in seconds while AI detects the issue, scores severity and estimates environmental impact.",
      },
      { property: "og:title", content: "GreenPulse AI — Smart Campus. Green Future." },
      {
        property: "og:description",
        content: "Report sustainability issues, let AI analyse them, and create real environmental impact.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Camera,
    title: "Report in 20 seconds",
    body: "Snap a photo, drop a location, and you're done. No forms, no follow-ups, no friction.",
  },
  {
    icon: Bot,
    title: "AI does the analysis",
    body: "GreenPulse detects the issue, scores severity and estimates the environmental impact instantly.",
  },
  {
    icon: LineChart,
    title: "Impact you can measure",
    body: "Track litres of water, kWh of energy and kilograms of CO₂ saved across your campus.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="GreenPulse AI logo" width={38} height={38} className="h-9 w-9" />
          <div>
            <p className="font-display text-base font-bold leading-none">GreenPulse AI</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Smart Campus. Green Future.</p>
          </div>
        </div>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-8 pt-6 lg:grid-cols-2 lg:pt-12">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <Sparkle className="h-3.5 w-3.5" /> AI-powered campus sustainability
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] lg:text-6xl">
            Let's Build a <span className="text-gradient-primary">Greener Campus</span> Together
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground lg:text-lg">
            Report sustainability issues, let AI analyze them, and create real environmental impact.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-12 rounded-full bg-gradient-primary px-6 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Link to="/auth">
                Report Issue <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-full border-border bg-card px-6 text-base">
              <Link to="/auth">View My Reports</Link>
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Private by default
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Leaf className="h-4 w-4 text-primary" /> Built for student communities
            </span>
          </div>
        </div>

        <div className="animate-rise relative">
          <div className="overflow-hidden rounded-4xl border border-border/70 shadow-lifted">
            <img
              src={heroImage}
              alt="Illustration of a green campus with solar panels, trees and students cycling"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="surface-glass animate-float-slow absolute -bottom-6 left-4 rounded-2xl px-4 py-3 lg:left-10">
            <p className="text-[11px] font-medium text-muted-foreground">AI detected</p>
            <p className="font-display text-sm font-bold">Water Leakage · 96%</p>
            <p className="text-[11px] text-muted-foreground">Est. 50 L/day saved</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="surface-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-mint">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <div className="rounded-4xl bg-gradient-primary p-10 text-center text-primary-foreground shadow-glow">
          <h2 className="font-display text-2xl font-bold lg:text-3xl">Your campus is one report away from better</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">
            Join students turning everyday observations into measurable environmental impact.
          </p>
          <Button asChild variant="secondary" className="mt-6 h-12 rounded-full px-7 text-base font-semibold">
            <Link to="/auth">Get started free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-7 text-center text-xs text-muted-foreground">
        GreenPulse AI · Smart Campus. Green Future.
      </footer>
    </div>
  );
}
