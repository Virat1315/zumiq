import { requireAccess } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";
import { PageHeader } from "@/components/page-header";
import { CreateKpiDialog } from "@/components/create-kpi-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/charts";
import { formatCompact } from "@/lib/utils";

const STATUS_VARIANT = { BREACH: "destructive", WARNING: "warning", ON_TRACK: "success" } as const;

export default async function KpisPage() {
  const user = await requireAccess("kpis");
  const kpis = storeApi.getKpis();
  const certified = kpis.filter((k) => k.certified).length;
  const breaches = kpis.filter((k) => k.lastStatus === "BREACH").length;
  const warnings = kpis.filter((k) => k.lastStatus === "WARNING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI Studio"
        description="Define, certify and monitor enterprise KPIs on the semantic layer. Every KPI carries generated SQL and a live status."
        actions={<CreateKpiDialog />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total KPIs", value: kpis.length, tone: "text-foreground" },
          { label: "Certified", value: certified, tone: "text-success" },
          { label: "In warning", value: warnings, tone: "text-warning" },
          { label: "In breach", value: breaches, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[13px] leading-snug">{k.name}</CardTitle>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {k.lastStatus ? <Badge variant={STATUS_VARIANT[k.lastStatus]}>{k.lastStatus}</Badge> : <Badge variant="outline">{k.status}</Badge>}
                  {k.certified ? <Badge variant="success">certified</Badge> : null}
                </div>
              </div>
              <CardDescription className="font-mono text-[11px]">{k.aggregation}({k.metric}) · {k.timeWindow}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 pt-2">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-xl font-semibold tabular">{k.value !== undefined ? formatCompact(k.value) : "-"} <span className="text-xs font-normal text-muted-foreground">{k.unit}</span></div>
                  <div className="text-[11px] text-muted-foreground">target {formatCompact(k.target)} {k.unit}</div>
                </div>
                <Sparkline data={k.spark} color={k.lastStatus === "BREACH" ? "#f87171" : k.lastStatus === "WARNING" ? "#fbbf24" : "#34d399"} width={110} height={38} />
              </div>
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">Generated SQL</summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/40 p-2.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">{k.sql}</pre>
              </details>
              <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                <span>Owner · {k.owner}</span>
                <span className="font-mono">{k.id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
