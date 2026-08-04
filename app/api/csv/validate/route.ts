import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DATASETS } from "@/lib/data/enterprise";

interface CsvIssue {
  severity: "error" | "warning";
  category: "SCHEMA" | "MISSING_VALUE" | "DUPLICATE" | "OUTLIER" | "BUSINESS_RULE";
  row: number;
  column?: string;
  message: string;
  suggestedFix: string;
}

export interface ValidationSummary {
  fileName: string;
  rows: number;
  columns: number;
  status: "CLEAN" | "ISSUES_FOUND";
  issues: CsvIssue[];
  stats: {
    missingValues: number;
    duplicates: number;
    outliers: number;
    schemaErrors: number;
    ruleViolations: number;
  };
  approved: boolean;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fileName = String(body.fileName || "upload.csv");
  const content = String(body.content || "");
  const targetId = String(body.target || "ds1");

  const ds = DATASETS.find((d) => d.id === targetId) || DATASETS[0];
  const { headers, rows } = parseCsv(content);
  const issues: CsvIssue[] = [];
  const stats = { missingValues: 0, duplicates: 0, outliers: 0, schemaErrors: 0, ruleViolations: 0 };

  if (!headers.length) return NextResponse.json({ error: "Empty or unparsable CSV" }, { status: 400 });

  const knownCols = new Set(ds.columns.map((c) => c.name.toLowerCase()));
  headers.forEach((h) => {
    if (!knownCols.has(h.toLowerCase())) {
      stats.schemaErrors++;
      issues.push({
        severity: "error",
        category: "SCHEMA",
        row: 1,
        column: h,
        message: `Unknown column "${h}" - not part of ${ds.name} schema.`,
        suggestedFix: `Rename to a registered column or drop it (${ds.columns.slice(0, 3).map((c) => c.name).join(", ")}…).`,
      });
    }
  });

  const seen = new Map<string, number>();
  rows.forEach((row, idx) => {
    const line = idx + 2; // 1-indexed incl header
    headers.forEach((h, ci) => {
      const v = row[ci] === undefined ? "" : row[ci].trim();
      const isRequired = ds.columns.find((c) => c.name.toLowerCase() === h.toLowerCase())?.nullable === false;
      if (isRequired && v === "") {
        stats.missingValues++;
        issues.push({ severity: "error", category: "MISSING_VALUE", row: line, column: h, message: `Missing required value in ${h}.`, suggestedFix: "Fill the value or drop the row." });
      }
    });

    const keyCol = headers.findIndex((h) => h.toLowerCase() === "txn_id" || h.toLowerCase() === "id" || h.toLowerCase() === "case_id");
    if (keyCol >= 0) {
      const key = row[keyCol];
      const prev = seen.get(key);
      if (prev !== undefined) {
        stats.duplicates++;
        issues.push({ severity: "warning", category: "DUPLICATE", row: line, message: `Duplicate key "${key}" (also row ${prev}).`, suggestedFix: "Keep the latest version or dedup before load." });
      } else seen.set(key, line);
    }

    // business rule: negative amounts / invalid status
    const amountIdx = headers.findIndex((h) => h.toLowerCase() === "amount_usd" || h.toLowerCase() === "amount");
    if (amountIdx >= 0) {
      const amt = parseFloat(row[amountIdx]);
      if (!isNaN(amt) && amt < 0 && !row.includes("REFUND") && !row.includes("CHARGEBACK")) {
        stats.ruleViolations++;
        issues.push({ severity: "error", category: "BUSINESS_RULE", row: line, column: headers[amountIdx], message: `Negative amount ${amt} without REFUND/CHARGEBACK type.`, suggestedFix: "Negatives require txn_type REFUND or CHARGEBACK." });
      }
      const statusIdx = headers.findIndex((h) => h.toLowerCase() === "status");
      if (statusIdx >= 0) {
        const st = (row[statusIdx] || "").toUpperCase();
        if (st && !["POSTED", "PENDING", "FAILED", "SUCCESS", "CLOSED", "OPEN"].includes(st)) {
          stats.ruleViolations++;
          issues.push({ severity: "error", category: "BUSINESS_RULE", row: line, column: "status", message: `Invalid status "${st}".`, suggestedFix: "Use POSTED / PENDING / FAILED." });
        }
      }
    }

    // numeric outliers (3+ stdev)
    for (const numHeader of ["amount_usd", "amount", "list_price"]) {
      const nIdx = headers.findIndex((h) => h.toLowerCase() === numHeader);
      if (nIdx >= 0) {
        const v = parseFloat(row[nIdx]);
        if (!isNaN(v) && Math.abs(v) > 50000) {
          stats.outliers++;
          issues.push({ severity: "warning", category: "OUTLIER", row: line, column: numHeader, message: `Suspicious value ${v}.`, suggestedFix: "Verify against source of truth." });
        }
      }
    }
  });

  const summary: ValidationSummary = {
    fileName,
    rows: rows.length,
    columns: headers.length,
    status: issues.filter((i) => i.severity === "error").length ? "ISSUES_FOUND" : issues.length ? "ISSUES_FOUND" : "CLEAN",
    issues: issues.slice(0, 60),
    stats,
    approved: false,
  };
  return NextResponse.json({ summary });
}
