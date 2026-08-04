// Browser/server-safe mini SQL engine over seeded demo tables.
// Supports SELECT with WHERE / GROUP BY / ORDER BY / LIMIT and aggregate
// functions (SUM, COUNT, COUNT DISTINCT, AVG, MIN, MAX, ROUND, ABS).

import { seedData, REGION_NAMES } from "./core";

export interface PlaygroundTable {
  transactions: Record<string, unknown>[];
  products: Record<string, unknown>[];
  regions: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  dq_health: Record<string, unknown>[];
  query_cost: Record<string, unknown>[];
  pipelines: Record<string, unknown>[];
}

function buildTables(): PlaygroundTable {
  const d = seedData();
  const rnd = mulberry(20260714);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

  const products = Array.from({ length: 60 }, (_, i) => ({
    product_id: "SKU-" + (880000 + i),
    name: "Product " + i,
    category: pick(["Consumer Electronics", "Apparel", "Home & Garden", "Health & Beauty", "Financial Services", "Industrial"]),
    list_price: Math.round(logn(4.5, 0.8) * 100) / 100,
  }));
  const regions = REGION_NAMES.map((r, i) => ({ region_key: i + 1, region_name: r, currency_code: ["USD", "EUR", "JPY", "BRL", "AED"][i] }));
  const customers = Array.from({ length: 400 }, (_, i) => ({
    customer_id: "C" + (10000 + i),
    segment: pick(["Enterprise", "Mid-Market", "SMB"]),
    tier: pick(["Platinum", "Gold", "Silver", "Bronze"]),
    country: pick(REGION_NAMES),
  }));
  const dq = d.dqDaily.filter((x) => x.date >= "2026-06-01").map((x) => ({ score_date: x.date, data_product: x.product, dq_score: x.score }));
  const cost = d.costUsers.map((c) => ({ user_email: c.email, team: c.team, cost_usd: c.cost, gb_processed: c.gb }));
  const pipelines = d.pipelines.slice(-120).map((p) => ({ run_date: p.date, pipeline: p.pipeline, status: p.status, rows_written: p.rows }));

  return {
    transactions: d.playgroundTxns.map((t) => ({ ...t })),
    products,
    regions,
    customers,
    dq_health: dq,
    query_cost: cost,
    pipelines,
  };
}

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const logn = (mu: number, sigma: number) => Math.exp(mu + sigma * 0.3);

export const PLAYGROUND_TABLES = buildTables();
export const TABLE_NAMES = Object.keys(PLAYGROUND_TABLES);

