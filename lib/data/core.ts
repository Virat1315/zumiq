// Deterministic synthetic data generator for ZUMIQ.
// All values derive from a fixed seed so every run produces identical data
// (mirrors the production BigQuery schema at aggregate grain).

export interface DailyMetric {
  date: string;
  value: number;
}

export interface BuRevenue {
  date: string;
  bu: string;
  gmv: number;
  orders: number;
}

export interface RegionRevenue {
  date: string;
  region: string;
  gmv: number;
}

export interface ChannelRevenue {
  date: string;
  channel: string;
  gmv: number;
}

export interface CategoryRevenue {
  date: string;
  category: string;
  gmv: number;
}

export interface OpsDaily {
  date: string;
  events: number;
  failures: number;
  p95Ms: number;
  byService: Record<string, { events: number; failures: number }>;
}

export interface SupportDaily {
  date: string;
  opened: number;
  resolved: number;
  slaRate: number;
  csat: number;
  escalated: number;
}

export interface DqDaily {
  date: string;
  product: string;
  score: number;
  checksRun: number;
  checksFailed: number;
  dimensions: Record<string, number>;
}

export interface CostByUser {
  email: string;
  team: string;
  cost: number;
  gb: number;
  queries: number;
  kind: string;
  runaway?: boolean;
}

export interface TopQuery {
  id: string;
  user: string;
  team: string;
  dataset: string;
  sql: string;
  gb: number;
  cost: number;
  runtimeSec: number;
  cacheHit: boolean;
  timesRun: number;
}

export interface PipelineRun {
  date: string;
  pipeline: string;
  target: string;
  status: "SUCCESS" | "FAILED";
  rows: number;
  durationSec: number;
  dqPassed: boolean;
}

export interface PlaygroundTxn {
  txn_date: string;
  bu_code: string;
  region_name: string;
  channel: string;
  txn_type: string;
  amount_usd: number;
  customer_id: string;
  product_category: string;
  status: string;
}

/* ---------------- seeded PRNG (mulberry32) ---------------- */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const D90 = 90;
const END = Date.UTC(2026, 6, 14);
const MS_DAY = 86400000;
const DATE_RANGE: string[] = [];
for (let i = 0; i < D90; i++) {
  DATE_RANGE.push(new Date(END - (D90 - 1 - i) * MS_DAY).toISOString().slice(0, 10));
}

export const dRange = DATE_RANGE;
export const LAST_DATE = DATE_RANGE[DATE_RANGE.length - 1];
export const ASOF = LAST_DATE;

export const BU_CODES = ["RTL", "BNK", "TEL", "INS", "MNF", "LOG"];
export const REGION_NAMES = ["North America", "Europe", "Asia Pacific", "LATAM", "MEA"];
export const CHANNELS = ["WEB", "MOBILE", "CALL", "BRANCH", "POS", "API", "PARTNER"];
export const CATEGORIES = ["Consumer Electronics", "Apparel", "Home & Garden", "Health & Beauty", "Financial Services", "Industrial"];

export interface SeedData {
  dailyGmv: DailyMetric[];
  gmvBu: BuRevenue[];
  gmvRegion: RegionRevenue[];
  gmvChannel: ChannelRevenue[];
  gmvCategory: CategoryRevenue[];
  opsDaily: OpsDaily[];
  supportDaily: SupportDaily[];
  dqDaily: DqDaily[];
  costDaily: DailyMetric[];
  costUsers: CostByUser[];
  costDatasets: RegionRevenue[];
  topQueries: TopQuery[];
  pipelines: PipelineRun[];
  playgroundTxns: PlaygroundTxn[];
}

