"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Database, Target, Siren, BookOpen, Store, ShieldCheck, Workflow, LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/data/search";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  dataset: <Database className="h-3.5 w-3.5" />,
  column: <FileText className="h-3.5 w-3.5" />,
  kpi: <Target className="h-3.5 w-3.5" />,
  incident: <Siren className="h-3.5 w-3.5" />,
  glossary: <BookOpen className="h-3.5 w-3.5" />,
  product: <Store className="h-3.5 w-3.5" />,
  rule: <ShieldCheck className="h-3.5 w-3.5" />,
  pipeline: <Workflow className="h-3.5 w-3.5" />,
  dashboard: <LayoutGrid className="h-3.5 w-3.5" />,
};

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Every state update is deferred into the debounce timer. Setting state
  // synchronously in the effect body triggers a cascading render on each
  // keystroke, which React flags and which the debounce exists to avoid.
  React.useEffect(() => {
    if (!open || !q.trim()) {
      const clear = setTimeout(() => {
        setResults((prev) => (prev.length ? [] : prev));
        setLoading((prev) => (prev ? false : prev));
      }, 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const groups = ["dataset", "kpi", "incident", "glossary", "product", "rule", "pipeline", "dashboard", "column"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search datasets, KPIs, incidents…</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[34rem] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].href);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Type to search across the enterprise catalog…"
            className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-96">
          <div className="p-1.5">
            {!q.trim() ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Try “GMV”, “chargeback”, “SLA”, “customer”, “cost”…
              </div>
            ) : loading ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for “{q}”</div>
            ) : (
              groups
                .map((g) => ({ g, items: results.filter((r) => r.type === g) }))
                .filter((x) => x.items.length > 0)
                .map(({ g, items }) => (
                  <div key={g} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g} · {items.length}
                    </div>
                    {items.map((r, i) => (
                      <button
                        key={g + i}
                        onClick={() => go(r.href)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                          {TYPE_ICONS[r.type] || <FileText className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{r.subtitle}</span>
                        </span>
                        {r.snippet ? <span className="hidden max-w-[10rem] truncate text-[11px] text-muted-foreground/70 xl:block">{r.snippet}</span> : null}
                      </button>
                    ))}
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