/* ================= tokenizer ================= */
function tokenize(sql: string): string[] {
  sql = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const tokens: string[] = [];
  const re = /'(?:[^']|'')*'|"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|>=|<=|<>|!=|[()*,\-+;=<>]|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const t = m[0];
    if (/^\s+$/.test(t)) continue;
    tokens.push(t);
  }
  return tokens;
}
const isWord = (t?: string) => !!t && /^[A-Za-z_][A-Za-z0-9_]*$/.test(t) && !t.startsWith("'") && !t.startsWith('"');
const num = (t?: string) => (t && /^\d/.test(t) ? parseFloat(t) : NaN);
const KEYWORDS = new Set(["SELECT", "DISTINCT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "AS", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS", "NULL", "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "ABS", "LOWER", "UPPER", "TRUE", "FALSE"]);

type Expr =
  | { kind: "lit"; value: unknown }
  | { kind: "col"; name: string; table?: string }
  | { kind: "star" }
  | { kind: "fn"; fn: string; distinct: boolean; args: Expr[] }
  | { kind: "bin"; op: string; left: Expr; right: Expr }
  | { kind: "not"; expr: Expr }
  | { kind: "in"; expr: Expr; list: Expr[]; negate: boolean }
  | { kind: "like"; expr: Expr; pattern: Expr; negate: boolean }
  | { kind: "between"; expr: Expr; lo: Expr; hi: Expr }
  | { kind: "isnull"; expr: Expr; negate: boolean };

interface ParseResult {
  node: Expr;
  i: number;
}

function parseExpr(tokens: string[], i: number): ParseResult {
  return parseOr(tokens, i);
}
function parseOr(tokens: string[], i: number): ParseResult {
  let r = parseAnd(tokens, i);
  while (r.i < tokens.length && tokens[r.i].toUpperCase() === "OR") {
    const right = parseAnd(tokens, r.i + 1);
    r = { node: { kind: "bin", op: "OR", left: r.node, right: right.node }, i: right.i };
  }
  return r;
}
function parseAnd(tokens: string[], i: number): ParseResult {
  let r = parseNot(tokens, i);
  while (r.i < tokens.length && tokens[r.i].toUpperCase() === "AND") {
    const right = parseNot(tokens, r.i + 1);
    r = { node: { kind: "bin", op: "AND", left: r.node, right: right.node }, i: right.i };
  }
  return r;
}
function parseNot(tokens: string[], i: number): ParseResult {
  if (tokens[i] && tokens[i].toUpperCase() === "NOT") {
    const r = parseNot(tokens, i + 1);
    return { node: { kind: "not", expr: r.node }, i: r.i };
  }
  return parseCmp(tokens, i);
}
function parsePrimary(tokens: string[], i: number): ParseResult {
  const t = tokens[i];
  if (t === undefined) throw new Error("Unexpected end of expression");
  const up = t.toUpperCase();
  if (t === "(") {
    const inner = parseExpr(tokens, i + 1);
    if (tokens[inner.i] !== ")") throw new Error("Missing )");
    return { node: inner.node, i: inner.i + 1 };
  }
  if (t === "*") return { node: { kind: "star" }, i: i + 1 };
  if (t[0] === "'" || t[0] === '"') return { node: { kind: "lit", value: t.slice(1, -1).replace(/''/g, "'") }, i: i + 1 };
  const n = num(t);
  if (!isNaN(n)) return { node: { kind: "lit", value: n }, i: i + 1 };
  if (up === "TRUE") return { node: { kind: "lit", value: true }, i: i + 1 };
  if (up === "FALSE") return { node: { kind: "lit", value: false }, i: i + 1 };
  if (up === "NULL") return { node: { kind: "lit", value: null }, i: i + 1 };
  if (isWord(t)) {
    const next = tokens[i + 1];
    if (next === "(" && ["COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "ABS", "LOWER", "UPPER"].includes(up)) {
      const args: Expr[] = [];
      let j = i + 2;
      let distinct = false;
      if (tokens[j] && tokens[j].toUpperCase() === "DISTINCT") { distinct = true; j++; }
      while (tokens[j] !== ")") {
        const e = parseExpr(tokens, j);
        args.push(e.node);
        j = e.i;
        if (tokens[j] === ",") j++;
      }
      return { node: { kind: "fn", fn: up, distinct, args }, i: j + 1 };
    }
    const name = t.toLowerCase();
    const j = i + 1;
    if (tokens[j] === ".") return { node: { kind: "col", table: name, name: (tokens[j + 1] || "").toLowerCase() }, i: j + 2 };
    return { node: { kind: "col", name }, i: i + 1 };
  }
  throw new Error("Unexpected token: " + t);
}
function parseCmp(tokens: string[], i: number): ParseResult {
  const r = parsePrimary(tokens, i);
  if (r.i >= tokens.length) return r;
  let negate = false;
  const up = tokens[r.i] ? tokens[r.i].toUpperCase() : "";
  let op: string | null = null;
  if (["=", "!=", "<>", ">", "<", ">=", "<="].includes(tokens[r.i])) { op = tokens[r.i]; r.i++; }
  else if (up === "LIKE") { op = "LIKE"; r.i++; }
  else if (up === "IN") { op = "IN"; r.i++; }
  else if (up === "IS") {
    r.i++;
    if (tokens[r.i] && tokens[r.i].toUpperCase() === "NOT") { negate = true; r.i++; }
    if (tokens[r.i] && tokens[r.i].toUpperCase() === "NULL") return { node: { kind: "isnull", expr: r.node, negate }, i: r.i + 1 };
    throw new Error("IS must be followed by NULL");
  }
  else if (up === "BETWEEN") {
    r.i++;
    const lo = parsePrimary(tokens, r.i);
    const hi = parsePrimary(tokens, lo.i + (tokens[lo.i] && tokens[lo.i].toUpperCase() === "AND" ? 1 : 0));
    return { node: { kind: "between", expr: r.node, lo: lo.node, hi: hi.node }, i: hi.i };
  }
  else return r;

  if (op === "IN") {
    if (tokens[r.i] !== "(") throw new Error("IN expects ( list )");
    r.i++;
    const list: Expr[] = [];
    while (tokens[r.i] !== ")") {
      const e = parsePrimary(tokens, r.i);
      list.push(e.node);
      r.i = e.i;
      if (tokens[r.i] === ",") r.i++;
    }
    return { node: { kind: "in", expr: r.node, list, negate }, i: r.i + 1 };
  }
  const right = parsePrimary(tokens, r.i);
  return { node: { kind: "bin", op, left: r.node, right: right.node }, i: right.i };
}

function parseColumnList(tokens: string[], i: number) {
  const cols: { expr: Expr; alias: string | null }[] = [];
  while (i < tokens.length) {
    const e = parseExpr(tokens, i);
    i = e.i;
    let alias: string | null = null;
    if (tokens[i] && tokens[i].toUpperCase() === "AS") { alias = (tokens[i + 1] || "").toLowerCase(); i += 2; }
    else if (tokens[i] && isWord(tokens[i]) && !KEYWORDS.has(tokens[i].toUpperCase())) { alias = tokens[i].toLowerCase(); i++; }
    cols.push({ expr: e.node, alias });
    if (tokens[i] === ",") { i++; continue; }
    break;
  }
  return { cols, i };
}

interface Query {
  columns: { expr: Expr; alias: string | null }[];
  from: string;
  where: Expr | null;
  groupBy: { expr: Expr; alias: string | null }[];
  orderBy: { expr: Expr; desc: boolean }[];
  limit: number | null;
  distinct: boolean;
}

export function parseSelect(sql: string): Query {
  const tokens = tokenize(sql).filter((t) => t !== ";");
  let i = 0;
  if (!tokens[i] || tokens[i].toUpperCase() !== "SELECT") throw new Error("Only SELECT queries are supported");
  i++;
  let distinct = false;
  if (tokens[i] && tokens[i].toUpperCase() === "DISTINCT") { distinct = true; i++; }
  const sel = parseColumnList(tokens, i);
  i = sel.i;
  if (!tokens[i] || tokens[i].toUpperCase() !== "FROM") throw new Error("Expected FROM");
  i++;
  if (!tokens[i]) throw new Error("Missing table name");
  const from = tokens[i].toLowerCase(); i++;
  let where: Expr | null = null;
  if (tokens[i] && tokens[i].toUpperCase() === "WHERE") { const w = parseExpr(tokens, i + 1); where = w.node; i = w.i; }
  let groupBy: Query["groupBy"] = [];
  if (tokens[i] && tokens[i].toUpperCase() === "GROUP") {
    if (tokens[i + 1] && tokens[i + 1].toUpperCase() === "BY") {
      i += 2;
      const gl = parseColumnList(tokens, i);
      groupBy = gl.cols;
      i = gl.i;
    }
  }
  if (tokens[i] && tokens[i].toUpperCase() === "HAVING") throw new Error("HAVING is not supported in the sandbox");
  const orderBy: Query["orderBy"] = [];
  if (tokens[i] && tokens[i].toUpperCase() === "ORDER") {
    if (tokens[i + 1] && tokens[i + 1].toUpperCase() === "BY") {
      i += 2;
      while (i < tokens.length) {
        const e = parseExpr(tokens, i);
        i = e.i;
        let desc = false;
        if (tokens[i] && tokens[i].toUpperCase() === "DESC") { desc = true; i++; }
        else if (tokens[i] && tokens[i].toUpperCase() === "ASC") { i++; }
        orderBy.push({ expr: e.node, desc });
        if (tokens[i] === ",") { i++; continue; }
        break;
      }
    }
  }
  let limit: number | null = null;
  if (tokens[i] && tokens[i].toUpperCase() === "LIMIT") {
    limit = parseInt(tokens[i + 1], 10);
    if (isNaN(limit)) throw new Error("LIMIT expects a number");
    i += 2;
  }
  if (tokens[i]) throw new Error("Unexpected token after query: " + tokens[i]);
  return { columns: sel.cols, from, where, groupBy, orderBy, limit, distinct };
}

/* ================= evaluation ================= */
const AGG = new Set(["SUM", "COUNT", "AVG", "MIN", "MAX"]);

function resolveCol(row: Record<string, unknown>, tableName: string, col: { name: string; table?: string }): unknown {
  if (col.table && col.table !== tableName) return undefined;
  const k = col.name;
  if (k in row) return row[k];
  const low = Object.keys(row).find((ck) => ck.toLowerCase() === k);
  return low !== undefined ? row[low] : undefined;
}

type AggCtx = ((fn: string, arg: Expr | undefined, distinct: boolean) => unknown) | null;

function evalExpr(node: Expr, row: Record<string, unknown>, tableName: string, agg: AggCtx): unknown {
  switch (node.kind) {
    case "lit": return node.value;
    case "col": return resolveCol(row, tableName, node);
    case "star": throw new Error("* only valid in COUNT(*)");
    case "fn": {
      if (AGG.has(node.fn)) {
        if (!agg) throw new Error(node.fn + " requires GROUP BY context");
        return agg(node.fn, node.args[0], node.distinct);
      }
      const vals = node.args.map((a) => evalExpr(a, row, tableName, agg));
      if (node.fn === "ROUND") { const n = (vals[0] as number) || 0; const d = (vals[1] as number) || 0; return Math.round(n * Math.pow(10, d)) / Math.pow(10, d); }
      if (node.fn === "ABS") return Math.abs(vals[0] as number);
      if (node.fn === "LOWER") return String(vals[0]).toLowerCase();
      if (node.fn === "UPPER") return String(vals[0]).toUpperCase();
      throw new Error("Unknown function " + node.fn);
    }
    case "bin": {
      if (node.op === "AND") return !!evalExpr(node.left, row, tableName, agg) && !!evalExpr(node.right, row, tableName, agg);
      if (node.op === "OR") return !!evalExpr(node.left, row, tableName, agg) || !!evalExpr(node.right, row, tableName, agg);
      if (node.op === "LIKE") return like(evalExpr(node.left, row, tableName, agg), evalExpr(node.right, row, tableName, agg));
      const l = evalExpr(node.left, row, tableName, agg);
      const r = evalExpr(node.right, row, tableName, agg);
      switch (node.op) {
        case "=": return l == r;
        case "!=": case "<>": return l != r;
        case ">": return (l as number) > (r as number);
        case "<": return (l as number) < (r as number);
        case ">=": return (l as number) >= (r as number);
        case "<=": return (l as number) <= (r as number);
      }
      throw new Error("Unknown operator " + node.op);
    }
    case "not": return !evalExpr(node.expr, row, tableName, agg);
    case "in": {
      const v = evalExpr(node.expr, row, tableName, agg);
      const hit = node.list.some((x) => v == evalExpr(x, row, tableName, agg));
      return node.negate ? !hit : hit;
    }
    case "between": {
      const v = evalExpr(node.expr, row, tableName, agg);
      return (v as number) >= (evalExpr(node.lo, row, tableName, agg) as number) && (v as number) <= (evalExpr(node.hi, row, tableName, agg) as number);
    }
    case "isnull": {
      const v = evalExpr(node.expr, row, tableName, agg);
      return node.negate ? v !== null && v !== undefined : v === null || v === undefined;
    }
  }
}

function like(val: unknown, pat: unknown): boolean {
  const re = new RegExp("^" + String(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
  return re.test(String(val));
}

function exprLabel(node: Expr): string {
  if (node.kind === "col") return node.name;
  if (node.kind === "fn") return node.fn + "(" + node.args.map(exprLabel).join(", ") + ")";
  if (node.kind === "lit") return String(node.value);
  return "expr";
}

function containsAgg(node: Expr): boolean {
  if (node.kind === "fn" && AGG.has(node.fn)) return true;
  if (node.kind === "fn") return node.args.some(containsAgg);
  if (node.kind === "bin") return containsAgg(node.left) || containsAgg(node.right);
  if (node.kind === "not" || node.kind === "isnull") return containsAgg(node.expr);
  if (node.kind === "in") return containsAgg(node.expr) || node.list.some(containsAgg);
  if (node.kind === "between") return containsAgg(node.expr) || containsAgg(node.lo) || containsAgg(node.hi);
  return false;
}

export interface SqlResult {
  headers: string[];
  rows: unknown[][];
  scanned: number;
  ms: number;
}

export function runSql(sql: string): SqlResult {
  const q = parseSelect(sql);
  const rows = (PLAYGROUND_TABLES as unknown as Record<string, Record<string, unknown>[]>)[q.from];
  if (!rows) throw new Error("Unknown table: " + q.from + " (available: " + TABLE_NAMES.join(", ") + ")");
  const t0 = Date.now();
  const filtered = rows.filter((r) => !q.where || evalExpr(q.where, r, q.from, null));

  const hasAgg = q.columns.some((c) => containsAgg(c.expr));
  const implicitGroup = q.groupBy.length === 0 && hasAgg;

  let headers: string[];
  let outRows: unknown[][];

  if (q.groupBy.length || implicitGroup) {
    const groups = new Map<string, Record<string, unknown>[]>();
    if (implicitGroup) {
      groups.set("all", filtered);
    } else {
      for (const r of filtered) {
        const key = q.groupBy.map((g) => String(evalExpr(g.expr, r, q.from, null))).join("¦");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
    }
    headers = q.columns.map((c) => c.alias || exprLabel(c.expr));
    const extraKeys = q.groupBy.filter((g) => !headers.includes(exprLabel(g.expr)));
    const extraLabels = extraKeys.map((g) => exprLabel(g.expr));
    headers = extraLabels.concat(headers);

    outRows = [];
    for (const grp of groups.values()) {
      const aggFn: NonNullable<AggCtx> = (fn, arg, distinct) => {
        const st = { sum: 0, cnt: 0, cntD: new Set<string>(), min: Infinity, max: -Infinity, started: false };
        for (const rr of grp) {
          const av = arg && arg.kind === "star" ? 1 : evalExpr(arg!, rr, q.from, null);
          st.started = true;
          if (av === 1 && arg && arg.kind === "star") { if (fn === "COUNT") { distinct ? st.cntD.add("1") : st.cnt++; } continue; }
          if (av === null || av === undefined) continue;
          if (fn === "COUNT") { if (distinct) st.cntD.add(String(av)); else st.cnt++; }
          else { st.sum += av as number; st.cnt++; if ((av as number) < st.min) st.min = av as number; if ((av as number) > st.max) st.max = av as number; }
        }
        switch (fn) {
          case "COUNT": return distinct ? st.cntD.size : st.cnt;
          case "SUM": return st.sum;
          case "AVG": return st.cnt ? st.sum / st.cnt : null;
          case "MIN": return st.started ? st.min : null;
          case "MAX": return st.started ? st.max : null;
        }
        return null;
      };
      const vals: unknown[] = [];
      extraKeys.forEach((g) => vals.push(evalExpr(g.expr, grp[0], q.from, null)));
      q.columns.forEach((c) => vals.push(containsAgg(c.expr) ? evalExpr(c.expr, grp[0], q.from, aggFn) : evalExpr(c.expr, grp[0], q.from, null)));
      outRows.push(vals);
    }
  } else {
    headers = q.columns.map((c) => c.alias || exprLabel(c.expr));
    outRows = filtered.map((r) => q.columns.map((c) => evalExpr(c.expr, r, q.from, null)));
  }

  if (q.orderBy.length) {
    outRows.sort((a, b) => {
      for (const ob of q.orderBy) {
        const idx = headers.indexOf(exprLabel(ob.expr));
        if (idx < 0) continue;
        const va = a[idx], vb = b[idx];
        if (va === vb || (va === undefined && vb === undefined)) continue;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        const cmp = (va as number) < (vb as number) ? -1 : (va as number) > (vb as number) ? 1 : 0;
        return ob.desc ? -cmp : cmp;
      }
      return 0;
    });
  }
  if (q.distinct) {
    const seen = new Set<string>();
    outRows = outRows.filter((o) => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const limit = q.limit === null ? 100 : Math.min(q.limit, 200);
  return { headers, rows: outRows.slice(0, limit), scanned: filtered.length, ms: Date.now() - t0 };
}

/* ================= SQL generation ================= */
export interface KpiSpec {
  dataset: string;
  metric: string;
  aggregation: string;
  dimensions: string[];
  timeWindow: string;
}

export function generateSql(spec: KpiSpec): string {
  const dims = spec.dimensions.length ? spec.dimensions.join(", ") + ", " : "";
  const metric = spec.aggregation === "COUNT DISTINCT" ? `COUNT(DISTINCT ${spec.metric})` : `${spec.aggregation}(${spec.metric})`;
  const win =
    spec.timeWindow === "1d" ? "CURRENT_DATE()"
    : spec.timeWindow === "7d" ? "DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
    : spec.timeWindow === "30d" ? "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)"
    : spec.timeWindow === "90d" ? "DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)"
    : "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)";
  const group = spec.dimensions.length ? ` GROUP BY ${spec.dimensions.join(", ")}` : "";
  return `SELECT ${dims}${metric} AS value\nFROM ${spec.dataset}\nWHERE txn_date >= ${win}\n  AND status = 'POSTED'${group};`;
}

export const SAMPLE_QUERIES: { label: string; sql: string }[] = [
  { label: "Top merchants by spend", sql: "SELECT customer_id AS merchant, ROUND(SUM(amount_usd),2) AS spend FROM transactions WHERE status='POSTED' AND amount_usd>0 GROUP BY customer_id ORDER BY spend DESC LIMIT 10" },
  { label: "GMV by region", sql: "SELECT region_name, ROUND(SUM(amount_usd),2) AS gmv FROM transactions WHERE status='POSTED' AND amount_usd>0 GROUP BY region_name ORDER BY gmv DESC" },
  { label: "Top categories & customers", sql: "SELECT product_category, ROUND(SUM(amount_usd),2) AS gmv, COUNT(DISTINCT customer_id) AS customers FROM transactions WHERE txn_date >= '2026-06-14' AND status='POSTED' GROUP BY product_category ORDER BY gmv DESC" },
  { label: "Channel performance", sql: "SELECT channel, COUNT(*) AS txns, ROUND(AVG(amount_usd),2) AS avg_amount FROM transactions WHERE status='POSTED' GROUP BY channel ORDER BY txns DESC" },
  { label: "Refund exposure by channel", sql: "SELECT channel, ROUND(ABS(SUM(amount_usd)),2) AS refunds FROM transactions WHERE txn_type='REFUND' GROUP BY channel ORDER BY refunds DESC LIMIT 5" },
  { label: "DQ score - latest day", sql: "SELECT data_product, dq_score FROM dq_health WHERE score_date='2026-07-14' ORDER BY dq_score ASC" },
  { label: "Top cost users", sql: "SELECT user_email, ROUND(SUM(cost_usd),2) AS spend FROM query_cost GROUP BY user_email ORDER BY spend DESC LIMIT 5" },
  { label: "Pipeline runs & status", sql: "SELECT pipeline, status, COUNT(*) AS runs FROM pipelines WHERE run_date >= '2026-07-01' GROUP BY pipeline, status ORDER BY pipeline" },
  { label: "GMV trend - 10 day", sql: "SELECT txn_date, ROUND(SUM(amount_usd),2) AS gmv FROM transactions WHERE txn_date BETWEEN '2026-07-05' AND '2026-07-14' AND status='POSTED' GROUP BY txn_date ORDER BY txn_date" },
  { label: "Customer mix by tier", sql: "SELECT tier, COUNT(*) AS customers FROM customers GROUP BY tier ORDER BY customers DESC" },
];
