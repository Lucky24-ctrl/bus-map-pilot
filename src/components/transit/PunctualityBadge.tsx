import type { Punctuality } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const styles: Record<Punctuality["status"], string> = {
  "on-time": "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  delayed: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  early: "border-sky-500/40 bg-sky-500/10 text-sky-400",
};

export function PunctualityBadge({
  value,
  className,
}: {
  value: Punctuality;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        styles[value.status],
        className,
      )}
    >
      {value.label}
    </span>
  );
}
