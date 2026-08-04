"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DATASETS } from "@/lib/data/enterprise";

const AGGREGATIONS = ["SUM", "AVG", "COUNT", "COUNT DISTINCT", "MAX", "MIN", "RATIO"];

export function CreateKpiDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [datasetId, setDatasetId] = React.useState("ds1");
  const [metric, setMetric] = React.useState("amount_usd");
  const [aggregation, setAggregation] = React.useState("SUM");
  const [target, setTarget] = React.useState("100000");

  const submit = async () => {
    if (!name.trim() || !metric.trim()) {
      toast.error("Name and metric are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), datasetId, metric: metric.trim(), aggregation, target: Number(target) || 100000 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create KPI");
      toast.success(`KPI “${data.kpi.name}” created`);
      setOpen(false);
      setName("");
      setMetric("amount_usd");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create KPI</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create KPI</DialogTitle>
            <DialogDescription>Define a metric and ZUMIQ generates the SQL from the certified semantic layer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="kpi-name">KPI name</Label>
              <Input id="kpi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Net Revenue by Region" />
            </div>
            <div className="grid gap-1.5">
              <Label>Source dataset</Label>
              <Select
                options={DATASETS.map((d) => ({ value: d.id, label: d.name }))}
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Metric</Label>
                <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="amount_usd" className="font-mono text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label>Aggregation</Label>
                <Select options={AGGREGATIONS.map((a) => ({ value: a, label: a }))} value={aggregation} onChange={(e) => setAggregation(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Target value</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
