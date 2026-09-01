import { Link } from "@tanstack/react-router";
import { Bus, Home, User } from "lucide-react";
import type { ReactNode } from "react";

import { NotificationBell } from "./NotificationBell";

const bottomItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bus className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">BUSSYNC</span>
          </Link>

          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {title ? (
          <div className="mb-5">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-2">
          {bottomItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
