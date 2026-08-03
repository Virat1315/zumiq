/**
 * Small presentational primitives, in the shadcn spirit: plain components over
 * Tailwind classes, no runtime styling library. Hand-written rather than
 * generated because the set is small and the project is meant to stay readable.
 */

import { cn } from "@/lib/format";
import type { ReactNode } from "react";
import type { Severity, IncidentStatus } from "@/lib/data/types";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-12px_rgba(0,0,0,0.7)]", className)}>
      {children}
    </div>
  );
}

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
        {sub && <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Headline number tile. `tone` colours only the delta line, never the value. */
export function Stat({
  label, value, delta, tone = "flat",
}: {
  label: string; value: string; delta?: string; tone?: "up" | "down" | "flat" | "good" | "bad";
}) {
  const toneClass = {
    up: "text-[var(--color-ok)]",
    good: "text-[var(--color-ok)]",
    down: "text-[var(--color-bad)]",
    bad: "text-[var(--color-bad)]",
    flat: "text-[var(--color-muted)]",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-b from-[var(--color-surface)] to-[#0f1829] p-4">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] opacity-55" />
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold leading-tight tracking-tight">{value}</div>
      {delta && <div className={cn("mt-1 text-[11.5px] font-semibold", toneClass)}>{delta}</div>}
    </div>
  );
}

const BADGE_TONES = {
  green: "bg-[rgba(52,211,153,0.14)] text-[var(--color-ok)] border-[rgba(52,211,153,0.26)]",
  red: "bg-[rgba(248,113,113,0.14)] text-[var(--color-bad)] border-[rgba(248,113,113,0.26)]",
  amber: "bg-[rgba(251,191,36,0.14)] text-[var(--color-warn)] border-[rgba(251,191,36,0.26)]",
  blue: "bg-[rgba(34,211,238,0.14)] text-[var(--color-accent)] border-[rgba(34,211,238,0.26)]",
  gray: "bg-[rgba(143,163,196,0.13)] text-[var(--color-muted)] border-[rgba(143,163,196,0.22)]",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide",
      BADGE_TONES[tone],
    )}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone: BadgeTone = severity === "P1" ? "red" : severity === "P2" ? "amber" : "gray";
  return <Badge tone={tone}>{severity}</Badge>;
}

/** Resolved is deliberately green and everything unresolved is not. */
export function StatusBadge({ status }: { status: IncidentStatus }) {
  const tone: BadgeTone =
    status === "Resolved" ? "green"
      : status === "Mitigated" ? "blue"
        : status === "Investigating" ? "amber"
          : "red";
  return <Badge tone={tone}>{status}</Badge>;
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6 border-b border-[var(--color-line-soft)] pb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1.5 max-w-[68ch] text-sm text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}

/** Thin horizontal meter used for scores out of 100. */
export function Meter({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: "accent" | "ok" | "warn" | "bad" }) {
  const bar = {
    accent: "bg-[var(--color-accent)]",
    ok: "bg-[var(--color-ok)]",
    warn: "bg-[var(--color-warn)]",
    bad: "bg-[var(--color-bad)]",
  }[tone];
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${width}%` }} />
    </div>
  );
}
