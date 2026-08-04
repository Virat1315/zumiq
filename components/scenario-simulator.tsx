"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown, Wallet, Users, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { defaultInputs, type SimInputs, type SimImpact } from "@/lib/data/simulator";
import { formatMoney } from "@/lib/utils";

function fmtImpact(n: number): string {
  return (n >= 0 ? "+" : "") + formatMoney(n) + "/mo";
}

export function ScenarioSimulator() {
  const [inputs, setInputs] = React.useState<SimInputs>(defaultInputs());
  const [impact, setImpact] = React.useState<SimImpact | null>(null);
  const [busy, setBusy] = React.useState(false);

  const set = (k: keyof SimInputs, v: number) => setInputs((s) => ({ ...s, [k]: v }));

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed");
      setImpact(data.impact);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>Adjust operating levers and project the impact on certified KPIs.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Payment approval rate</Label>
              <span className="font-mono text-xs font-semibold text-primary">{inputs.approvalRate}%</span>
            </div>
            <Slider value={[inputs.approvalRate]} min={90} max={99} step={0.5} onValueChange={(v) => set("approvalRate", v[0])} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Avg processing time</Label>
              <span className="font-mono text-xs font-semibold text-primary">{inputs.processingTime} min</span>
            </div>
            <Slider value={[inputs.processingTime]} min={0} max={45} step={1} onValueChange={(v) => set("processingTime", v[0])} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Repeat calls (% of cases)</Label>
              <span className="font-mono text-xs font-semibold text-primary">{inputs.repeatCalls}%</span>
            </div>
            <Slider value={[inputs.repeatCalls]} min={2} max={20} step={0.5} onValueChange={(v) => set("repeatCalls", v[0])} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Customer satisfaction (CSAT)</Label>
              <span className="font-mono text-xs font-semibold text-primary">{inputs.customerSatisfaction.toFixed(1)}</span>
            </div>
            <Slider value={[inputs.customerSatisfaction]} min={3} max={5} step={0.1} onValueChange={(v) => set("customerSatisfaction", v[0])} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Transaction volume delta</Label>
              <span className="font-mono text-xs font-semibold text-primary">{inputs.transactionVolume > 0 ? "+" : ""}{inputs.transactionVolume}%</span>
            </div>
            <Slider value={[inputs.transactionVolume]} min={-20} max={20} step={1} onValueChange={(v) => set("transactionVolume", v[0])} />
          </div>
          <Button onClick={run} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />} Run simulation
          </Button>
        </CardContent>
      </Card>

      <div className="xl:col-span-3">
        {impact ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-success" /> Revenue impact</div>
                <div className="mt-1 text-2xl font-semibold tabular text-success">{fmtImpact(impact.revenueImpact)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-primary" /> Cost impact</div>
                <div className="mt-1 text-2xl font-semibold tabular text-primary">{fmtImpact(impact.costImpact)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Users className="h-3.5 w-3.5 text-warning" /> Customer impact</div>
                <div className="mt-1 text-sm font-medium">{impact.customerImpact}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Gauge className="h-3.5 w-3.5 text-accent" /> Operational</div>
                <div className="mt-1 text-sm font-medium">{impact.operationalImpact}</div>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Projected platform state</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA projection</div>
                    <div className="mt-0.5 text-xl font-semibold tabular text-success">{impact.slaProjection.toFixed(1)}%</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Churn projection</div>
                    <div className="mt-0.5 text-xl font-semibold tabular text-warning">{impact.churnProjection.toFixed(1)}%</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Platform utilization</div>
                    <div className="mt-0.5 text-xl font-semibold tabular text-primary">{impact.utilization}%</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="success">Net {impact.revenueImpact + impact.costImpact >= 0 ? "+" : ""}{formatMoney(impact.revenueImpact + impact.costImpact)}/mo combined</Badge>
                  <Badge variant="outline">Baseline · CSAT 4.12 · SLA 94.8%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 p-10 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground/40" />
            <div className="text-sm font-medium">No simulation yet</div>
            <div className="max-w-sm text-xs text-muted-foreground">
              Tune the levers and run a what-if to project revenue, cost, SLA, churn and utilization against the certified baseline.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
