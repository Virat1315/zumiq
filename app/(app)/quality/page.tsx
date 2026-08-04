import { requireAccess } from "@/lib/auth";
import { seedData } from "@/lib/data/core";
import { storeApi } from "@/lib/data/store";
import { PageHeader } from "@/components/page-header";
import { CreateRuleDialog } from "@/components/create-rule-dialog";
import { DqRulesTable } from "@/components/dq-rules-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, BarChart } from "@/components/ui/charts";

export default async function QualityPage() {
  const user = await requireAccess("quality");
  const d = seedData();
  const products = Array.from(new Set(d.dqDaily.map((x) => x.product)));
  const series = products.map((p) => ({
    label: p,
    values: d.dqDaily.filter((x) => x.product === p).map((x) => ({ label: x.date, value: x.score })),
    latest: d.dqDaily.filter((x) => x.product === p).pop()!,
  }));

  const latestScores = series.map((s) => ({ label: s.label, value: s.latest.score }));
  const rules = storeApi.getRules();
  const failing = rules.filter((r) => r.lastRun.status === "FAIL").length;
  const enabled = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        description="The DQ engine scores every certified data product and enforces guardrail rules on each batch. Sign in as admin to tune thresholds."
        actions={<CreateRuleDialog />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Data products scored", value: products.length, tone: "text-foreground" },
          { label: "Active rules", value: enabled, tone: "text-primary" },
          { label: "Rules failing", value: failing, tone: failing ? "text-destructive" : "text-success" },
          { label: "Scores below 95", value: latestScores.filter((s) => s.value < 95).length, tone: latestScores.some((s) => s.value < 95) ? "text-warning" : "text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score by data product · 90d</CardTitle>
            <CardDescription>Customer 360 dipped to 89.4 on Jul 13 from a CRM null spike (INC-2026-036)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {series.map((s, i) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.label}</span>
                  <span className={s.latest.score < 95 ? "font-semibold text-warning" : "font-semibold text-success"}>{s.latest.score.toFixed(1)}</span>
                </div>
                <LineChart
                  data={s.values}
                  height={56}
                  area={false}
                  color={i % 2 === 0 ? "#34d399" : "#22d3ee"}
                  yFormat={(v) => v.toFixed(0)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest score</CardTitle>
            <CardDescription>All products, today</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={latestScores} horizontal maxBars={6} height={220} yFormat={(v) => v.toFixed(1)} />
            <div className="mt-4 flex flex-wrap gap-2">
              {latestScores.map((s) => (
                <Badge key={s.label} variant={s.value < 95 ? "warning" : "success"}>{s.label} {s.value.toFixed(1)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DQ rules</CardTitle>
          <CardDescription>Guardrails enforced on every batch - toggle, run on demand, or add a new rule.</CardDescription>
        </CardHeader>
        <CardContent>
          <DqRulesTable initial={rules} />
        </CardContent>
      </Card>
    </div>
  );
}
