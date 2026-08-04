import { requireAccess } from "@/lib/auth";
import { ANALYTICS_SUMMARY, FEATURE_USAGE, MOST_USED_KPIS, getDauSeries } from "@/lib/data/enterprise";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, BarChart } from "@/components/ui/charts";
import { formatCompact } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requireAccess("analytics");
  const dau = getDauSeries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Analytics"
        description="Adoption and engagement across the ZUMIQ platform - who is using what, and how much it moves the business."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly active</div>
          <div className="mt-1 text-2xl font-semibold tabular">{ANALYTICS_SUMMARY.mau}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Weekly active</div>
          <div className="mt-1 text-2xl font-semibold tabular">{ANALYTICS_SUMMARY.wau}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily active</div>
          <div className="mt-1 text-2xl font-semibold tabular text-primary">{ANALYTICS_SUMMARY.dau}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Adoption delta</div>
          <div className="mt-1 text-2xl font-semibold tabular text-success">+{ANALYTICS_SUMMARY.adoptionDelta}%</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily active users · 60d</CardTitle>
            <CardDescription>Platform engagement trend</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={dau} height={220} color="#6366f1" yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feature adoption</CardTitle>
            <CardDescription>Distinct users per feature</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={FEATURE_USAGE.map((f) => ({ label: f.label, value: f.users }))} horizontal maxBars={8} height={220} yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most used KPIs</CardTitle>
            <CardDescription>Dashboard viewership this week</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOST_USED_KPIS.map((k) => (
                  <TableRow key={k.name}>
                    <TableCell className="text-xs font-medium">{k.name}</TableCell>
                    <TableCell className="text-right tabular">{k.views.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={k.trend >= 0 ? "success" : "destructive"}>{k.trend >= 0 ? "▲" : "▼"} {Math.abs(k.trend)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform health</CardTitle>
            <CardDescription>Governance & engagement signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Certified coverage", value: `${ANALYTICS_SUMMARY.certifiedCoverage}%`, detail: "of Tier-1 tables certified" },
              { label: "Searches / day", value: ANALYTICS_SUMMARY.searchesPerDay.toLocaleString(), detail: "enterprise search queries" },
              { label: "KPIs created", value: ANALYTICS_SUMMARY.kpisCreated, detail: "in the studio" },
              { label: "DQ rules active", value: ANALYTICS_SUMMARY.rulesCreated, detail: "enforced on every batch" },
              { label: "Dashboards active", value: ANALYTICS_SUMMARY.dashboardsActive, detail: "with live data" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.detail}</div>
                </div>
                <span className="text-lg font-semibold tabular text-primary">{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
