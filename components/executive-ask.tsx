"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send, Sparkles, Loader2, AlertCircle, Lightbulb, ListChecks, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASK_SUGGESTIONS } from "@/lib/data/executive-ask";
import type { AskResult } from "@/lib/data/executive-ask";
import { cn } from "@/lib/utils";

export function ExecutiveAsk() {
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<AskResult | null>(null);
  const [history, setHistory] = React.useState<{ q: string; r: AskResult }[]>([]);

  const ask = async (question?: string) => {
    const text = (question ?? q).trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ask failed");
      setResult(data.result);
      setHistory((h) => [{ q: text, r: data.result }, ...h].slice(0, 5));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.06]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Ask ZUMIQ</div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Natural-language question mapped to certified KPIs, incidents, pipeline state and recommended actions.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="e.g. Why is our cloud cost up?"
              className="min-h-20"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => ask()} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask
              </Button>
              {ASK_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {q}</CardTitle>
            <CardDescription>Answered from the live platform state (2026-07-14)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{result.answer}</p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {result.kpis.map((k) => (
                <div key={k.name} className="rounded-lg border border-border/60 p-3">
                  <div className="text-[11px] text-muted-foreground">{k.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-lg font-semibold tabular">{k.value}</span>
                    <Badge variant={k.status === "BREACH" ? "destructive" : k.status === "WARNING" ? "warning" : "success"}>{k.status}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><AlertCircle className="h-3.5 w-3.5 text-destructive" /> Possible causes</div>
                <ul className="list-inside list-disc space-y-1.5 text-xs text-muted-foreground">
                  {result.possibleCauses.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ListChecks className="h-3.5 w-3.5 text-success" /> Recommended actions</div>
                <ul className="list-inside list-disc space-y-1.5 text-xs text-muted-foreground">
                  {result.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>

            {result.incidents.length ? (
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Related incidents</div>
                <div className="flex flex-wrap gap-2">
                  {result.incidents.map((i) => (
                    <div key={i.id} className={cn("rounded-lg border border-border/60 px-3 py-2 text-xs")}>
                      <span className="font-mono font-semibold">{i.id}</span> <span className="text-muted-foreground">· {i.title}</span>
                      <div className="mt-1 flex gap-1">
                        <Badge variant={i.severity === "P1" ? "destructive" : "warning"}>{i.severity}</Badge>
                        <Badge variant="outline">{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Workflow className="h-3.5 w-3.5 text-primary" /> Pipeline state</div>
              <div className="flex flex-wrap gap-2">
                {result.pipelineState.map((p) => (
                  <Badge key={p.pipeline} variant={p.status === "HEALTHY" ? "success" : "destructive"}>{p.pipeline} · {p.status}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ask a question above, or pick a suggestion. Answers cite live KPIs and incidents.
          </CardContent>
        </Card>
      )}

      {history.length > 1 ? (
        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Recent questions</div>
          <div className="flex flex-col gap-1.5">
            {history.slice(1).map((h, i) => (
              <button key={i} onClick={() => { setQ(h.q); setResult(h.r); }} className="rounded-lg border border-border/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                {h.q}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
