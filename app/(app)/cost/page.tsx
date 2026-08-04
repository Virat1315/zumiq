import { requireAccess } from "@/lib/auth";
import { getCostInsights } from "@/lib/data/cost";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, BarChart, DonutChart } from "@/components/ui/charts";
import { formatMoney, formatCompact } from "@/lib/utils";

const EFFORT_VARIANT = { Low: "success", Medium: "warning", High: "destructive" } as const;

export default async function CostPage() {
  const user = await requireAccess("cost");
  const c = getCostInsights();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Cost"
        description="FinOps view of warehouse spend. The runaway extract (INC-2026-041) pushed daily cost from $14k to $41k."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total · 30d</div>
          <div className="mt-1 text-2xl font-semibold tabular">{formatMoney(c.totals.total30d)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg daily</div>
          <div className="mt-1 text-2xl font-semibold tabular">{formatMoney(c.totals.avgDaily)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">7d overrun vs baseline</div>
          <div className="mt-1 text-2xl font-semibold tabular text-destructive">{formatMoney(c.totals.overrun)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cache hit rate</div>
          <div className="mt-1 text-2xl font-semibold tabular text-warning">{c.totals.cacheRate}%</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daily cost</CardTitle>
            <CardDescription>Dashed line is the $30k alert threshold</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={c.dailyCost} height={240} color="#fbbf24" baseline={30000} yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost by dataset</CardTitle>
            <CardDescription>Scan cost distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={c.byDataset} horizontal maxBars={7} height={240} yFormat={(v) => formatCompact(v)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top cost users</CardTitle>
            <CardDescription>Runaway flagged in red</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>GB</TableHead>
                  <TableHead>Queries</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.byUser.slice(0, 8).map((u) => (
                  <TableRow key={u.label} className={u.runaway ? "bg-destructive/[0.06]" : undefined}>
                    <TableCell>
                      <span className="font-medium">{u.label}</span>
                      {u.runaway ? <Badge variant="destructive" className="ml-2">runaway</Badge> : null}
                    </TableCell>
                    <TableCell className="text-xs">{u.team}</TableCell>
                    <TableCell className="tabular text-xs">{u.gb.toLocaleString()}</TableCell>
                    <TableCell className="tabular text-xs">{u.queries.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatMoney(u.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage footprint</CardTitle>
            <CardDescription>Largest datasets by size</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <DonutChart data={c.storage.map((s) => ({ label: s.label.split(".").pop()!, value: s.value }))} centerLabel="storage GB" centerValue={formatCompact(c.storage.reduce((a, s) => a + s.value, 0))} size={170} />
            <div className="w-full">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unused tables · archive</div>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {c.unusedTables.map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5 text-xs">
                    <span className="font-mono text-[11px]">{t.name}</span>
                    <span className="text-muted-foreground">{formatCompact(t.sizeGb)} GB · last access {t.lastAccess}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top queries</CardTitle>
            <CardDescription>Highest-cost executions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>GB</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Cache</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.topQueries.slice(0, 8).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs">{q.user}</TableCell>
                    <TableCell className="font-mono text-[11px]">{q.dataset}</TableCell>
                    <TableCell className="tabular text-xs">{q.gb.toLocaleString()}</TableCell>
                    <TableCell className="tabular text-xs">{q.timesRun.toLocaleString()}</TableCell>
                    <TableCell>{q.cacheHit ? <Badge variant="success">hit</Badge> : <Badge variant="warning">miss</Badge>}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatMoney(q.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization suggestions</CardTitle>
            <CardDescription>Prioritized FinOps actions with estimated savings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {c.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.detail}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="success">{s.savings}</Badge>
                  <Badge variant={EFFORT_VARIANT[s.effort]}>{s.effort} effort</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