function generate(): SeedData {
  const rnd = mulberry32(20260714);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const pickW = (weights: number[]): number => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };
  const logn = (mu: number, sigma: number) => Math.exp(mu + sigma * (rnd() + rnd() + rnd() - 1.5) * (2 / 3));
  const round2 = (x: number) => Math.round(x * 100) / 100;

  // ---- GMV daily ----
  const dailyGmv: DailyMetric[] = [];
  const gmvBu: BuRevenue[] = [];
  const gmvRegion: RegionRevenue[] = [];
  const gmvChannel: ChannelRevenue[] = [];
  const gmvCategory: CategoryRevenue[] = [];

  DATE_RANGE.forEach((date, i) => {
    // S02: 18% volume dip on 2026-07-13
    const volume = date === "2026-07-13" ? 0.82 : 1;
    const gmv = Math.round(93000 * (0.9 + rnd() * 0.2) * volume);
    const orders = Math.round(1180 * (0.92 + rnd() * 0.16) * volume);
    const customers = Math.round(orders * (0.68 + rnd() * 0.06));
    dailyGmv.push({ date, value: gmv });

    BU_CODES.forEach((bu, bi) => {
      const w = [0.3, 0.22, 0.18, 0.11, 0.1, 0.09][bi];
      const delta = 0.9 + rnd() * 0.2;
      gmvBu.push({ date, bu, gmv: Math.round(gmv * w * delta * volume), orders: Math.round(orders * w * delta) });
    });
    REGION_NAMES.forEach((region) => {
      const w = 1 + rnd() * 0.4;
      gmvRegion.push({ date, region, gmv: Math.round((gmv / 5) * w * volume) });
    });
    CHANNELS.forEach((ch) => {
      gmvChannel.push({ date, channel: ch, gmv: Math.round((gmv / 7) * (0.7 + rnd() * 0.6) * volume) });
    });
    CATEGORIES.forEach((cat) => {
      gmvCategory.push({ date, category: cat, gmv: Math.round((gmv / 6) * (0.6 + rnd() * 0.8) * volume) });
    });
  });

  // ---- Ops daily ----
  const SERVICES = ["svc-orders", "svc-pay-1", "svc-pay-3", "svc-auth", "svc-inv", "svc-ship", "svc-bill"];
  const opsDaily: OpsDaily[] = DATE_RANGE.map((date) => {
    const paySpike = date === "2026-07-11" ? 14 : 1;
    const events = Math.round(2600 * (0.9 + rnd() * 0.2));
    const byService: Record<string, { events: number; failures: number }> = {};
    SERVICES.forEach((s) => {
      const ev = Math.round(events / 7);
      let failures = ev * (0.005 + rnd() * 0.02);
      if (s === "svc-pay-3" && date === "2026-07-11") failures = ev * 0.32;
      byService[s] = { events: ev, failures: Math.round(failures) };
    });
    const failures = Object.values(byService).reduce((a, s) => a + s.failures, 0);
    const p95Ms = Math.round(logn(5.8, 0.7));
    return { date, events, failures, p95Ms, byService };
  });

  // ---- Support daily ----
  const supportDaily: SupportDaily[] = DATE_RANGE.map((date) => {
    const spike = date === "2026-07-11" || date === "2026-07-12" ? 3.2 : 1;
    const slaDegrade = date >= "2026-07-01" ? 0.78 : 1;
    const opened = Math.round(150 * spike * (0.9 + rnd() * 0.2));
    const slaRate = Math.round(97 * slaDegrade * (0.96 + rnd() * 0.04));
    const csat = Math.round(((4.2 - (date >= "2026-07-01" ? 0.35 : 0)) + (rnd() - 0.5) * 0.3) * 10) / 10;
    const escalated = Math.round(opened * 0.06 * (spike > 1 ? 1.8 : 1));
    return { date, opened, resolved: Math.round(opened * 0.94), slaRate: Math.min(99, slaRate), csat, escalated };
  });

  // ---- DQ daily ----
  const PRODUCTS = [
    { name: "Enterprise P&L", base: 97 },
    { name: "Customer 360", base: 95 },
    { name: "Operations Health", base: 96 },
    { name: "Support SLA", base: 95 },
    { name: "Platform Health", base: 98 },
    { name: "Data Quality", base: 99 },
  ];
  const DIMS = ["COMPLETENESS", "UNIQUENESS", "VALIDITY", "TIMELINESS", "INTEGRITY", "FRESHNESS", "VOLUME"];
  const dqDaily: DqDaily[] = [];
  DATE_RANGE.forEach((date, i) => {
    PRODUCTS.forEach((p) => {
      let score = p.base + (90 - i) * 0.03 + (rnd() - 0.5) * 2;
      if (p.name === "Customer 360" && date === "2026-07-13") score = 89.4;
      if (p.name === "Support SLA" && date >= "2026-07-01") score -= 1.2;
      score = Math.max(60, Math.min(100, score));
      const checks = 24;
      const checksFailed = Math.max(0, Math.round(((100 - score) / 100) * checks * (0.8 + rnd() * 0.4)));
      const dimensions: Record<string, number> = {};
      DIMS.forEach((d) => (dimensions[d] = round2(Math.min(100, Math.max(60, score + (rnd() - 0.5) * 6)))));
      dqDaily.push({ date, product: p.name, score: round2(score), checksRun: checks, checksFailed, dimensions });
    });
  });

  // ---- Cost daily ----
  const costDaily: DailyMetric[] = DATE_RANGE.map((date) => {
    const runaway = date >= "2026-07-08" && date <= "2026-07-14";
    const cost = runaway ? Math.round(41000 * (0.9 + rnd() * 0.2)) : Math.round(14200 * (0.9 + rnd() * 0.2));
    return { date, value: cost };
  });

  // ---- Cost by user ----
  const FIRST = ["ana", "raj", "mei", "leo", "sofia", "omar", "nina", "kofi", "julia", "chen", "pia", "vik", "lucy", "diego", "hana", "tom", "ira", "sam", "zoe", "rafi"];
  const TEAMS = ["Finance", "Retail", "Banking", "Telecom", "CX", "Platform", "Marketing", "FinOps"];
  const costUsers: CostByUser[] = FIRST.map((f, i) => {
    const base = 600 + rnd() * 1600;
    const gb = base / 0.00625;
    return {
      email: f + "@zumiq.io",
      team: TEAMS[i % TEAMS.length],
      cost: Math.round(base),
      gb: Math.round(gb),
      queries: 320 + Math.round(rnd() * 400),
      kind: pick(["dashboard", "ad_hoc", "extract", "report", "dq_run"]),
    };
  });
  costUsers.push({
    email: "analyst@zumiq.io",
    team: "Marketing",
    cost: 27000,
    gb: 4320000,
    queries: 336,
    kind: "full_scan_extract",
    runaway: true,
  });

  // ---- Cost by dataset ----
  const DATASETS = ["raw_layer", "core_layer", "analytics_layer", "gold_layer", "governance", "ops", "cost"];
  const costDatasets: RegionRevenue[] = DATASETS.map((ds) => ({
    date: ds,
    region: ds,
    gmv: Math.round(6500 + rnd() * 6000),
  }));

  // ---- Top queries ----
  const topQueries: TopQuery[] = Array.from({ length: 12 }, (_, i) => {
    const u = costUsers[i % costUsers.length];
    return {
      id: "QUERY-" + (4200 + i),
      user: u.email,
      team: u.team,
      dataset: pick(DATASETS),
      sql: pick([
        "SELECT * FROM core_layer.fct_transactions WHERE txn_date >= CURRENT_DATE() - 30",
        "SELECT customer_id, SUM(amount_usd) FROM fct_transactions GROUP BY 1",
        "SELECT * FROM analytics_layer.attribution_model",
        "SELECT region, AVG(amount) FROM fct_transactions GROUP BY 1",
        "SELECT * FROM raw_layer.transactions_landing",
        "SELECT bu, SUM(gmv) FROM gold.kpi_executive GROUP BY 1",
      ]),
      gb: Math.round(logn(1, 1.6)),
      cost: Math.round(logn(1, 1.6) * 6.25 * 100) / 100,
      runtimeSec: Math.round(20 + rnd() * 240),
      cacheHit: rnd() < 0.2,
      timesRun: 1 + Math.round(rnd() * 40),
    };
  });
  topQueries[0] = { ...topQueries[0], user: "analyst@zumiq.io", team: "Marketing", gb: 4320, cost: 27000, timesRun: 336, cacheHit: false };

  // ---- Pipelines ----
  const PIPE_DEFS = [
    { p: "SCD2_CUSTOMER", t: "core_layer.dim_customer" },
    { p: "SCD2_PRODUCT", t: "core_layer.dim_product" },
    { p: "FCT_TRANSACTIONS_LOAD", t: "core_layer.fct_transactions" },
    { p: "FCT_OPS_EVENTS_STREAM", t: "core_layer.fct_operations_events" },
    { p: "FCT_SUPPORT_CASES_LOAD", t: "core_layer.fct_support_cases" },
    { p: "EXEC_KPIS_RECOMPUTE", t: "gold_layer.kpi_executive_daily" },
    { p: "COST_GOVERNANCE_SUMMARY", t: "gold_layer.cost_daily_summary" },
    { p: "DQ_ENGINE_DAILY", t: "governance.dq_health_daily" },
  ];
  const pipelines: PipelineRun[] = [];
  DATE_RANGE.forEach((date) => {
    PIPE_DEFS.forEach((def) => {
      let status: "SUCCESS" | "FAILED" = rnd() < 0.045 ? "FAILED" : "SUCCESS";
      if (def.p === "FCT_TRANSACTIONS_LOAD" && date >= "2026-07-13") status = "FAILED";
      pipelines.push({
        date,
        pipeline: def.p,
        target: def.t,
        status,
        rows: Math.round(logn(11.5, 0.5)),
        durationSec: Math.round(40 + rnd() * 260),
        dqPassed: status === "SUCCESS",
      });
    });
  });

  // ---- Playground subset ----
  const playgroundTxns: PlaygroundTxn[] = [];
  const SAMPLE_DAYS = DATE_RANGE.slice(60); // last 30 days
  const CAT_W = [0.26, 0.18, 0.14, 0.12, 0.2, 0.1];
  SAMPLE_DAYS.forEach((date) => {
    const n = Math.round(320 * (0.9 + rnd() * 0.2));
    for (let k = 0; k < n; k++) {
      const cat = CATEGORIES[pickW(CAT_W)];
      const txnType = pick(["PAYMENT", "PAYMENT", "PAYMENT", "DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "REFUND"]);
      const amount = round2(logn(4.8, 1.1));
      playgroundTxns.push({
        txn_date: date,
        bu_code: BU_CODES[pickW([34, 22, 18, 10, 9, 7])],
        region_name: pick(REGION_NAMES),
        channel: pick(CHANNELS),
        txn_type: txnType,
        amount_usd: round2(txnType === "REFUND" ? -amount : amount),
        customer_id: "C" + (10000 + Math.floor(rnd() * 8000)),
        product_category: cat,
        status: rnd() < 0.96 ? "POSTED" : "FAILED",
      });
    }
  });

  return {
    dailyGmv,
    gmvBu,
    gmvRegion,
    gmvChannel,
    gmvCategory,
    opsDaily,
    supportDaily,
    dqDaily,
    costDaily,
    costUsers,
    costDatasets,
    topQueries,
    pipelines,
    playgroundTxns,
  };
}

let cached: SeedData | null = null;

export function seedData(): SeedData {
  if (!cached) cached = generate();
  return cached;
}
