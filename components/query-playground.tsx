"use client";

import * as React from "react";
import { toast } from "sonner";
import { Play, Download, Wand2, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { SAMPLE_QUERIES, TABLE_NAMES } from "@/lib/data/playground";
import type { SqlResult } from "@/lib/data/playground";

export function QueryPlayground() {
  const [sql, setSql] = React.useState(SAMPLE_QUERIES[1].sql);
  const [result, setResult] = React.useState<SqlResult | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [table, setTable] = React.useState("transactions");

  const run = async (query?: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/playground/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query ?? sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      setResult(data.result);
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    try {
      const mod = await import("@/lib/data/playground");
      const gen = mod.generateSql({ dataset: table, metric: "amount_usd", aggregation: "SUM", dimensions: ["region_name"], timeWindow: "30d" });
      setSql(gen);
      toast.success("SQL generated from spec");
    } catch {
      toast.error("Failed to generate SQL");
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const head = result.headers.join(",");
    const lines = result.rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query-result.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported query result");
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>SQL editor</CardTitle>
                <CardDescription>Runs against the governed demo warehouse (transactions, products, regions, customers, dq_health, query_cost, pipelines)</CardDescription>
              </div>
              <Badge variant="outline"><Database className="h-3 w-3" /> {TABLE_NAMES.length} tables</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <Select
                  options={SAMPLE_QUERIES.map((s, i) => ({ value: String(i), label: s.label }))}
                  placeholder="Load a sample query…"
                  value=""
                  onChange={(e) => {
                    const s = SAMPLE_QUERIES[Number(e.target.value)];
                    if (s) setSql(s.sql);
                  }}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={generate}>
                <Wand2 className="h-3.5 w-3.5" /> Generate from spec
              </Button>
              <div className="ml-auto flex gap-2">
                <Button size="sm" className="h-9 gap-1.5" onClick={() => run()} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCsv} disabled={!result}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </div>
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              className="min-h-48 resize-y font-mono text-xs leading-relaxed"
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {result ? `${result.rows.length.toLocaleString()} rows · ${result.headers.length} cols · ${result.scanned.toLocaleString()} rows scanned · ${result.ms}ms` : "Run a query to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive">{error}</div>
            ) : result ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>{result.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        {r.map((v, j) => <TableCell key={j} className="font-mono text-[11px]">{String(v)}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">No results yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Tables</CardTitle>
            <CardDescription>Available relations in the playground</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {TABLE_NAMES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTable(t);
                  setSql(`SELECT * FROM ${t} LIMIT 100`);
                }}
                className="rounded-lg border border-border/60 px-3 py-2 text-left font-mono text-xs transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <ul className="list-inside list-disc space-y-1.5">
              <li>Support: SELECT / WHERE / GROUP BY / ORDER BY / LIMIT</li>
              <li>Functions: SUM, COUNT, COUNT(DISTINCT), AVG, MIN, MAX, ROUND, ABS, LOWER, UPPER</li>
              <li>Use string dates like <code className="font-mono">txn_date {">="} &apos;2026-06-14&apos;</code></li>
              <li>Output is capped at 200 rows; scans are metered.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
