import Link from "next/link";
import { data } from "@/lib/data";
import { Badge, Card, CardHead, Meter, PageTitle, SeverityBadge, Stat, StatusBadge } from "@/components/ui";
import { isoDate, isoDateTime, money, moneyCompact, pct, signedPct } from "@/lib/format";

export default async function HomePage() {
  const [health, incidents, activity] = await Promise.all([
    data.getPlatformHealth(),
    data.listIncidents(),
    data.getRecentActivity(),
  ]);

  // Unresolved work, worst first. This ordering is what makes the page usable
  // as a morning triage view rather than a list of everything that ever broke.
  const rank = { Open: 0, Investigating: 1, Mitigated: 2, Resolved: 3 } as const;
  const open = incidents
    .filter((i) => i.status !== "Resolved")
    .sort((a, b) =>
      rank[a.status] - rank[b.status] ||
      a.severity.localeCompare(b.severity) ||
      b.openedAt.localeCompare(a.openedAt));

  return (
    <>
      <PageTitle
        title="Platform Home"
        sub={`Enterprise health, quality, reliability and cost in one view. Data as of ${isoDate(health.asOf)}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Enterprise KPI Score" value={pct(health.enterpriseKpiScore)} delta="composite of 8 certified KPIs" tone="flat" />
        <Stat label="Data Quality Score" value={pct(health.dataQualityScore)} delta={health.dataQualityScore >= 97 ? "at target" : "below 97% target"} tone={health.dataQualityScore >= 97 ? "good" : "bad"} />
        <Stat label="Pipeline Success" value={pct(health.pipelineSuccessRate)} delta={health.pipelineSuccessRate >= 98 ? "at target" : "below 98% target"} tone={health.pipelineSuccessRate >= 98 ? "good" : "bad"} />
        <Stat label="Data Freshness" value={`${health.freshnessMinutes} min`} delta="max lag across certified tables" tone={health.freshnessMinutes <= 15 ? "good" : "bad"} />
        <Stat label="Open Incidents" value={String(health.openIncidents)} delta={`${health.p1Incidents} at P1`} tone={health.p1Incidents > 0 ? "bad" : "good"} />
        <Stat label="Alerts Today" value={String(health.alertsToday)} delta="after severity routing" tone="flat" />
        <Stat label="Cloud Cost Today" value={money(health.cloudCostTodayUsd)} delta={`${signedPct(health.cloudCostTrendPct)} vs 14-day median`} tone={health.cloudCostTrendPct > 25 ? "bad" : "flat"} />
        <Stat label="Business Impact" value={moneyCompact(health.businessImpactUsd)} delta="unresolved exposure" tone={health.businessImpactUsd > 0 ? "bad" : "good"} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Open incidents"
            sub="Everything not yet resolved, worst status first. This is the morning triage list."
            right={<Link href="/incidents" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">View all</Link>}
          />
          <div className="flex flex-col divide-y divide-[var(--color-line-soft)]">
            {open.map((i) => (
              <Link key={i.id} href={`/incidents/${i.id}`} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-none gap-1.5 pt-0.5">
                  <SeverityBadge severity={i.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold group-hover:text-[var(--color-accent)]">
                    {i.id} · {i.title}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--color-muted)]">{i.summary}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-faint)]">
                    <StatusBadge status={i.status} />
                    <span>{i.owner.team}</span>
                    <span>·</span>
                    <span>opened {isoDate(i.openedAt)}</span>
                    {i.businessImpactUsd !== null && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--color-bad)]">{moneyCompact(i.businessImpactUsd)} exposure</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Quick actions" sub="The things an operator does most often." />
            <div className="flex flex-col gap-2">
              <Link href="/incidents?severity=P1" className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors hover:border-[rgba(34,211,238,0.32)] hover:text-[var(--color-accent)]">
                Triage P1 incidents
              </Link>
              <Link href="/simulator" className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors hover:border-[rgba(34,211,238,0.32)] hover:text-[var(--color-accent)]">
                Model an operating change
              </Link>
              <a href="/web/quality.html" className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors hover:border-[rgba(34,211,238,0.32)] hover:text-[var(--color-accent)]">
                Review data quality scores
              </a>
              <a href="/web/playground.html" className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors hover:border-[rgba(34,211,238,0.32)] hover:text-[var(--color-accent)]">
                Open the SQL playground
              </a>
            </div>
          </Card>

          <Card>
            <CardHead title="Quality by dimension" sub="Rows-weighted across six certified data products." />
            <div className="flex flex-col gap-3">
              {[
                { label: "Completeness", value: 94.2 },
                { label: "Validity", value: 98.6 },
                { label: "Uniqueness", value: 99.1 },
                { label: "Freshness", value: 96.0 },
              ].map((d) => (
                <div key={d.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                    <span className="text-[var(--color-muted)]">{d.label}</span>
                    <span className="font-semibold">{pct(d.value)}</span>
                  </div>
                  <Meter value={d.value} tone={d.value >= 97 ? "ok" : d.value >= 90 ? "warn" : "bad"} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHead title="Recent activity" sub="Every certification, rule change and resolution is auditable." />
        <div className="flex flex-col divide-y divide-[var(--color-line-soft)]">
          {activity.map((a, idx) => (
            <div key={idx} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-[12.5px] first:pt-0 last:pb-0">
              <span className="font-semibold">{a.actor}</span>
              <span className="text-[var(--color-muted)]">{a.action}</span>
              <span className="text-[var(--color-ink-2)]">{a.target}</span>
              <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--color-faint)]">{isoDateTime(a.at)}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-5 text-[11.5px] text-[var(--color-muted)]">
        Figures come from a seeded demo warehouse with deliberately planted anomalies, so the incident
        and quality pages have something real to detect. <Badge tone="gray">synthetic data</Badge>
      </p>
    </>
  );
}
