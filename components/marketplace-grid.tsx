"use client";

import * as React from "react";
import { toast } from "sonner";
import { Store, Lock, KeyRound, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCTS, type DataProduct } from "@/lib/data/enterprise";

export function MarketplaceGrid() {
  const [requested, setRequested] = React.useState<Set<string>>(new Set());

  const request = async (p: DataProduct) => {
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Request failed");
    toast.success(data.message);
    setRequested((prev) => new Set(prev).add(p.id));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {PRODUCTS.map((p) => (
        <Card key={p.id} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Store className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.id} · v{p.version}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {p.certified ? <Badge variant="success">certified</Badge> : <Badge variant="warning">pending</Badge>}
                {p.access === "RESTRICTED" ? <Badge variant="destructive"><Lock className="h-3 w-3" /> restricted</Badge> : p.access === "REQUEST" ? <Badge variant="warning"><KeyRound className="h-3 w-3" /> request</Badge> : <Badge variant="success">open</Badge>}
              </div>
            </div>

            <p className="mt-3 flex-1 text-xs text-muted-foreground">{p.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline">{p.domain}</Badge>
              <Badge variant="outline">DQ {p.qualityScore}</Badge>
              <Badge variant="outline">fresh {p.freshness}</Badge>
              <Badge variant="outline">{p.monthlyQueries.toLocaleString()} q/mo</Badge>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              <span>Owner · {p.owner}</span>
              <span>{p.consumers} consumers</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="h-8 flex-1 gap-1 text-xs" onClick={() => request(p)} disabled={p.access === "OPEN" || requested.has(p.id)}>
                {requested.has(p.id) ? "Requested" : p.access === "OPEN" ? "Accessible" : "Request access"}
                {p.access !== "OPEN" && !requested.has(p.id) ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs">Docs</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
