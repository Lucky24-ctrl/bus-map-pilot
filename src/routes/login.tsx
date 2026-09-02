import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bus, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useFleet } from "@/hooks/use-fleet";
import {
  generateOtp,
  isValidPhone,
  normalisePhone,
  setSession,
  type Role,
} from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BUSSYNC" },
      {
        name: "description",
        content: "Verify your mobile number with a one-time code, then continue as passenger, driver or admin.",
      },
      { property: "og:title", content: "Sign in — BUSSYNC" },
      {
        property: "og:description",
        content: "Verify your mobile number with a one-time code, then pick how you use BUSSYNC.",
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

type Step = "phone" | "otp" | "role" | "bus";

function LoginPage() {
  const navigate = useNavigate();
  const { data: fleet = [] } = useFleet();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [code, setCode] = useState("");
  const [busId, setBusId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function sendCode() {
    if (!isValidPhone(phone)) {
      setError("Enter a valid mobile number.");
      return;
    }
    setError(null);
    setSentCode(generateOtp());
    setCode("");
    setStep("otp");
  }

  function verify() {
    if (code.trim() !== sentCode) {
      setError("That code doesn't match. Try again.");
      return;
    }
    setError(null);
    setStep("role");
  }

  function choose(role: Role) {
    if (role === "driver") {
      setStep("bus");
      return;
    }
    setSession({ phone: normalisePhone(phone), role });
    navigate({ to: role === "admin" ? "/admin" : "/passenger" });
  }

  function startDriving() {
    if (!busId) {
      setError("Select the bus you are driving.");
      return;
    }
    setSession({ phone: normalisePhone(phone), role: "driver", busId });
    navigate({ to: "/driver/tracking", search: { busId } });
  }

  return (
    <AppShell title="Sign in" subtitle="Verify your mobile number to continue.">
      <div className="mx-auto max-w-md">
        {step === "phone" ? (
          <div className="panel p-5">
            <label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 98765 43210"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={sendCode}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Send code
            </button>
          </div>
        ) : null}

        {step === "otp" ? (
          <div className="panel p-5">
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="text-foreground">{phone}</span>.
            </p>
            <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Prototype mode — your code is{" "}
              <span className="font-display text-sm font-semibold text-foreground">{sentCode}</span>
            </p>
            <input
              aria-label="One-time code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="______"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-center font-display text-lg tracking-[0.4em]"
            />
            <button
              type="button"
              onClick={verify}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Verify
            </button>
            <div className="mt-3 flex justify-between text-xs">
              <button type="button" onClick={() => setStep("phone")} className="text-muted-foreground hover:text-foreground">
                Change number
              </button>
              <button type="button" onClick={sendCode} className="text-primary">
                Resend code
              </button>
            </div>
          </div>
        ) : null}

        {step === "role" ? (
          <div className="grid gap-3">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => choose(role.id)}
                className="panel flex flex-col items-start gap-2 p-5 text-left transition-colors hover:bg-secondary"
              >
                <role.icon className="h-5 w-5 text-primary" />
                <span className="font-display text-base font-semibold">{role.label}</span>
                <span className="text-sm text-muted-foreground">{role.body}</span>
                <span className="mt-1 text-xs font-medium text-primary">
                  Continue as {role.label} →
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === "bus" ? (
          <div className="panel p-5">
            <label htmlFor="bus" className="text-xs uppercase tracking-wider text-muted-foreground">
              Which bus are you driving?
            </label>
            <select
              id="bus"
              value={busId}
              onChange={(event) => setBusId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select a bus…</option>
              {fleet.map((tracked) => (
                <option key={tracked.bus.id} value={tracked.bus.id}>
                  {tracked.bus.bus_number} — {tracked.route?.name ?? "Unassigned"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={startDriving}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Continue to driver console
            </button>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      </div>
    </AppShell>
  );
}
