"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, Loader2, FileSpreadsheet, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { DATASETS } from "@/lib/data/enterprise";
import type { ValidationSummary } from "@/app/api/csv/validate/route";
import { cn } from "@/lib/utils";

const SEV_META = {
  error: { label: "error", icon: XCircle, tone: "text-destructive" },
  warning: { label: "warning", icon: AlertTriangle, tone: "text-warning" },
} as const;

export function CsvUpload() {
  const [fileName, setFileName] = React.useState("");
  const [content, setContent] = React.useState("");
  const [preview, setPreview] = React.useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [target, setTarget] = React.useState("ds1");
  const [summary, setSummary] = React.useState<ValidationSummary | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [approved, setApproved] = React.useState(false);

  const onFile = async (file: File) => {
    setFileName(file.name);
    setSummary(null);
    setApproved(false);
    const text = await file.text();
    setContent(text);
    const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1, 9).map((l) => l.split(","));
    setPreview({ headers, rows });
  };

  const validate = async () => {
    if (!fileName || !preview || !content) return;
    setBusy(true);
    try {
      const res = await fetch("/api/csv/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, content, target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setSummary(data.summary);
      toast.success(`Validated ${data.summary.rows} rows`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Validate a file against the target dataset schema and business rules before load.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
              <UploadCloud className="h-8 w-8 text-primary" />
              <div className="text-sm font-medium">{fileName || "Drop a CSV here"}</div>
              <div className="text-xs text-muted-foreground">or click to browse · max 10 MB</div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
            <div className="grid gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">Target dataset</div>
              <Select
                options={DATASETS.map((d) => ({ value: d.id, label: d.name }))}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <Button onClick={validate} disabled={!fileName || busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Validate file
            </Button>
            {approved ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Approved and queued for load to {DATASETS.find((d) => d.id === target)?.name}.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {preview ? (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> {fileName}</CardTitle>
              <CardDescription>First rows preview</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{preview.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="font-mono text-[11px]">{c}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="xl:col-span-2">
        {summary ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Validation report</CardTitle>
                  <Badge variant={summary.status === "CLEAN" ? "success" : summary.stats.schemaErrors || summary.stats.missingValues || summary.stats.ruleViolations ? "destructive" : "warning"}>
                    {summary.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: "Rows", value: summary.rows },
                    { label: "Columns", value: summary.columns },
                    { label: "Missing", value: summary.stats.missingValues },
                    { label: "Duplicates", value: summary.stats.duplicates },
                    { label: "Outliers", value: summary.stats.outliers },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/60 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                      <div className="mt-0.5 text-lg font-semibold tabular">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={summary.stats.schemaErrors ? "destructive" : "success"}>schema {summary.stats.schemaErrors}</Badge>
                  <Badge variant={summary.stats.ruleViolations ? "destructive" : "success"}>rule violations {summary.stats.ruleViolations}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Issues</CardTitle>
                <CardDescription>{summary.issues.length} found · suggested fixes inline</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>Column</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Suggested fix</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.issues.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-success"><CheckCircle2 className="mx-auto mb-1 h-5 w-5" /> File is clean - no issues detected.</TableCell></TableRow>
                    ) : (
                      summary.issues.map((iss, i) => {
                        const meta = SEV_META[iss.severity];
                        const Icon = meta.icon;
                        return (
                          <TableRow key={i}>
                            <TableCell><span className={cn("flex items-center gap-1 text-xs font-medium", meta.tone)}><Icon className="h-3.5 w-3.5" />{meta.label}</span></TableCell>
                            <TableCell><Badge variant="outline">{iss.category}</Badge></TableCell>
                            <TableCell className="font-mono text-[11px]">{iss.row}</TableCell>
                            <TableCell className="font-mono text-[11px]">{iss.column ?? "-"}</TableCell>
                            <TableCell className="max-w-[16rem] text-xs">{iss.message}</TableCell>
                            <TableCell className="max-w-[16rem] text-xs text-muted-foreground">{iss.suggestedFix}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSummary(null)}>Discard</Button>
              <Button
                onClick={() => {
                  setApproved(true);
                  toast.success("File approved for load");
                }}
                disabled={summary.stats.schemaErrors > 0 || summary.stats.missingValues > 0 || summary.stats.ruleViolations > 0 || approved}
              >
                Approve & load
              </Button>
            </div>
          </div>
        ) : (
          <Card className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 p-10 text-center">
            <UploadCloud className="h-10 w-10 text-muted-foreground/40" />
            <div className="text-sm font-medium">No validation yet</div>
            <div className="max-w-sm text-xs text-muted-foreground">
              Upload a CSV and pick a target dataset to run schema, missing-value, duplicate, outlier and business-rule checks before anything lands in the warehouse.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
