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

const TYPES = ["NOT_NULL", "UNIQUE", "FRESHNESS", "THRESHOLD", "DUPLICATE_RATIO", "VOLUME", "APPROVAL_RATE", "SCHEMA"];

export function CreateRuleDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("THRESHOLD");
  const [datasetId, setDatasetId] = React.useState("ds1");
  const [column, setColumn] = React.useState("");
  const [threshold, setThreshold] = React.useState("");

  const submit = async () => {
    if (!name.trim()) return toast.error("Rule name is required");
    setBusy(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, datasetId, column, threshold }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rule");
      toast.success(`Rule “${data.rule.name}” created`);
      setOpen(false);
      setName("");
      setColumn("");
      setThreshold("");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add rule</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add DQ rule</DialogTitle>
            <DialogDescription>Guardrails are enforced by the DQ engine on every batch and ad-hoc load.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Rule name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. order amount NOT NULL" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select options={TYPES.map((t) => ({ value: t, label: t }))} value={type} onChange={(e) => setType(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Dataset</Label>
                <Select options={DATASETS.map((d) => ({ value: d.id, label: d.name }))} value={datasetId} onChange={(e) => setDatasetId(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Column (optional)</Label>
              <Input value={column} onChange={(e) => setColumn(e.target.value)} placeholder="amount_usd" className="font-mono text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label>Threshold</Label>
              <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="< 5% null" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
