"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/data/enterprise";

const SEV: Record<Notification["severity"], { label: string; variant: "destructive" | "warning" | "secondary" }> = {
  critical: { label: "critical", variant: "destructive" },
  warning: { label: "warning", variant: "warning" },
  info: { label: "info", variant: "secondary" },
};

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.notifications || []);
    } catch {
      /* noop */
    }
  }, []);

  // Deferred by a tick so the fetch is not kicked off synchronously during the
  // effect, which React flags as a cascading-render risk.
  React.useEffect(() => {
    const t = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(t);
  }, [load, open]);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    load();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[24rem] p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold">Notifications</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground" onClick={markAll}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          <div className="flex flex-col">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">You’re all caught up.</div>
            ) : (
              items.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }).then(load);
                    setOpen(false);
                    router.push(n.link);
                  }}
                  className={cn("flex flex-col gap-1 border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/40", !n.read && "bg-primary/[0.03]")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-xs font-semibold", !n.read && "text-primary")}>{n.title}</span>
                    <Badge variant={SEV[n.severity].variant}>{SEV[n.severity].label}</Badge>
                  </div>
                  <span className="line-clamp-2 text-[11px] text-muted-foreground">{n.body}</span>
                  <span className="text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
