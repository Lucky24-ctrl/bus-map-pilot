import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useFleet } from "@/hooks/use-fleet";
import { buildNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const toneStyles = {
  info: "bg-muted-foreground",
  warning: "bg-rose-500",
  success: "bg-emerald-500",
} as const;

export function NotificationBell() {
  const { data: fleet = [] } = useFleet();
  const notifications = useMemo(() => buildNotifications(fleet), [fleet]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const unread = Math.max(0, notifications.length - seen);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          setSeen(notifications.length);
        }}
        className="relative rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-panel">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-display text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing to report — the fleet is on schedule.
              </p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneStyles[item.tone])} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
