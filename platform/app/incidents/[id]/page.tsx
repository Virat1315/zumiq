import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Badge, Card, CardHead, SeverityBadge, StatusBadge } from "@/components/ui";
import { daysBetween, isoDate, isoDateTime, moneyCompact } from "@/lib/format";

/** Pre-render every incident at build time: the register is small and static. */
export async function generateStaticParams() {
  const incidents = await data.listIncidents();
  return incidents.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await data.getIncident(id);
  return { title: incident ? `${incident.id} ${incident.title} | ZUMIQ` : "Incident | ZUMIQ" };
}

import type { BadgeTone } from "@/components/ui";

/** Timeline entry kind to badge colour. Typed so a new kind cannot slip in
    with a tone the Badge component does not accept. */
const KIND_TONE: Record<string, BadgeTone> = {
  detected: "red",
  triaged: "amber",
  investigated: "blue",
  mitigated: "blue",
  resolved: "green",
  note: "gray",
};

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await data.getIncident(id);
  if (!incident) notFound();

  const ageDays = daysBetween(incident.openedAt, incident.resolvedAt ?? "2026-07-14T23:59:00Z");

  return (
    <>
      <Link href="/incidents" className="mb-4 inline-block text-xs font-semibold text-[var(--color-accent)] hover:underline">
        Back to Incident Center
      </Link>

      <div className="mb-6 border-b border-[var(--color-line-soft)] pb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          <Badge tone="blue">{incident.domain}</Badge>
          <span className="font-mono text-[11.5px] text-[var(--color-faint)]">{incident.id}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
        <p className="mt-2 max-w-[72ch] text-sm text-[var(--color-muted)]">{incident.summary}</p>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHead title="Ownership" />
          <dl className="flex flex-col gap-2.5 text-[12.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">Owner</dt>
              <dd className="text-right font-semibold">{incident.owner.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">Team</dt>
              <dd className="text-right">{incident.owner.team}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">Detected by</dt>
              <dd className="text-right">{incident.detectedBy}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHead title="Timing" />
          <dl className="flex flex-col gap-2.5 text-[12.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">Opened</dt>
              <dd className="text-right">{isoDate(incident.openedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">Resolved</dt>
              <dd className="text-right">{incident.resolvedAt ? isoDate(incident.resolvedAt) : "Still open"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">{incident.resolvedAt ? "Time to resolve" : "Open for"}</dt>
              <dd className="text-right font-semibold">{ageDays} {ageDays === 1 ? "day" : "days"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHead title="Business impact" />
          {incident.businessImpactUsd !== null ? (
            <>
              <div className="text-2xl font-bold text-[var(--color-bad)]">{moneyCompact(incident.businessImpactUsd)}</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                Quantified exposure. Where an incident cannot be costed honestly it is left unquantified
                rather than estimated.
              </p>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Not quantified. The damage here was to trust and decision quality rather than to a line
              in the ledger, and inventing a number would be worse than leaving it blank.
            </p>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Root cause" />
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-2)]">{incident.rootCause}</p>
        </Card>
        <Card>
          <CardHead title="Resolution" />
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-2)]">{incident.resolution}</p>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHead title="Timeline" sub="The full audit trail, from detection to resolution." />
        <ol className="flex flex-col">
          {incident.timeline.map((t, idx) => (
            <li key={idx} className="relative flex gap-4 pb-5 last:pb-0">
              <div className="relative flex flex-none flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[var(--color-accent)]" />
                {idx < incident.timeline.length - 1 && (
                  <span className="absolute top-4 h-full w-px bg-[var(--color-line)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND_TONE[t.kind]}>{t.kind}</Badge>
                  <span className="text-[12.5px] font-semibold">{t.actor}</span>
                  <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--color-faint)]">{isoDateTime(t.at)}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">{t.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Affected KPIs" sub="Metrics whose reported values moved because of this incident." />
          <div className="flex flex-wrap gap-2">
            {incident.affectedKpis.map((k) => <Badge key={k} tone="amber">{k}</Badge>)}
          </div>
        </Card>
        <Card>
          <CardHead title="Affected datasets" sub="Warehouse objects implicated, for lineage and blast radius." />
          <div className="flex flex-col gap-1.5">
            {incident.affectedDatasets.map((d) => (
              <code key={d} className="rounded-md bg-[#0d1526] px-2.5 py-1.5 font-mono text-[11.5px] text-[var(--color-accent)]">{d}</code>
            ))}
          </div>
        </Card>
      </div>

      <p className="mt-5 text-[12px] text-[var(--color-muted)]">
        Full write-up:{" "}
        <a
          className="font-semibold text-[var(--color-accent)] hover:underline"
          href={`https://github.com/Virat1315/zumiq/blob/main/docs/scenarios/${incident.doc}`}
          target="_blank"
          rel="noopener"
        >
          docs/scenarios/{incident.doc}
        </a>
      </p>
    </>
  );
}
