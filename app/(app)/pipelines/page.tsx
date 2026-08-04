import { requireAccess } from "@/lib/auth";
import { seedData } from "@/lib/data/core";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STAGES = ["EXTRACT", "VALIDATE", "TRANSFORM", "LOAD", "DQ", "PUBLISH"] as const;

// deterministic per-pipeline stage health (aligned with seeded run statuses)
function stageHealth(pipeline: string, status: "SUCCESS" | "FAILED") {
  if (pipeline === "FCT_TRANSACTIONS_LOAD") {
    return { EXTRACT: true, VALIDATE: true, TRANSFORM: true, LOAD: false, DQ: false, PUBLISH: false } as Record<(typeof STAGES)[number], boolean>;
  }
  if (status === "FAILED") {
    return { EXTRACT: true, VALIDATE: true, TRANSFORM: false, LOAD: false, DQ: true, PUBLISH: false } as Record<(typeof STAGES)[number], boolean>;
  }
  return { EXTRACT: true, VALIDATE: true, TRANSFORM: true, LOAD: true, DQ: true, PUBLISH: true } as Record<(typeof STAGES)[number], boolean>;
}

export default async function PipelinesPage() {
  const user = await requireAccess("pipelines");
  const d = seedData();
  const names = Array.from(new Set(d.pipelines.map((p) => p.pipeline)));
  const pipes = names.map((name) => {
    const runs = d.pipelines.filter((p) => p.pipeline === name);
    const recent7 = runs.slice(-7);
    const recent = recent7[recent7.length - 1];
    const status = recent7.some((r) => r.status === "FAILED") ? "DEGRADED" : "HEALTHY";
    const success = recent7.filter((r) => r.status === "SUCCESS").length;
    return { name, target: recent.target, status, successRate: Math.round((success / recent7.length) * 100), runs, recent7 };
  });

  const healthy = pipes.filter((p) => p.status === "HEALTHY").length;
  const degraded = pipes.filter((p) => p.status === "DEGRADED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Monitor"
        description="End-to-end batch and streaming loads from source into the certified gold layer. Each pipeline shows the 6-stage run visual."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Pipelines", value: pipes.length, tone: "text-foreground" },
          { label: "Healthy", value: healthy, tone: "text-success" },
          { label: "Degraded", value: degraded, tone: degraded ? "text-destructive" : "text-muted-foreground" },
          { label: "7d runs", value: pipes.reduce((a, p) => a + p.recent7.length, 0), tone: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {pipes.map((p) => {
          const health = stageHealth(p.name, p.recent7.some((r) => r.status === "FAILED") ? "FAILED" : "SUCCESS");
          const failing = STAGES.filter((s) => !health[s]).length;
          return (
            <Card key={p.name}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="font-mono text-[13px]">{p.name}</CardTitle>
                    <CardDescription className="mt-0.5 font-mono text-[11px]">→ {p.target}</CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={p.status === "HEALTHY" ? "success" : "destructive"}>{p.status}</Badge>
                    <Badge variant="outline">{p.successRate}%</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-1">
                  {STAGES.map((s, i) => (
                    <div key={s} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={cn(
                          "flex h-6 w-full items-center justify-center rounded border text-[9px] font-bold tracking-wide",
                          health[s] ? "border-success/40 bg-success/15 text-success" : "border-destructive/40 bg-destructive/15 text-destructive"
                        )}
                      >
                        {s}
                      </div>
                      {i < STAGES.length - 1 ? <div className={cn("h-1.5 w-px", health[s] ? "bg-success/50" : "bg-destructive/50")} /> : null}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Last run {p.recent7[p.recent7.length - 1].date} · {p.recent7[p.recent7.length - 1].rows.toLocaleString()} rows · {p.recent7[p.recent7.length - 1].durationSec}s</span>
                  <span className={failing ? "font-semibold text-destructive" : "font-semibold text-success"}>
                    {failing ? `blocked at ${STAGES.find((s) => !health[s])}` : "all stages passing"}
                  </span>
                </div>
                <details>
                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">7-day run history</summary>
                  <div className="mt-2 flex gap-1.5">
                    {p.recent7.map((r) => (
                      <div key={r.date} title={`${r.date} · ${r.status} · ${r.rows.toLocaleString()} rows`} className="flex-1">
                        <div className={cn("h-8 rounded", r.status === "SUCCESS" ? "bg-success/25" : "bg-destructive/40")} style={{ opacity: 0.4 + r.rows / 200000 }} />
                        <div className="mt-1 truncate text-center text-[9px] text-muted-foreground">{r.date.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All runs · last 7 days</CardTitle>
          <CardDescription>FCT_TRANSACTIONS_LOAD has been failing since Jul 13 (INC-2026-037)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>DQ gate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.pipelines
                .filter((r) => r.date >= "2026-07-08")
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-[11px]">{r.date}</TableCell>
                    <TableCell className="font-mono text-[11px]">{r.pipeline}</TableCell>
                    <TableCell><Badge variant={r.status === "SUCCESS" ? "success" : "destructive"}>{r.status}</Badge></TableCell>
                    <TableCell className="tabular">{r.rows.toLocaleString()}</TableCell>
                    <TableCell className="tabular">{r.durationSec}s</TableCell>
                    <TableCell>{r.dqPassed ? <Badge variant="success">passed</Badge> : <Badge variant="destructive">blocked</Badge>}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
