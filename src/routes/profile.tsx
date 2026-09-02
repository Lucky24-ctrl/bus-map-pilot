import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Phone, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useFleet } from "@/hooks/use-fleet";
import { useSession } from "@/hooks/use-session";
import { clearSession } from "@/lib/session";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — BUSSYNC" },
      {
        name: "description",
        content: "See the mobile number you signed in with, your role and shortcuts to your screens.",
      },
      { property: "og:title", content: "Your profile — BUSSYNC" },
      {
        property: "og:description",
        content: "Your BUSSYNC role, verified number and quick links.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const session = useSession();
  const navigate = useNavigate();
  const { data: fleet = [] } = useFleet();
  const bus = fleet.find((item) => item.bus.id === session?.busId) ?? null;

  if (!session) {
    return (
      <AppShell title="Profile" subtitle="You're not signed in yet.">
        <div className="panel max-w-md p-5">
          <p className="text-sm text-muted-foreground">
            Verify your mobile number to continue as a passenger, driver or admin.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile" subtitle="Your BUSSYNC account details.">
      <div className="grid max-w-md gap-3">
        <div className="panel flex items-center gap-3 p-5">
          <Phone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mobile</p>
            <p className="font-display text-base font-semibold">{session.phone}</p>
          </div>
        </div>

        <div className="panel flex items-center gap-3 p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Role</p>
            <p className="font-display text-base font-semibold capitalize">{session.role}</p>
            {bus ? (
              <p className="text-xs text-muted-foreground">
                Driving {bus.bus.bus_number} · {bus.route?.name ?? "Unassigned"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/passenger" className="rounded-lg border border-border px-4 py-2 text-sm">
            Live map
          </Link>
          <Link to="/driver" className="rounded-lg border border-border px-4 py-2 text-sm">
            Driver
          </Link>
          <Link to="/admin" className="rounded-lg border border-border px-4 py-2 text-sm">
            Admin
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            clearSession();
            navigate({ to: "/login" });
          }}
          className="panel flex items-center justify-center gap-2 p-3 text-sm font-medium text-rose-400"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}
