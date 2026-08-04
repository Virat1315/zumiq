"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { Incident } from "@/lib/data/enterprise";
import { cn } from "@/lib/utils";

const SEV_VARIANT = { P1: "destructive", P2: "warning", P3: "secondary" } as const;
const STATUS_VARIANT: Record<Incident["status"], "destructive" | "warning" | "secondary" | "success" | "outline"> = {
  OPEN: "destructive",
  INVESTIGATING: "warning",
  MITIGATED: "secondary",
  RESOLVED: "success",
  CLOSED: "outline",
};
const NEXT_STATUS: Record<string, Incident["status"]> = {
  OPEN: "INVESTIGATING",
  INVESTIGATING: "MITIGATED",
  MITIGATED: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: "OPEN",
};

const FILTERS = ["All", "P1", "P2", "P3"] as const;

export function IncidentList({ initial }: { initial: Incident[] }) {
  const [items, setItems] = React.useState(initial);
  const [severity, setSeverity] = React.useState<(typeof FILTERS)[number]>("All");
  const [status, setStatus] = React.useState("ALL");
  const [openId, setOpenId] = React.useState<string | null>(items.find((i) => i.status !== "RESOLVED" && i.status !== "CLOSED")?.id ?? null);

  const filtered = items.filter(
    (i) => (severity === "All" || i.severity === severity) && (status === "ALL" || i.status === status)
  );

  const advance = async (inc: Incident) => {
    const next = NEXT_STATUS[inc.status];
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inc.id, status: next }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error("Failed to update status");
    toast.success(`${inc.id} → ${data.incident.status}`);
    setItems((prev) => prev.map((x) => (x.id === inc.id ? data.incident : x)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={FILTERS.map((f) => ({ id: f, label: f }))}
          active={severity}
          onChange={(id) => setSeverity(id as (typeof FILTERS)[number])}
        />
        <div className="w-44">
          <Select
            options={[
              { value: "ALL", label: "All statuses" },
              ...Object.keys(STATUS_VARIANT).map((s) => ({ value: s, label: s })),
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No incidents match the filter.</CardContent></Card>
      ) : (
        filtered.map((i) => {
          const open = openId === i.id;
          return (
            <Card key={i.id} className={cn("transition-colors", i.status === "OPEN" && "border-destructive/30")}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEV_VARIANT[i.severity]}>{i.severity}</Badge>
                  <span className="font-mono text-xs font-semibold">{i.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.title}</span>
                  <Badge variant={STATUS_VARIANT[i.status]}>{i.status}</Badge>
                  <Badge variant={i.slaMet ? "success" : "destructive"}>{i.slaMet ? "SLA met" : "SLA missed"}</Badge>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => advance(i)}>
                    <Siren className="h-3 w-3" /> Set {NEXT_STATUS[i.status]}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenId(open ? null : i.id)}>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Detected <span className="font-medium text-foreground">{i.detectedAt.slice(0, 16).replace("T", " ")}</span></span>
                  <span>Owner <span className="font-medium text-foreground">{i.owner}</span></span>
                  <span>Source <span className="font-medium text-foreground">{i.source}</span></span>
                  <span>Rule <span className="font-medium text-foreground">{i.detectionRule}</span></span>
                </div>

                {open ? (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-sm">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Business impact</div>
                      <p className="mt-0.5">{i.businessImpact}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Root cause</div>
                        <p className="mt-0.5">{i.rootCause}</p>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution</div>
                        <p className="mt-0.5">{i.resolution}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {i.affectedKpis.map((k) => <Badge key={k} variant="accent">{k}</Badge>)}
                      {i.affectedSystems.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</div>
                      <div className="mt-1 flex flex-col gap-1.5">
                        {i.timeline.map((t, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <div>
                              <span className="font-medium">{t.actor}</span>
                              <span className="ml-1 text-muted-foreground">{t.message}</span>
                              <div className="text-[10px] text-muted-foreground/70">{t.at.slice(0, 16).replace("T", " ")}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
