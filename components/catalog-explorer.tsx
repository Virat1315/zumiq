"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Database, Lock, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DATASETS } from "@/lib/data/enterprise";
import { cn, formatCompact } from "@/lib/utils";

const CLASS_COLOR: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  PUBLIC: "success",
  INTERNAL: "secondary",
  CONFIDENTIAL: "warning",
  RESTRICTED: "destructive",
};

export function CatalogExplorer() {
  const [query, setQuery] = React.useState("");
  const [layer, setLayer] = React.useState("ALL");
  const [activeId, setActiveId] = React.useState(DATASETS[0].id);

  const filtered = DATASETS.filter((d) => {
    const q = query.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.domain.toLowerCase().includes(q) || d.columns.some((c) => c.name.toLowerCase().includes(q) || c.meaning.toLowerCase().includes(q));
    const matchL = layer === "ALL" || d.layer === layer;
    return matchQ && matchL;
  });

  const active = DATASETS.find((d) => d.id === activeId)!;
  const layers = ["ALL", ...Array.from(new Set(DATASETS.map((d) => d.layer)))];

  const requestAccess = async (datasetId: string) => {
    const res = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Request failed");
    toast.success(data.message);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* List */}
      <div className="lg:col-span-2">
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tables, columns, meaning…" className="pl-8 text-xs" />
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {layers.map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", layer === l ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveId(d.id)}
              className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors", activeId === d.id ? "border-primary/50 bg-primary/[0.04]" : "border-border/60 hover:border-primary/30")}
            >
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs font-semibold">{d.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{d.domain} · {d.description}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{d.layer}</Badge>
                  <Badge variant="outline">{d.columns.length} cols</Badge>
                  <Badge variant={d.certified ? "success" : "warning"}>{d.certified ? "certified" : "uncertified"}</Badge>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-base font-semibold">{active.name}</h2>
                  {active.certified ? <Badge variant="success">certified</Badge> : <Badge variant="warning">pending certification</Badge>}
                </div>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{active.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Owner · <span className="font-medium text-foreground">{active.owner}</span></span>
                  <span>· {active.columns.length} columns</span>
                  <span>· {formatCompact(active.sizeGb * 1024)} MB</span>
                  <span>· refresh {active.refresh}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {active.sensitivity === "RESTRICTED" ? <Badge variant="destructive"><Lock className="h-3 w-3" /> restricted</Badge> : active.sensitivity === "CONFIDENTIAL" ? <Badge variant="warning"><KeyRound className="h-3 w-3" /> confidential</Badge> : <Badge variant="success">open</Badge>}
                <Button size="sm" onClick={() => requestAccess(active.id)} disabled={active.sensitivity === "PUBLIC" || active.sensitivity === "INTERNAL"}>
                  {active.sensitivity === "PUBLIC" || active.sensitivity === "INTERNAL" ? "Accessible" : "Request access"}
                </Button>
              </div>
            </div>

            <Table className="mt-5">
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nullable</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>PII</TableHead>
                  <TableHead>Meaning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.columns.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-mono text-[11px] font-semibold">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                    <TableCell className="text-[11px]">{c.nullable ? "yes" : <span className="font-medium text-warning">no</span>}</TableCell>
                    <TableCell>{c.classification ? <Badge variant={CLASS_COLOR[c.classification] || "secondary"}>{c.classification}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{c.pii ? <Badge variant="destructive"><KeyRound className="h-3 w-3" /> {c.pii}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="max-w-[18rem] text-xs text-muted-foreground">{c.meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
