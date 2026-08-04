"use client";

import * as React from "react";
import { toast } from "sonner";
import { Play, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { DqRule } from "@/lib/data/enterprise";

const TYPE_VARIANT: Record<DqRule["type"], "default" | "success" | "warning" | "destructive" | "secondary" | "accent"> = {
  UNIQUE: "success",
  NOT_NULL: "success",
  FRESHNESS: "warning",
  THRESHOLD: "accent",
  VOLUME: "default",
  APPROVAL_RATE: "destructive",
  DUPLICATE_RATIO: "warning",
  SCHEMA: "secondary",
};

const RUN_VARIANT = { PASS: "success", FAIL: "destructive", ERROR: "warning", PENDING: "secondary" } as const;

export function DqRulesTable({ initial }: { initial: DqRule[] }) {
  const [rules, setRules] = React.useState(initial);
  const [runningId, setRunningId] = React.useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/rules");
    const data = await res.json();
    setRules(data.rules || []);
  };

  const toggle = async (id: string, enabled: boolean) => {
    const res = await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    if (!res.ok) return toast.error("Failed to update rule");
    toast.success(enabled ? "Rule enabled" : "Rule disabled");
    refresh();
  };

  const run = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/rules/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run rule");
      toast.success(data.result.pass ? `Rule passed (${data.result.failed.toLocaleString()} failed of ${data.result.checked.toLocaleString()})` : `Rule FAILED - ${data.result.failed.toLocaleString()} rows affected`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunningId(null);
      refresh();
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{rules.length} rules · engine runs the governed DQ checks on every batch</div>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dataset</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead className="text-right">Enabled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                </div>
                {r.column ? <div className="text-[11px] text-muted-foreground">column · {r.column} · {r.params}</div> : <div className="text-[11px] text-muted-foreground">{r.params}</div>}
              </TableCell>
              <TableCell><Badge variant={TYPE_VARIANT[r.type]}>{r.type}</Badge></TableCell>
              <TableCell className="font-mono text-[11px]">{r.dataset}</TableCell>
              <TableCell className="font-mono text-[11px]">{r.threshold}</TableCell>
              <TableCell className="text-[11px]">{r.schedule}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={RUN_VARIANT[r.lastRun.status]}>{r.lastRun.status}</Badge>
                  <span className="text-[11px] text-muted-foreground">{r.lastRun.status === "PASS" || r.lastRun.status === "FAIL" ? `${r.lastRun.failed.toLocaleString()}/${r.lastRun.checked.toLocaleString()} · ${r.lastRun.durationMs}ms` : r.lastRun.at}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => run(r.id)} disabled={runningId === r.id} title="Run now">
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
