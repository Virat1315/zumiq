/* ZUMIQ — deterministic synthetic data generator + static datasets.
 * All values are seeded so every load produces identical, reproducible data.
 * Mirrors the production BigQuery schema (core_layer, governance, ops, cost).
 */
(function () {
  "use strict";

  /* ---------- seeded PRNG (mulberry32) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260714);

  /* ---------- helpers ---------- */
  const D90 = 90;
  const END = Date.UTC(2026, 6, 14); // 2026-07-14
  const MS_DAY = 86400000;
  function dstr(offsetDays) {
    const d = new Date(END - (D90 - 1 - offsetDays) * MS_DAY);
    return d.toISOString().slice(0, 10);
  }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function pickW(weights) {
    let total = weights.reduce((a, b) => a + b, 0), r = rnd() * total;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
    return weights.length - 1;
  }
  function logn(mu, sigma) { return Math.exp(mu + sigma * (rnd() + rnd() + rnd() - 1.5) * (2 / 3)); }
  function round2(x) { return Math.round(x * 100) / 100; }
  const dRange = (startIdx, endIdx) => { const a = []; for (let i = startIdx; i <= endIdx; i++) a.push(dstr(i)); return a; };

  /* ---------- static dimension data ---------- */
  const BUS = [
    { code: "RTL", name: "Retail", seg: "B2C", owner: "E. Chen" },
    { code: "BNK", name: "Banking", seg: "B2B", owner: "R. Kapoor" },
    { code: "TEL", name: "Telecom", seg: "B2C", owner: "M. Alvarez" },
    { code: "INS", name: "Insurance", seg: "B2B", owner: "S. Novak" },
    { code: "MNF", name: "Manufacturing", seg: "B2B", owner: "D. Osei" },
    { code: "LOG", name: "Logistics", seg: "B2B", owner: "L. Bianchi" }
  ];
  const REGIONS = [
    { name: "North America", cur: "USD", tz: "America/New_York" },
    { name: "Europe", cur: "EUR", tz: "Europe/London" },
    { name: "Asia Pacific", cur: "JPY", tz: "Asia/Singapore" },
    { name: "LATAM", cur: "BRL", tz: "America/Sao_Paulo" },
    { name: "MEA", cur: "AED", tz: "Asia/Dubai" }
  ];
  const CHANNELS = ["WEB", "MOBILE", "CALL", "BRANCH", "POS", "API", "PARTNER"];
  const CATS = [
    { cat: "Consumer Electronics", margin: 0.28, w: 26 },
    { cat: "Apparel", margin: 0.41, w: 18 },
    { cat: "Home & Garden", margin: 0.33, w: 14 },
    { cat: "Health & Beauty", margin: 0.36, w: 12 },
    { cat: "Financial Services", margin: 0.22, w: 20 },
    { cat: "Industrial", margin: 0.18, w: 10 }
  ];
  const CAT_ARRAY = CATS.map(c => c.cat);
  const TXN_TYPES = ["PAYMENT", "DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "REFUND", "CHARGEBACK"];
  const TXN_W = [40, 15, 12, 10, 8, 9, 6];

  /* ---------- transactions (~1,200/day) ---------- */
  function genTransactions() {
    const rows = [];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      // scenario 02: volume dip on 2026-07-13 (18% drop)
      const volume = (date === "2026-07-13") ? 0.82 : 1;
      // scenario 20: chargeback spike Jul 11-13
      const cbWeight = (date >= "2026-07-11" && date <= "2026-07-13") ? 4 : 1;
      const n = Math.round(1200 * volume * (0.9 + rnd() * 0.2));
      for (let k = 0; k < n; k++) {
        const cat = CATS[pickW(CATS.map(c => c.w))];
        const txnType = TXN_TYPES[pickW(TXN_W.map((w, idx) => (idx === 6 ? w * cbWeight : w)))];
        const amount = Math.max(0.01, round2(logn(4.8, 1.1) + (txnType === "CHARGEBACK" ? 180 : 0)));
        const status = rnd() < 0.96 ? "POSTED" : (rnd() < 0.5 ? "PENDING" : "FAILED");
        rows.push({
          txn_date: date,
          txn_id: "TXN-" + date.replace(/-/g, "") + "-" + (1000 + k),
          bu_code: BUS[pickW([34, 22, 18, 10, 9, 7])].code,
          region_name: pick(REGIONS).name,
          channel: pick(CHANNELS),
          txn_type: txnType,
          amount_usd: round2(txnType === "REFUND" || txnType === "CHARGEBACK" ? -amount : amount),
          customer_id: "C" + (10000 + Math.floor(rnd() * 8000)),
          product_category: cat.cat,
          margin_pct: round2(cat.margin * (0.9 + rnd() * 0.2)),
          status: status
        });
      }
    }
    return rows;
  }

  /* ---------- operations events (~2,600/day) ---------- */
  function genOpsEvents() {
    const rows = [];
    const SOURCES = ["OMS", "ERP", "GATEWAY", "IAM", "BILLING", "PROBE"];
    const EVENTS = ["LOGIN", "ORDER_PLACED", "PAYMENT_FAILED", "LATENCY", "ERROR", "DELIVERY", "API_CALL"];
    const EV_W = [18, 14, 6, 10, 5, 12, 35];
    const SERVICES = ["svc-orders", "svc-pay-1", "svc-pay-3", "svc-auth", "svc-inv", "svc-ship", "svc-bill"];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      // scenario 11: payment failures spike on svc-pay-3 Jul 11
      const paySpike = date === "2026-07-11" ? 14 : 1;
      const n = Math.round(2600 * (0.9 + rnd() * 0.2));
      for (let k = 0; k < n; k++) {
        const evType = EVENTS[pickW(EV_W.map((w, idx) => (idx === 2 ? w * paySpike : w)))];
        const svc = evType === "PAYMENT_FAILED" ? "svc-pay-3" : pick(SERVICES);
        const status = evType === "ERROR" || evType === "PAYMENT_FAILED"
          ? "FAILURE" : (rnd() < 0.04 ? "TIMEOUT" : "SUCCESS");
        rows.push({
          event_date: date,
          event_type: evType,
          source_system: pick(SOURCES),
          service_name: svc,
          status: status,
          latency_ms: Math.round(evType === "PAYMENT_FAILED" ? logn(7.5, 0.8) : logn(5.6, 0.9)),
          bu_code: BUS[pickW([34, 22, 18, 10, 9, 7])].code
        });
      }
    }
    return rows;
  }

  /* ---------- support cases (~150/day) ---------- */
  function genSupportCases() {
    const rows = [];
    const PRIORITY = ["P1", "P2", "P3", "P4"];
    const CASE_TYPES = ["BILLING", "TECHNICAL", "ACCOUNT", "COMPLAINT", "REQUEST"];
    const CT_W = [30, 22, 14, 12, 22];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      // scenario 11: billing case spike Jul 11-12
      const spike = date === "2026-07-11" || date === "2026-07-12" ? 3.2 : 1;
      // scenario 08: SLA degradation Jul 1-14
      const slaDegrade = date >= "2026-07-01" ? 0.82 : 1;
      const n = Math.round(150 * spike * (0.9 + rnd() * 0.2));
      for (let k = 0; k < n; k++) {
        const pr = PRIORITY[pickW([8, 25, 45, 22])];
        const ct = CASE_TYPES[pickW(CT_W.map((w, idx) => (idx === 0 ? w * spike : w)))];
        rows.push({
          opened_date: date,
          priority: pr,
          case_type: ct,
          status: pick(["CLOSED", "CLOSED", "CLOSED", "RESOLVED", "OPEN", "IN_PROGRESS"]),
          sla_met: rnd() < 0.97 * slaDegrade,
          csat: pickW([3, 7, 20, 45, 25]) + 1,
          reopen_count: rnd() < 0.08 ? 1 : 0,
          is_escalated: rnd() < 0.06
        });
      }
    }
    return rows;
  }

  /* ---------- DQ health (90 days x 6 products) ---------- */
  function genDqHealth() {
    const rows = [];
    const PRODUCTS = [
      { name: "Enterprise P&L", base: 97 },
      { name: "Customer 360", base: 95 },
      { name: "Operations Health", base: 96 },
      { name: "Support SLA", base: 95 },
      { name: "Platform Health", base: 98 },
      { name: "Data Quality", base: 99 }
    ];
    const DIMS = ["COMPLETENESS", "UNIQUENESS", "VALIDITY", "TIMELINESS", "INTEGRITY", "FRESHNESS", "VOLUME"];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      for (const p of PRODUCTS) {
        let score = p.base + (90 - i) * 0.03 + (rnd() - 0.5) * 2;
        // scenario 14: Customer 360 null-spike dip Jul 13
        if (p.name === "Customer 360" && date === "2026-07-13") score = 89.4;
        // gentle earlier dips
        if (p.name === "Support SLA" && date >= "2026-07-01") score -= 1.2;
        const checks = 24;
        const failed = Math.max(0, Math.round((100 - score) / 100 * checks * (0.8 + rnd() * 0.4)));
        const dim = {};
        for (const d of DIMS) dim[d] = round2(Math.min(100, Math.max(60, score + (rnd() - 0.5) * 6)));
        rows.push({
          score_date: date,
          data_product: p.name,
          dq_score: round2(Math.max(60, Math.min(100, score))),
          checks_run: checks,
          checks_failed: failed,
          dimensions: dim
        });
      }
    }
    return rows;
  }

  /* ---------- query cost (~350/day) ---------- */
  function genQueryCost() {
    const rows = [];
    const USERS = [];
    const FIRST = ["ana", "raj", "mei", "leo", "sofia", "omar", "nina", "kofi", "julia", "chen",
      "pia", "vik", "lucy", "diego", "hana", "tom", "ira", "sam", "zoe", "rafi"];
    const TEAMS = ["Finance", "Retail", "Banking", "Telecom", "CX", "Platform", "Marketing", "FinOps"];
    for (let i = 0; i < 20; i++) USERS.push({ email: FIRST[i] + "@zumiq.io", team: pick(TEAMS) });
    const DATASETS = ["raw_layer", "core_layer", "analytics_layer", "governance", "ops", "cost"];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      // scenario 05: runaway analyst Jul 8-14
      const runaway = date >= "2026-07-08" && date <= "2026-07-14";
      const n = runaway ? 420 : 350;
      for (let k = 0; k < n; k++) {
        const u = k === 0 && runaway ? { email: "analyst@zumiq.io", team: "Marketing" } : pick(USERS);
        const isRunaway = u.email === "analyst@zumiq.io" && runaway;
        const gb = isRunaway ? logn(6.0, 0.7) : logn(0.6, 1.3);
        rows.push({
          job_date: date,
          user_email: u.email,
          team: u.team,
          dataset: pick(DATASETS),
          gb_processed: round2(gb),
          cost_usd: round2(gb * 0.00625),
          cache_hit: rnd() < 0.25,
          query_kind: isRunaway ? "full_scan_extract" : pick(["dashboard", "dashboard", "ad_hoc", "extract", "dq_run", "report"])
        });
      }
    }
    return rows;
  }

  /* ---------- pipelines (8/day) ---------- */
  function genPipelines() {
    const rows = [];
    const P = [
      { p: "SCD2_CUSTOMER", t: "core_layer.dim_customer" },
      { p: "SCD2_PRODUCT", t: "core_layer.dim_product" },
      { p: "FCT_TRANSACTIONS_LOAD", t: "core_layer.fct_transactions" },
      { p: "FCT_OPS_EVENTS_STREAM", t: "core_layer.fct_operations_events" },
      { p: "FCT_SUPPORT_CASES_LOAD", t: "core_layer.fct_support_cases" },
      { p: "EXEC_KPIS_RECOMPUTE", t: "gold_layer.kpi_executive_daily" },
      { p: "COST_GOVERNANCE_SUMMARY", t: "gold_layer.cost_daily_summary" },
      { p: "DQ_ENGINE_DAILY", t: "governance.dq_health_daily" }
    ];
    for (let i = 0; i < D90; i++) {
      const date = dstr(i);
      for (const pp of P) {
        let status = rnd() < 0.045 ? "FAILED" : "SUCCESS";
        // scenario 03/04: Jul 13-14 failures on the transaction load
        if (pp.p === "FCT_TRANSACTIONS_LOAD" && date >= "2026-07-13") status = "FAILED";
        rows.push({
          run_date: date,
          pipeline: pp.p,
          target: pp.t,
          status: status,
          rows_written: Math.round(logn(11.5, 0.5)),
          dq_passed: status === "SUCCESS"
        });
      }
    }
    return rows;
  }

  /* ---------- scenarios (from docs/scenarios) ---------- */
  const SCENARIOS = [
    { id: "S01", title: "Executive P&L mismatch: Finance vs Retail", domain: "Governance", sev: "P1", summary: "Two teams defined GMV differently — $12.4M vs $9.8M for the same day. Fixed with a certified semantic layer.", doc: "scenario-01-pnl-mismatch.md" },
    { id: "S02", title: "Unexpected 18% KPI drop in daily GMV", domain: "Revenue", sev: "P1", summary: "A 7-hour silent source gap looked like an 18% crash. Volume DQ rule now catches it.", doc: "scenario-02-gmv-drop.md" },
    { id: "S03", title: "Pipeline failure blocking the overnight batch", domain: "Reliability", sev: "P1", summary: "A retry file with duplicates failed the whole load, silently, for 6 hours.", doc: "scenario-03-pipeline-failure.md" },
    { id: "S04", title: "Data freshness breach delaying Finance close", domain: "Freshness", sev: "P1", summary: "Vendor failed to deliver the extract; no freshness alert existed until Finance called.", doc: "scenario-04-freshness-breach.md" },
    { id: "S05", title: "Cloud cost spike: $14k/day to $41k/day", domain: "Cost", sev: "P1", summary: "One analyst's Tableau extract scanned the whole table every 30 min — $27k in a week.", doc: "scenario-05-cost-spike.md" },
    { id: "S06", title: "Duplicate transactions inflating revenue", domain: "DQ", sev: "P1", summary: "A non-idempotent retry doubled 201k transactions — $2.3M inflation caught before close.", doc: "scenario-06-duplicate-transactions.md" },
    { id: "S07", title: "Metadata inconsistency breaking Tableau extracts", domain: "Metadata", sev: "P2", summary: "A dashboard was bound to a 14-month-old stale view instead of the certified table.", doc: "scenario-07-metadata-inconsistency.md" },
    { id: "S08", title: "Customer service degradation (SLA breaches)", domain: "CX", sev: "P1", summary: "SLA board counted only 'closed' cases, hiding a 97%→71% real collapse.", doc: "scenario-08-sla-degradation.md" },
    { id: "S09", title: "Schema drift breaking downstream models", domain: "Schema", sev: "P1", summary: "A renamed column broke the attribution model with no early warning — lineage fixes it.", doc: "scenario-09-schema-drift.md" },
    { id: "S10", title: "Late-arriving data forcing a restatement", domain: "Timeliness", sev: "P1", summary: "1.4% of transactions arrived 3-9 days late; reports had no as-of semantics.", doc: "scenario-10-late-data-restatement.md" },
    { id: "S11", title: "Support case spike from a billing bug", domain: "CX", sev: "P2", summary: "A payment gateway regression caused 4,000+ billing cases in 48h.", doc: "scenario-11-support-spike.md" },
    { id: "S12", title: "Stockout eating revenue (inventory receipts)", domain: "Operations", sev: "P2", summary: "Zero receipts for a top SKU went unnoticed for days — $1.4M lost revenue.", doc: "scenario-12-stockout.md" },
    { id: "S13", title: "Dashboard latency from full-table scans", domain: "Performance", sev: "P2", summary: "Executive dashboard took 40-60s; executives stopped using it.", doc: "scenario-13-dashboard-latency.md" },
    { id: "S14", title: "Null spike in the customer dimension", domain: "DQ", sev: "P2", summary: "A CRM remap sent NULL emails for EMEA; a campaign silently lost its audience.", doc: "scenario-14-null-spike.md" },
    { id: "S15", title: "Ops event volume drop: source feed down", domain: "Reliability", sev: "P1", summary: "A dead streaming worker looked like a 'quiet day' — 5h of blind operations.", doc: "scenario-15-volume-drop.md" },
    { id: "S16", title: "Wrong product margin in a restatement", domain: "Accuracy", sev: "P1", summary: "A current-version join applied a new price to old transactions — negative margin.", doc: "scenario-16-wrong-margin.md" },
    { id: "S17", title: "DQ alert fatigue: false positives", domain: "DQ", sev: "P2", summary: "40+ noisy alerts a week hid a real failure for 36 hours.", doc: "scenario-17-alert-fatigue.md" },
    { id: "S18", title: "Stale Tableau extracts causing report mismatch", domain: "BI", sev: "P2", summary: "A weekly extract served 3-day-old data while the dashboard looked current.", doc: "scenario-18-stale-extracts.md" },
    { id: "S19", title: "ZUMIQ self-serve adoption drop", domain: "Product", sev: "P2", summary: "Queries fell 38% while the platform looked healthy — adoption is a product problem.", doc: "scenario-19-adoption-drop.md" },
    { id: "S20", title: "Chargeback rate spike", domain: "Risk", sev: "P1", summary: "A new reseller channel double-charged customers — chargebacks hit 4.1%.", doc: "scenario-20-chargeback-spike.md" },
    { id: "S21", title: "FX conversion error in global consolidation", domain: "Finance", sev: "P1", summary: "fx_rate silently defaulted to 1.0 — EMEA revenue understated 14% ($18.4M).", doc: "scenario-21-fx-error.md" },
    { id: "S22", title: "Orphan FK surge after master data cleanup", domain: "DQ", sev: "P2", summary: "A customer merge forgot to remap fact keys — $610k of transactions went missing.", doc: "scenario-22-orphan-fk.md" }
  ];

  /* ---------- glossary (from docs/governance) ---------- */
  const GLOSSARY = [
    { term: "GMV", def: "Gross value of posted, non-reversed transactions", formula: "SUM(amount_usd) WHERE status='POSTED' AND is_reversal=FALSE", owner: "Finance" },
    { term: "Net Revenue", def: "GMV minus refunds and chargebacks", formula: "GMV − refunds − chargebacks", owner: "Finance" },
    { term: "Gross Margin", def: "GMV x product margin (point-in-time)", formula: "GMV × margin_pct", owner: "Finance" },
    { term: "Active Customer", def: "Customer with ≥1 posted transaction in window", formula: "COUNT(DISTINCT customer_key)", owner: "Growth" },
    { term: "Average Order Value", def: "GMV per posted transaction", formula: "GMV / posted txns", owner: "Growth" },
    { term: "Lifetime Value", def: "Total posted value per customer", formula: "SUM(amount_usd) per customer", owner: "Growth" },
    { term: "SLA Attainment", def: "% of cases resolved by SLA due time", formula: "100 × resolved≤due / total", owner: "CX Ops" },
    { term: "First Contact Resolution", def: "Closed cases with zero reopens", formula: "reopen_count=0 & CLOSED / total", owner: "CX Ops" },
    { term: "CSAT", def: "Average satisfaction score", formula: "AVG(satisfaction_score)", owner: "CX Ops" },
    { term: "Service Error Rate", def: "% failing events per service", formula: "COUNTIF(status='FAILURE')/COUNT(*)", owner: "Platform" },
    { term: "p95 Latency", def: "95th percentile latency", formula: "PERCENTILE_CONT(latency_ms, 0.95)", owner: "Platform" },
    { term: "Pipeline Success Rate", def: "% runs SUCCESS in window", formula: "COUNTIF(status='SUCCESS')/COUNT(*)", owner: "Platform" },
    { term: "Data Freshness", def: "Age of newest partition vs SLA", formula: "hours since last successful load", owner: "Platform" },
    { term: "MTTR", def: "Mean time to resolve alerts", formula: "AVG(resolved − triggered)", owner: "Platform" },
    { term: "Enterprise DQ Score", def: "Rows-weighted DQ score across certified tables", formula: "see DQ engine", owner: "Data Quality" },
    { term: "Cost per Query TB", def: "$ per TB processed", formula: "SUM(cost)/SUM(tb)", owner: "FinOps" },
    { term: "Dashboard Adoption", def: "Distinct viewers per dashboard / week", formula: "COUNT(DISTINCT employee_key)", owner: "Data PM" },
    { term: "Certified Coverage", def: "% of T1 tables certified", formula: "certified T1 / total T1", owner: "Data PM" }
  ];

  /* ---------- playground dataset (smaller, DuckDB-ready) ---------- */
  function genPlaygroundDatasets() {
    const txn = genTransactions();
    const products = [];
    for (let i = 0; i < 60; i++) products.push({ product_id: "SKU-" + (880000 + i), name: "Product " + i, category: pick(CAT_ARRAY), list_price: round2(logn(4.5, 0.8)), cost_price: 0 });
    const regions = REGIONS.map((r, i) => ({ region_key: i + 1, region_name: r.name, currency_code: r.cur }));
    const customers = [];
    for (let i = 0; i < 400; i++) customers.push({ customer_id: "C" + (10000 + i), segment: pick(["Enterprise", "Mid-Market", "SMB"]), tier: pick(["Platinum", "Gold", "Silver", "Bronze"]), country: pick(REGIONS).name });
    const dq = genDqHealth().filter(r => r.score_date >= "2026-06-01");
    const cost = genQueryCost().filter(r => r.job_date >= "2026-06-01");
    return { transactions: txn, products, regions, customers, dq_health: dq, query_cost: cost, pipelines: genPipelines() };
  }

  window.ZQ = {
    BUS, REGIONS, CHANNELS, CAT_ARRAY, TXN_TYPES, GLOSSARY, SCENARIOS,
    dstr, dRange,
    data: {
      transactions: genTransactions(),
      opsEvents: genOpsEvents(),
      supportCases: genSupportCases(),
      dqHealth: genDqHealth(),
      queryCost: genQueryCost(),
      pipelines: genPipelines()
    },
    playground: genPlaygroundDatasets()
  };
})();
