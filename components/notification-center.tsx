"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, MailOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { timeAgo, cn } from "@/lib/utils";
import type { Notification } from "@/lib/data/enterprise";

const SEV_VARIANT: Record<Notification["severity"], "destructive" | "warning" | "secondary"> = {
  critical: "destructive",
  warning: "warning",
  info: "secondary",
};

export function NotificationCenter({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [filter, setFilter] = React.useState("All");

  const refresh = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.notifications || []);
  };

  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    refresh();
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    refresh();
  };

  const filtered = filter === "All" ? items : filter === "Unread" ? items.filter((n) => !n.read) : items.filter((n) => n.severity === filter.toLowerCase());
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: "All", label: `All · ${items.length}` },
            { id: "Unread", label: `Unread · ${unread}` },
            { id: "Critical", label: `Critical · ${items.filter((n) => n.severity === "critical").length}` },
            { id: "Warning", label: `Warning · ${items.filter((n) => n.severity === "warning").length}` },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={markAll} disabled={unread === 0}>
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No notifications here.</CardContent></Card>
        ) : (
          filtered.map((n) => (
            <Card key={n.id} className={cn("transition-colors", !n.read && "border-primary/40")}>
              <CardContent className="flex items-start gap-3 p-4">
                <Badge variant={SEV_VARIANT[n.severity]} className="mt-0.5 shrink-0">{n.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-semibold", !n.read && "text-primary")}>{n.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <div className="mt-1 text-[11px] text-muted-foreground/70">
                    {n.type.replace(/_/g, " ")} · {timeAgo(n.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {n.read ? (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><MailOpen className="h-3 w-3" /> read</span>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => markOne(n.id)}>
                      <CheckCheck className="h-3 w-3" /> mark read
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => router.push(n.link)}>
                    Open →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
