"use client";

/**
 * Filterable incident table.
 *
 * Filtering happens in the browser over an already-fetched list. That is the
 * right trade at this size: the incident register is in the hundreds, not the
 * millions, and a round trip per keystroke would feel worse than it reads.
 * A warehouse-backed build would push search server-side once the register
 * outgrows a single response.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Incident, Severity, IncidentStatus } from "@/lib/data/types";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui";
import { isoDate, moneyCompact } from "@/lib/format";

const SEVERITIES: (Severity | "All")[] = ["All", "P1", "P2", "P3"];
const STATUSES: (IncidentStatus | "All")[] = ["All", "Open", "Investigating", "Mitigated", "Resolved"];

export function IncidentList({
  incidents,
  initialSeverity = "All",
}: {
  incidents: Incident[];
  initialSeverity?: Severity | "All";
}) {
  const [severity, setSeverity] = useState<Severity | "All">(initialSeverity);
  const [status, setStatus] = useState<IncidentStatus | "All">("All");
  const [domain, setDomain] = useState<string>("All");
  const [q, setQ] = useState("");

  const domains = useMemo(
    () => ["All", ...Array.from(new Set(incidents.map((i) => i.domain))).sort()],
    [incidents],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return incidents.filter((i) => {
      if (severity !== "All" && i.severity !== severity) return false;
      if (status !== "All" && i.status !== status) return false;
      if (domain !== "All" && i.domain !== domain) return false;
      if (!needle) return true;
      // Search across the fields someone would actually recall: the title, the
      // id, the owning team, and the affected tables.
      return (
        i.title.toLowerCase().includes(needle) ||
        i.id.toLowerCase().includes(needle) ||
        i.summary.toLowerCase().includes(needle) ||
        i.owner.name.toLowerCase().includes(needle) ||
        i.owner.team.toLowerCase().includes(needle) ||
        i.affectedDatasets.some((d) => d.toLowerCase().includes(needle)) ||
        i.affectedKpis.some((k) => k.toLowerCase().includes(needle))
      );
    });
  }, [incidents, severity, status, domain, q]);

  const exposure = filtered.reduce((a, i) => a + (i.businessImpactUsd ?? 0), 0);

  const selectClass =
    "rounded-lg border border-[var(--color-line)] bg-[#0d1526] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Search</label>
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, owner, KPI or table"
            className={selectClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sev" className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Severity</label>
          <select id="sev" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "All")} className={selectClass}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus | "All")} className={selectClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="domain" className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Domain</label>
          <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px] text-[var(--color-muted)]">
        <span>
          Showing <b className="text-[var(--color-ink)]">{filtered.length}</b> of {incidents.length} incidents
        </span>
        {exposure > 0 && (
          <span>
            Quantified exposure in view: <b className="text-[var(--color-bad)]">{moneyCompact(exposure)}</b>
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">
            No incidents match these filters.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-line-soft)]">
            {filtered.map((i) => (
              <Link key={i.id} href={`/incidents/${i.id}`} className="group flex flex-wrap items-start gap-x-3 gap-y-2 p-4 transition-colors hover:bg-[rgba(34,211,238,0.04)]">
                <div className="flex flex-none gap-1.5">
                  <SeverityBadge severity={i.severity} />
                  <StatusBadge status={i.status} />
                </div>
                <div className="min-w-[240px] flex-1">
                  <div className="text-[13.5px] font-semibold group-hover:text-[var(--color-accent)]">
                    {i.id} · {i.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">{i.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--color-faint)]">
                    <Badge tone="blue">{i.domain}</Badge>
                    <span>{i.owner.name}, {i.owner.team}</span>
                    <span>·</span>
                    <span>opened {isoDate(i.openedAt)}</span>
                    {i.resolvedAt && <><span>·</span><span>resolved {isoDate(i.resolvedAt)}</span></>}
                  </div>
                </div>
                <div className="w-24 flex-none text-right">
                  {i.businessImpactUsd !== null ? (
                    <>
                      <div className="text-[13px] font-bold text-[var(--color-bad)]">{moneyCompact(i.businessImpactUsd)}</div>
                      <div className="text-[10.5px] text-[var(--color-faint)]">exposure</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-[var(--color-faint)]">not quantified</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
