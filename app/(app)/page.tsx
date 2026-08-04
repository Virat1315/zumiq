import Link from "next/link";
import { ArrowUpRight, Activity, AlertTriangle, CircleDollarSign, Target, ShieldCheck, LifeBuoy, Flame } from "lucide-react";
import { seedData } from "@/lib/data/core";
import { storeApi } from "@/lib/data/store";
import { INCIDENTS, ACTIVITY, ROLE_LABELS } from "@/lib/data/enterprise";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, BarChart } from "@/components/ui/charts";
import { formatCompact, formatMoney, timeAgo } from "@/lib/utils";

const SEV_VARIANT = { P1: "destructive", P2: "warning", P3: "secondary" } as const;
const KPI_STATUS_VARIANT = { BREACH: "destructive", WARNING: "warning", ON_TRACK: "success" } as const;

export default async function HomePage() {
  const user = await requireUser();
  const d = seedData();
  const gmv = d.dailyGmv;
  const sla = d.supportDaily;
  const dq = d.dqDaily.filter((x) => x.product === "Enterprise P&L");
  const cost = d.costDaily;

  const gmvLast = gmv[gmv.length - 1].value;
  const gmvPrev = gmv[gmv.length - 2].value;
  const gmvDelta = ((gmvLast - gmvPrev) / gmvPrev) * 100;
  const slaLast = sla[sla.length - 1].slaRate;
  const slaPrev = sla[sla.length - 8].slaRate;
  const dqLast = dq[dq.length - 1].score;
  const dqPrev = dq[dq.length - 2].score;
  const costLast = cost[cost.length - 1].value;
  const costDelta = ((costLast - 14200) / 14200) * 100;

  const openIncidents = INCIDENTS.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING" || i.status === "MITIGATED");
  const critical = openIncidents.find((i) => i.severity === "P1") || openIncidents[0];
  const notifications = storeApi.getNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  const dqProducts = Array.from(new Set(d.dqDaily.map((x) => x.product)));
  const dqLatest = dqProducts.map((p) => {
    const rows = d.dqDaily.filter((x) => x.product === p);
    return { label: p, value: rows[rows.length - 1].score };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`}
        description="Platform health, certified KPIs, and live alerts - as of 2026-07-14."
        actions={
          <>
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3 text-success" /> All systems reporting</Badge>
            <Link href="/incidents" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Incident Center <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {critical ? (
        <Link href="/incidents" className="block">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 transition-colors hover:bg-destructive/15">
            <Flame className="h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{critical.id} · {critical.title}</div>
              <div className="truncate text-xs text-muted-foreground">{critical.businessImpact}</div>
            </div>
            <Badge variant={SEV_VARIANT[critical.severity]}>{critical.severity} · {critical.status}</Badge>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV · 30d" value={formatMoney(gmvLast * 30)} icon={Target} delta={gmvDelta} deltaGood={gmvDelta > 0} spark={gmv.slice(-30).map((x) => x.value)} sparkColor="#22d3ee" hint="vs prior day" />
        <StatCard label="Support SLA" value={`${slaLast.toFixed(1)}%`} icon={LifeBuoy} delta={slaLast - slaPrev} deltaGood={slaLast >= slaPrev} spark={sla.slice(-30).map((x) => x.slaRate)} sparkColor="#f87171" hint="vs 7d ago" />
        <StatCard label="Enterprise DQ Score" value={dqLast.toFixed(1)} icon={ShieldCheck} delta={dqLast - dqPrev} deltaGood={dqLast >= dqPrev} spark={dq.slice(-30).map((x) => x.score)} sparkColor="#34d399" hint="vs prior day" />
        <StatCard label="Daily Cloud Cost" value={formatMoney(costLast)} icon={CircleDollarSign} delta={costDelta} deltaSuffix="%" deltaGood={false} spark={cost.slice(-30).map((x) => x.value)} sparkColor="#fbbf24" hint="vs $14k baseline" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>GMV trend</CardTitle>
            <CardDescription>Daily gross merchandise value, last 60 days (Jul 13 −18% dip was a source gap, resolved)</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={gmv.slice(-60).map((x) => ({ label: x.date, value: x.value }))} height={240} color="#22d3ee" yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily cloud cost</CardTitle>
            <CardDescription>Runaway extract pushed cost to $41k/day (INC-2026-041)</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={cost.map((x) => ({ label: x.date, value: x.value }))} height={240} color="#fbbf24" baseline={30000} yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Support SLA</CardTitle>
            <CardDescription>Board SLA collapsed to 71% when open cases were included (INC-2026-038)</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={sla.map((x) => ({ label: x.date, value: x.slaRate }))} height={200} color="#f87171" baseline={97} yFormat={(v) => v.toFixed(0) + "%"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>DQ score by data product</CardTitle>
            <CardDescription>Latest daily assessment per product</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dqLatest} height={200} horizontal maxBars={6} yFormat={(v) => v.toFixed(1)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live incidents</CardTitle>
            <CardDescription>{openIncidents.length} active · {unread} unread notifications</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openIncidents.slice(0, 5).map((i) => (
              <Link key={i.id} href="/incidents" className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:border-primary/40">
                <Badge variant={SEV_VARIANT[i.severity]}>{i.severity}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs font-medium group-hover:text-primary">{i.title}</span>
                <Badge variant="outline">{i.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity feed</CardTitle>
            <CardDescription>Latest platform actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {ACTIVITY.slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <span className="font-medium">{a.action}</span> <span className="text-muted-foreground">{a.resource}</span>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span>{a.actor}</span>·<span>{timeAgo(a.at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {user.role !== "operations" ? (
        <Card>
          <CardHeader>
            <CardTitle>Certified KPI health</CardTitle>
            <CardDescription>Six flagship KPIs tracked against targets · role: {ROLE_LABELS[user.role]}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {storeApi.getKpis().slice(0, 6).map((k) => (
              <Link key={k.id} href="/kpis" className="rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{k.name}</span>
                  {k.lastStatus ? <Badge variant={KPI_STATUS_VARIANT[k.lastStatus]}>{k.lastStatus}</Badge> : <Badge variant="outline">{k.status}</Badge>}
                </div>
                <div className="mt-1.5 flex items-end justify-between">
                  <span className="text-lg font-semibold tabular">{k.value !== undefined ? formatCompact(k.value) : "-"}</span>
                  <span className="text-[11px] text-muted-foreground">target {formatCompact(k.target)} {k.unit}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="text-sm text-muted-foreground">
              Operations profile focuses on pipelines, incidents and notifications. KPI definitions are owned by the Analytics team.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
