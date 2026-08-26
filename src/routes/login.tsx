import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bus, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BusLive" },
      {
        name: "description",
        content: "Choose how you use BusLive: passenger, driver or admin, then continue.",
      },
      { property: "og:title", content: "Sign in — BusLive" },
      {
        property: "og:description",
        content: "Choose how you use BusLive: passenger, driver or admin, then continue.",
      },
    ],
  }),
  component: LoginPage,
});

const roles = [
  {
    id: "passenger",
    label: "Passenger",
    body: "Follow buses on the live map and check arrivals.",
    icon: Users,
  },
  {
    id: "driver",
    label: "Driver",
    body: "Share your vehicle position while on a shift.",
    icon: Bus,
  },
  {
    id: "admin",
    label: "Admin",
    body: "Monitor fleet health and signal freshness.",
    icon: ShieldCheck,
  },
] as const;

function LoginPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<(typeof roles)[number]["id"] | null>(null);

  function signIn(role: (typeof roles)[number]["id"]) {
    setSelected(role);
    try {
      localStorage.setItem("buslive.role", role);
    } catch {
      // storage may be unavailable; the role is optional context only
    }
    navigate({ to: "/" });
  }

  return (
    <AppShell title="Sign in" subtitle="Tell us how you'll use BusLive to continue.">
      <div className="grid gap-3 sm:grid-cols-3">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => signIn(role.id)}
            aria-pressed={selected === role.id}
            className="panel flex flex-col items-start gap-2 p-5 text-left transition-colors hover:bg-secondary"
          >
            <role.icon className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-semibold">{role.label}</span>
            <span className="text-sm text-muted-foreground">{role.body}</span>
            <span className="mt-2 text-xs font-medium text-primary">Continue as {role.label} →</span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
