// Enterprise metadata + curated platform objects for ZUMIQ.

import { seedData, dRange, BU_CODES, REGION_NAMES } from "./core";

/* ================= Roles ================= */
export type Role = "admin" | "executive" | "analyst" | "engineer" | "pm" | "operations";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  executive: "Executive",
  analyst: "Business Analyst",
  engineer: "Data Engineer",
  pm: "Product Manager",
  operations: "Operations",
};

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  roles: Role[];
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/", icon: "layout", roles: ["admin", "executive", "analyst", "engineer", "pm", "operations"], section: "Overview" },
  { id: "kpis", label: "KPI Studio", href: "/kpis", icon: "target", roles: ["admin", "executive", "analyst", "pm"], section: "Build" },
  { id: "quality", label: "Data Quality", href: "/quality", icon: "shield", roles: ["admin", "analyst", "engineer", "pm"], section: "Build" },
  { id: "upload", label: "CSV Upload", href: "/upload", icon: "upload", roles: ["admin", "analyst", "engineer"], section: "Build" },
  { id: "pipelines", label: "Pipelines", href: "/pipelines", icon: "workflow", roles: ["admin", "analyst", "engineer", "operations"], section: "Operate" },
  { id: "incidents", label: "Incidents", href: "/incidents", icon: "alert", roles: ["admin", "executive", "analyst", "engineer", "pm", "operations"], section: "Operate" },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: "bell", roles: ["admin", "executive", "analyst", "engineer", "pm", "operations"], section: "Operate" },
  { id: "catalog", label: "Catalog", href: "/catalog", icon: "database", roles: ["admin", "executive", "analyst", "engineer", "pm", "operations"], section: "Explore" },
  { id: "playground", label: "Query Playground", href: "/playground", icon: "terminal", roles: ["admin", "analyst", "engineer"], section: "Explore" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store", roles: ["admin", "executive", "analyst", "engineer", "pm", "operations"], section: "Explore" },
  { id: "cost", label: "Cloud Cost", href: "/cost", icon: "credit", roles: ["admin", "executive", "analyst", "engineer", "pm"], section: "Govern" },
  { id: "governance", label: "Governance", href: "/governance", icon: "scale", roles: ["admin", "executive", "analyst"], section: "Govern" },
  { id: "ask", label: "Executive Ask", href: "/ask", icon: "sparkles", roles: ["admin", "executive", "analyst", "pm"], section: "Insight" },
  { id: "simulator", label: "Scenario Simulator", href: "/simulator", icon: "sliders", roles: ["admin", "executive", "pm"], section: "Insight" },
  { id: "analytics", label: "Product Analytics", href: "/analytics", icon: "chart", roles: ["admin", "executive", "pm"], section: "Insight" },
];

/* ================= Users ================= */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  title: string;
  color: string;
  avatar: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Ada Sharma", email: "ada@zumiq.io", role: "admin", team: "Platform", title: "Data Platform Lead", color: "#6366f1", avatar: "AS" },
  { id: "u2", name: "Priya Raman", email: "priya@zumiq.io", role: "executive", team: "Office of the CFO", title: "Chief Data Officer", color: "#f59e0b", avatar: "PR" },
  { id: "u3", name: "Marcus Lee", email: "marcus@zumiq.io", role: "engineer", team: "Data Engineering", title: "Staff Data Engineer", color: "#22d3ee", avatar: "ML" },
  { id: "u4", name: "Sofia Reyes", email: "sofia@zumiq.io", role: "analyst", team: "Analytics Center of Excellence", title: "Principal Analytics Engineer", color: "#34d399", avatar: "SR" },
  { id: "u5", name: "Daniel Kim", email: "daniel@zumiq.io", role: "pm", team: "Product", title: "Principal Product Manager", color: "#a78bfa", avatar: "DK" },
  { id: "u6", name: "Elena Petrova", email: "elena@zumiq.io", role: "operations", team: "Customer Operations", title: "Head of Operations", color: "#f87171", avatar: "EP" },
  { id: "u7", name: "Omar Haddad", email: "omar@zumiq.io", role: "analyst", team: "Finance", title: "Finance Analytics Manager", color: "#2dd4bf", avatar: "OH" },
  { id: "u8", name: "Mei Lin", email: "mei@zumiq.io", role: "engineer", team: "Data Engineering", title: "Senior Data Engineer", color: "#f472b6", avatar: "ML2" },
  { id: "u9", name: "Leo Fischer", email: "leo@zumiq.io", role: "analyst", team: "Marketing", title: "Marketing Data Analyst", color: "#fb923c", avatar: "LF" },
  { id: "u10", name: "Nina Patel", email: "nina@zumiq.io", role: "operations", team: "Customer Operations", title: "Ops Program Manager", color: "#38bdf8", avatar: "NP" },
  { id: "u11", name: "Tom Becker", email: "tom@zumiq.io", role: "analyst", team: "CX", title: "CX Insights Analyst", color: "#4ade80", avatar: "TB" },
  { id: "u12", name: "Rafi Ahmed", email: "rafi@zumiq.io", role: "engineer", team: "Platform", title: "Platform Engineer", color: "#c084fc", avatar: "RA" },
];

export const userByEmail = (email: string): User | undefined => USERS.find((u) => u.email === email);

/* ================= Data Catalog ================= */
export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  meaning: string;
  pii?: string;
  classification?: string;
}

export interface Dataset {
  id: string;
  name: string;
  layer: "RAW" | "STG" | "CORE" | "ANALYTICS" | "GOLD";
  domain: string;
  description: string;
  owner: string;
  ownerId: string;
  team: string;
  certified: boolean;
  sensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  refresh: string;
  freshnessMin: number;
  rows: string;
  sizeGb: number;
  columns: ColumnDef[];
  consumers: string[];
  upstream: string[];
  downstream: string[];
  usage: { queries: number; users: number; costShare: number };
  dqScore?: number;
}

export const DATASETS: Dataset[] = [
  {
    id: "ds1",
    name: "core_layer.fct_transactions",
    layer: "CORE",
    domain: "Revenue",
    description: "Conformed transaction fact - one row per posted, non-reversed transaction. The single source of truth for GMV and revenue.",
    owner: "Marcus Lee", ownerId: "u3", team: "Data Engineering",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "Streaming + daily batch",
    freshnessMin: 15,
    rows: "112M",
    sizeGb: 480,
    columns: [
      { name: "txn_id", type: "STRING", nullable: false, meaning: "Globally unique transaction identifier (surrogate)" },
      { name: "customer_key", type: "INT64", nullable: false, meaning: "Conformed customer dimension key (SCD2)", pii: "ID" },
      { name: "product_key", type: "INT64", nullable: false, meaning: "Conformed product dimension key" },
      { name: "bu_code", type: "STRING", nullable: false, meaning: "Business unit owning the transaction" },
      { name: "region_name", type: "STRING", nullable: false, meaning: "Region where transaction occurred" },
      { name: "channel", type: "STRING", nullable: false, meaning: "Origination channel (WEB/MOBILE/CALL/BRANCH/POS/API/PARTNER)" },
      { name: "txn_type", type: "STRING", nullable: false, meaning: "PAYMENT/DEPOSIT/WITHDRAWAL/TRANSFER/FEE/REFUND/CHARGEBACK" },
      { name: "amount_usd", type: "NUMERIC", nullable: false, meaning: "Transaction amount normalized to USD", classification: "CONFIDENTIAL" },
      { name: "margin_pct", type: "FLOAT64", nullable: false, meaning: "Point-in-time product margin applied at posting" },
      { name: "status", type: "STRING", nullable: false, meaning: "POSTED / PENDING / FAILED" },
      { name: "ingested_at", type: "TIMESTAMP", nullable: false, meaning: "Platform ingestion timestamp" },
    ],
    consumers: ["KPI Studio", "Executive Dashboard", "Attribution Model", "Marketplace: Revenue 360"],
    upstream: ["raw_layer.transactions_landing", "stg_transactions"],
    downstream: ["gold_layer.kpi_executive_daily", "analytics_layer.attribution_model"],
    usage: { queries: 18420, users: 87, costShare: 0.34 },
    dqScore: 99.1,
  },
  {
    id: "ds2",
    name: "core_layer.dim_customer",
    layer: "CORE",
    domain: "Customer",
    description: "SCD2 customer dimension with current-version view. Conformed key used across every customer-centric fact.",
    owner: "Marcus Lee", ownerId: "u3", team: "Data Engineering",
    certified: true,
    sensitivity: "CONFIDENTIAL",
    refresh: "CDC, 5 min",
    freshnessMin: 5,
    rows: "8.4M",
    sizeGb: 62,
    columns: [
      { name: "customer_key", type: "INT64", nullable: false, meaning: "Surrogate SCD2 key", pii: "ID" },
      { name: "customer_id", type: "STRING", nullable: false, meaning: "Natural business key (CRM GUID)", pii: "ID" },
      { name: "email", type: "STRING", nullable: false, meaning: "Primary contact email", pii: "EMAIL" },
      { name: "segment", type: "STRING", nullable: false, meaning: "Enterprise / Mid-Market / SMB" },
      { name: "tier", type: "STRING", nullable: false, meaning: "Platinum / Gold / Silver / Bronze" },
      { name: "country", type: "STRING", nullable: true, meaning: "Registered country", pii: "LOCATION" },
      { name: "valid_from", type: "TIMESTAMP", nullable: false, meaning: "SCD2 version start" },
      { name: "is_current", type: "BOOL", nullable: false, meaning: "Current-version flag" },
    ],
    consumers: ["Customer 360 KPI", "LTV Model", "Churn Risk", "Marketplace: Customer 360"],
    upstream: ["raw_layer.crm_customer_cdc"],
    downstream: ["analytics_layer.customer_lifetime_value", "analytics_layer.churn_risk_scores"],
    usage: { queries: 6210, users: 54, costShare: 0.11 },
    dqScore: 95.2,
  },
  {
    id: "ds3",
    name: "gold_layer.kpi_executive_daily",
    layer: "GOLD",
    domain: "Executive",
    description: "Certified daily executive KPIs computed from certified facts via the semantic layer. Single source of truth for leadership metrics.",
    owner: "Sofia Reyes", ownerId: "u4", team: "Analytics COE",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "Daily 05:30 UTC",
    freshnessMin: 1440,
    rows: "3.2K",
    sizeGb: 1.2,
    columns: [
      { name: "kpi_date", type: "DATE", nullable: false, meaning: "Business date of the KPI" },
      { name: "kpi_name", type: "STRING", nullable: false, meaning: "Certified KPI identifier from the glossary" },
      { name: "kpi_value", type: "FLOAT64", nullable: false, meaning: "Computed KPI value" },
      { name: "target_value", type: "FLOAT64", nullable: false, meaning: "Target threshold" },
      { name: "status", type: "STRING", nullable: false, meaning: "ON_TRACK / WARNING / BREACH" },
    ],
    consumers: ["Executive Dashboard", "Tableau Executive Overview", "Executive Ask", "Board Pack"],
    upstream: ["core_layer.fct_transactions", "core_layer.fct_support_cases", "core_layer.fct_operations_events"],
    downstream: [],
    usage: { queries: 11200, users: 210, costShare: 0.02 },
    dqScore: 98.8,
  },
  {
    id: "ds4",
    name: "analytics_layer.attribution_model",
    layer: "ANALYTICS",
    domain: "Marketing",
    description: "Multi-touch attribution output mapping revenue to channels. Rebuilt on certified facts to remove the 14-month stale-view issue.",
    owner: "Sofia Reyes", ownerId: "u4", team: "Analytics COE",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "Daily 06:00 UTC",
    freshnessMin: 1440,
    rows: "41K",
    sizeGb: 9,
    columns: [
      { name: "campaign_id", type: "STRING", nullable: false, meaning: "Campaign identifier" },
      { name: "channel", type: "STRING", nullable: false, meaning: "Attribution channel" },
      { name: "attributed_revenue", type: "NUMERIC", nullable: false, meaning: "Revenue attributed by the MTA model" },
      { name: "touch_count", type: "INT64", nullable: false, meaning: "Touchpoints in path" },
    ],
    consumers: ["Marketing Mix Reports", "Campaign ROI Dashboard"],
    upstream: ["core_layer.fct_transactions", "raw_layer.campaign_events"],
    downstream: [],
    usage: { queries: 1980, users: 12, costShare: 0.08 },
    dqScore: 96.7,
  },
  {
    id: "ds5",
    name: "governance.dq_health_daily",
    layer: "GOLD",
    domain: "Data Quality",
    description: "Daily DQ engine output - enterprise scores per data product across seven dimensions. Drives certification and alerting.",
    owner: "Ada Sharma", ownerId: "u1", team: "Governance",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "Daily 05:00 UTC",
    freshnessMin: 1440,
    rows: "7.2K",
    sizeGb: 0.4,
    columns: [
      { name: "score_date", type: "DATE", nullable: false, meaning: "Assessment date" },
      { name: "data_product", type: "STRING", nullable: false, meaning: "Data product assessed" },
      { name: "dq_score", type: "FLOAT64", nullable: false, meaning: "Weighted DQ score (0-100)" },
      { name: "checks_run", type: "INT64", nullable: false, meaning: "Checks executed" },
      { name: "checks_failed", type: "INT64", nullable: false, meaning: "Checks that failed" },
      { name: "dimensions", type: "JSON", nullable: false, meaning: "Per-dimension scores" },
    ],
    consumers: ["Data Quality Dashboard", "Certification Workflow", "Incident Center"],
    upstream: ["core_layer.fct_transactions", "core_layer.dim_customer", "core_layer.dim_product"],
    downstream: [],
    usage: { queries: 440, users: 31, costShare: 0.01 },
    dqScore: 99.3,
  },
  {
    id: "ds6",
    name: "cost.gold.cost_daily_summary",
    layer: "GOLD",
    domain: "FinOps",
    description: "Daily BigQuery cost and usage summary per user, dataset and query pattern. Powers the Cloud Cost dashboard and runaway detection.",
    owner: "Marcus Lee", ownerId: "u3", team: "FinOps",
    certified: true,
    sensitivity: "RESTRICTED",
    refresh: "Hourly",
    freshnessMin: 60,
    rows: "210K",
    sizeGb: 3.4,
    columns: [
      { name: "job_date", type: "DATE", nullable: false, meaning: "Billing date" },
      { name: "user_email", type: "STRING", nullable: false, meaning: "Querying user", pii: "EMAIL" },
      { name: "dataset", type: "STRING", nullable: false, meaning: "Dataset scanned" },
      { name: "gb_processed", type: "FLOAT64", nullable: false, meaning: "Bytes processed in GB" },
      { name: "cost_usd", type: "NUMERIC", nullable: false, meaning: "Scan cost" },
      { name: "query_kind", type: "STRING", nullable: false, meaning: "dashboard / ad_hoc / extract / dq_run / report" },
    ],
    consumers: ["Cloud Cost Dashboard", "FinOps Reviews", "Budget Alerts"],
    upstream: ["ops.billing_export", "ops.job_metadata"],
    downstream: [],
    usage: { queries: 330, users: 8, costShare: 0.01 },
    dqScore: 98.2,
  },
  {
    id: "ds7",
    name: "raw_layer.transactions_landing",
    layer: "RAW",
    domain: "Revenue",
    description: "Immutable landing zone for transaction feeds. Never edited - reprocessing writes new partitions.",
    owner: "Mei Lin", ownerId: "u8", team: "Data Engineering",
    certified: false,
    sensitivity: "CONFIDENTIAL",
    refresh: "Streaming",
    freshnessMin: 1,
    rows: "120M",
    sizeGb: 890,
    columns: [
      { name: "payload", type: "JSON", nullable: false, meaning: "Raw event payload as received" },
      { name: "ingested_at", type: "TIMESTAMP", nullable: false, meaning: "Ingest time" },
      { name: "source", type: "STRING", nullable: false, meaning: "Source system" },
    ],
    consumers: [],
    upstream: [],
    downstream: ["stg_transactions"],
    usage: { queries: 120, users: 6, costShare: 0.18 },
  },
  {
    id: "ds8",
    name: "core_layer.fct_operations_events",
    layer: "CORE",
    domain: "Operations",
    description: "Service health and operational event facts - latency, errors, failures per service, per minute.",
    owner: "Rafi Ahmed", ownerId: "u12", team: "Platform",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "Streaming",
    freshnessMin: 2,
    rows: "1.9B",
    sizeGb: 1120,
    columns: [
      { name: "event_time", type: "TIMESTAMP", nullable: false, meaning: "Event timestamp" },
      { name: "service_name", type: "STRING", nullable: false, meaning: "Service emitting the event" },
      { name: "event_type", type: "STRING", nullable: false, meaning: "LOGIN / ORDER_PLACED / PAYMENT_FAILED / LATENCY / ERROR / API_CALL" },
      { name: "status", type: "STRING", nullable: false, meaning: "SUCCESS / FAILURE / TIMEOUT" },
      { name: "latency_ms", type: "INT64", nullable: false, meaning: "Observed latency" },
    ],
    consumers: ["Operations Health KPI", "Incident Center", "SRE On-call"],
    upstream: ["raw_layer.ops_event_stream"],
    downstream: ["gold_layer.kpi_executive_daily"],
    usage: { queries: 12400, users: 44, costShare: 0.21 },
    dqScore: 97.9,
  },
  {
    id: "ds9",
    name: "core_layer.fct_support_cases",
    layer: "CORE",
    domain: "Customer Experience",
    description: "Support case facts - priority, SLA attainment, CSAT, escalations. Certified CX source.",
    owner: "Elena Petrova", ownerId: "u6", team: "Customer Operations",
    certified: true,
    sensitivity: "CONFIDENTIAL",
    refresh: "Every 10 min",
    freshnessMin: 10,
    rows: "14M",
    sizeGb: 52,
    columns: [
      { name: "case_id", type: "STRING", nullable: false, meaning: "Support case identifier" },
      { name: "opened_at", type: "TIMESTAMP", nullable: false, meaning: "Case opened" },
      { name: "priority", type: "STRING", nullable: false, meaning: "P1-P4" },
      { name: "case_type", type: "STRING", nullable: false, meaning: "BILLING / TECHNICAL / ACCOUNT / COMPLAINT / REQUEST" },
      { name: "sla_met", type: "BOOL", nullable: false, meaning: "Resolved within SLA" },
      { name: "csat", type: "INT64", nullable: true, meaning: "1-5 satisfaction score" },
      { name: "is_escalated", type: "BOOL", nullable: false, meaning: "Escalation flag" },
    ],
    consumers: ["Support SLA KPI", "CX Dashboard", "Incident Center"],
    upstream: ["raw_layer.support_cases_stream"],
    downstream: ["gold_layer.kpi_executive_daily"],
    usage: { queries: 3120, users: 26, costShare: 0.04 },
    dqScore: 96.4,
  },
  {
    id: "ds10",
    name: "analytics_layer.customer_lifetime_value",
    layer: "ANALYTICS",
    domain: "Customer",
    description: "Predicted LTV per customer segment, refreshed weekly on certified customer + transaction facts.",
    owner: "Sofia Reyes", ownerId: "u4", team: "Analytics COE",
    certified: true,
    sensitivity: "CONFIDENTIAL",
    refresh: "Weekly Sunday",
    freshnessMin: 10080,
    rows: "8.4M",
    sizeGb: 18,
    columns: [
      { name: "customer_key", type: "INT64", nullable: false, meaning: "Conformed customer key" },
      { name: "segment", type: "STRING", nullable: false, meaning: "Segment" },
      { name: "ltv_p90", type: "NUMERIC", nullable: false, meaning: "Predicted LTV (90th pct)" },
      { name: "confidence", type: "FLOAT64", nullable: false, meaning: "Model confidence" },
    ],
    consumers: ["Growth KPI", "Segment Strategy"],
    upstream: ["core_layer.dim_customer", "core_layer.fct_transactions"],
    downstream: [],
    usage: { queries: 980, users: 9, costShare: 0.03 },
    dqScore: 97.1,
  },
  {
    id: "ds11",
    name: "analytics_layer.churn_risk_scores",
    layer: "ANALYTICS",
    domain: "Customer",
    description: "Daily churn risk scores used by retention campaigns. Flagged PII-safe (no raw contact data downstream).",
    owner: "Sofia Reyes", ownerId: "u4", team: "Analytics COE",
    certified: true,
    sensitivity: "RESTRICTED",
    refresh: "Daily 07:00 UTC",
    freshnessMin: 1440,
    rows: "8.4M",
    sizeGb: 14,
    columns: [
      { name: "customer_key", type: "INT64", nullable: false, meaning: "Conformed customer key" },
      { name: "risk_score", type: "FLOAT64", nullable: false, meaning: "0-1 churn probability" },
      { name: "risk_band", type: "STRING", nullable: false, meaning: "LOW / MEDIUM / HIGH / CRITICAL" },
    ],
    consumers: ["Retention Campaigns", "Growth KPI"],
    upstream: ["core_layer.dim_customer", "core_layer.fct_transactions"],
    downstream: [],
    usage: { queries: 240, users: 5, costShare: 0.02 },
    dqScore: 96.9,
  },
  {
    id: "ds12",
    name: "core_layer.dim_product",
    layer: "CORE",
    domain: "Product",
    description: "SCD2 product dimension with category, margin and list price. Certified.",
    owner: "Marcus Lee", ownerId: "u3", team: "Data Engineering",
    certified: true,
    sensitivity: "INTERNAL",
    refresh: "CDC, 15 min",
    freshnessMin: 15,
    rows: "1.1M",
    sizeGb: 8,
    columns: [
      { name: "product_key", type: "INT64", nullable: false, meaning: "Surrogate SCD2 key" },
      { name: "sku", type: "STRING", nullable: false, meaning: "Stock keeping unit" },
      { name: "category", type: "STRING", nullable: false, meaning: "Product category" },
      { name: "margin_pct", type: "FLOAT64", nullable: false, meaning: "Current margin applied" },
      { name: "list_price", type: "NUMERIC", nullable: false, meaning: "List price" },
    ],
    consumers: ["P&L KPI", "Margin Analysis"],
    upstream: ["raw_layer.product_catalog"],
    downstream: ["core_layer.fct_transactions"],
    usage: { queries: 890, users: 18, costShare: 0.01 },
    dqScore: 98.5,
  },
];

export const datasetById = (id: string) => DATASETS.find((d) => d.id === id);

/* ================= KPIs ================= */
export interface Kpi {
  id: string;
  name: string;
  dataset: string;
  datasetId: string;
  metric: string;
  aggregation: string;
  dimensions: string[];
  timeWindow: string;
  unit: string;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  target: number;
  threshold: number;
  owner: string;
  ownerId: string;
  status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
  sql: string;
  certified: boolean;
  spark: number[];
  value?: number;
  lastStatus?: "ON_TRACK" | "WARNING" | "BREACH";
}

const SLICE = (arr: number[], n = 30) => arr.slice(-n);

export function getKpis(): Kpi[] {
  const d = seedData();
  const gmvSeries = d.dailyGmv.map((x) => x.value);
  const slaSeries = d.supportDaily.map((x) => x.slaRate);
  const dqSeries = d.dqDaily.filter((x) => x.product === "Enterprise P&L").map((x) => x.score);
  const costSeries = d.costDaily.map((x) => x.value);
  const opsSeries = d.opsDaily.map((x) => (x.events ? Math.round((x.failures / x.events) * 1000) / 1000 : 0));
  const errorRate = (100 * d.opsDaily[d.opsDaily.length - 1].failures) / d.opsDaily[d.opsDaily.length - 1].events;
  const sla = d.supportDaily[d.supportDaily.length - 1].slaRate;
  const dqScore = dqSeries[dqSeries.length - 1];
  const gmvLast = gmvSeries[gmvSeries.length - 1];
  const costLast = costSeries[costSeries.length - 1];
  const pipelineOk = d.pipelines.filter((p) => p.date >= "2026-07-01").filter((p) => p.status === "SUCCESS").length /
    d.pipelines.filter((p) => p.date >= "2026-07-01").length;

  const kpis: Kpi[] = [
    {
      id: "KPI-001", name: "Gross Merchandise Value (GMV)", dataset: "fct_transactions", datasetId: "ds1",
      metric: "amount_usd", aggregation: "SUM", dimensions: ["bu_code", "region_name"], timeWindow: "30d", unit: "USD",
      direction: "HIGHER_IS_BETTER", target: 2_700_000, threshold: 2_500_000, owner: "Priya Raman", ownerId: "u2",
      status: "PUBLISHED", certified: true,
      sql: "SELECT SUM(amount_usd) AS gmv FROM core_layer.fct_transactions WHERE status='POSTED' AND amount_usd>0 AND txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
      spark: SLICE(gmvSeries), value: gmvLast * 30, lastStatus: gmvLast * 30 < 2_500_000 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-002", name: "Average Order Value", dataset: "fct_transactions", datasetId: "ds1",
      metric: "amount_usd / COUNT(*)", aggregation: "AVG", dimensions: ["channel"], timeWindow: "30d", unit: "USD",
      direction: "HIGHER_IS_BETTER", target: 82, threshold: 72, owner: "Sofia Reyes", ownerId: "u4",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(SUM(amount_usd)/COUNT(*),2) AS aov FROM core_layer.fct_transactions WHERE status='POSTED'",
      spark: gmvSeries.slice(30, 60).map((v, i) => v / (i + 1180)), value: 78.9, lastStatus: "ON_TRACK",
    },
    {
      id: "KPI-003", name: "Active Customers", dataset: "fct_transactions", datasetId: "ds1",
      metric: "COUNT(DISTINCT customer_id)", aggregation: "COUNT DISTINCT", dimensions: ["region_name"], timeWindow: "30d", unit: "count",
      direction: "HIGHER_IS_BETTER", target: 42000, threshold: 38000, owner: "Daniel Kim", ownerId: "u5",
      status: "PUBLISHED", certified: true,
      sql: "SELECT COUNT(DISTINCT customer_id) FROM core_layer.fct_transactions WHERE status='POSTED' AND txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
      spark: gmvSeries.map((v) => Math.round(v * 0.42)), value: 41840, lastStatus: "ON_TRACK",
    },
    {
      id: "KPI-004", name: "Support SLA Attainment", dataset: "fct_support_cases", datasetId: "ds9",
      metric: "sla_met", aggregation: "AVG", dimensions: ["priority"], timeWindow: "7d", unit: "%",
      direction: "HIGHER_IS_BETTER", target: 97, threshold: 92, owner: "Elena Petrova", ownerId: "u6",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(100*AVG(IF(sla_met,1,0)),1) FROM core_layer.fct_support_cases WHERE opened_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)",
      spark: SLICE(slaSeries), value: sla, lastStatus: sla < 92 ? "BREACH" : sla < 95 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-005", name: "Enterprise DQ Score", dataset: "dq_health_daily", datasetId: "ds5",
      metric: "dq_score", aggregation: "AVG", dimensions: ["data_product"], timeWindow: "1d", unit: "score",
      direction: "HIGHER_IS_BETTER", target: 97, threshold: 95, owner: "Ada Sharma", ownerId: "u1",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(AVG(dq_score),1) FROM governance.dq_health_daily WHERE score_date = CURRENT_DATE()",
      spark: SLICE(dqSeries), value: dqScore, lastStatus: dqScore < 95 ? "BREACH" : dqScore < 97 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-006", name: "Service Error Rate", dataset: "fct_operations_events", datasetId: "ds8",
      metric: "status='FAILURE'", aggregation: "RATIO", dimensions: ["service_name"], timeWindow: "1d", unit: "%",
      direction: "LOWER_IS_BETTER", target: 2, threshold: 3.5, owner: "Rafi Ahmed", ownerId: "u12",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(100*COUNTIF(status='FAILURE')/COUNT(*),2) FROM core_layer.fct_operations_events WHERE event_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)",
      spark: opsSeries.map((v) => v * 100), value: errorRate, lastStatus: errorRate > 3.5 ? "BREACH" : errorRate > 2 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-007", name: "Daily Cloud Cost", dataset: "cost_daily_summary", datasetId: "ds6",
      metric: "cost_usd", aggregation: "SUM", dimensions: ["team"], timeWindow: "1d", unit: "USD",
      direction: "LOWER_IS_BETTER", target: 20000, threshold: 30000, owner: "Marcus Lee", ownerId: "u3",
      status: "PUBLISHED", certified: true,
      sql: "SELECT SUM(cost_usd) FROM cost.gold.cost_daily_summary WHERE job_date = CURRENT_DATE()",
      spark: SLICE(costSeries), value: costLast, lastStatus: costLast > 30000 ? "BREACH" : costLast > 20000 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-008", name: "Pipeline Success Rate", dataset: "pipelines", datasetId: "ds3",
      metric: "status", aggregation: "RATIO", dimensions: [], timeWindow: "7d", unit: "%",
      direction: "HIGHER_IS_BETTER", target: 99, threshold: 96, owner: "Marcus Lee", ownerId: "u3",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(100*COUNTIF(status='SUCCESS')/COUNT(*),1) FROM ops.pipeline_runs WHERE run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
      spark: [100, 100, 99, 100, 98, 97, pipelineOk * 100], value: pipelineOk * 100,
      lastStatus: pipelineOk < 0.96 ? "BREACH" : pipelineOk < 0.99 ? "WARNING" : "ON_TRACK",
    },
    {
      id: "KPI-009", name: "Gross Margin", dataset: "fct_transactions", datasetId: "ds1",
      metric: "amount_usd * margin_pct", aggregation: "SUM", dimensions: ["product_category"], timeWindow: "30d", unit: "%",
      direction: "HIGHER_IS_BETTER", target: 30, threshold: 27, owner: "Omar Haddad", ownerId: "u7",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(100*SUM(amount_usd*margin_pct)/SUM(amount_usd),1) FROM core_layer.fct_transactions WHERE status='POSTED'",
      spark: [29.2, 29.4, 29.1, 29.5, 29.3, 29.6, 29.4], value: 29.4, lastStatus: "ON_TRACK",
    },
    {
      id: "KPI-010", name: "Chargeback Rate", dataset: "fct_transactions", datasetId: "ds1",
      metric: "txn_type='CHARGEBACK'", aggregation: "RATIO", dimensions: ["channel"], timeWindow: "7d", unit: "%",
      direction: "LOWER_IS_BETTER", target: 1.5, threshold: 2.5, owner: "Omar Haddad", ownerId: "u7",
      status: "PUBLISHED", certified: true,
      sql: "SELECT ROUND(100*COUNTIF(txn_type='CHARGEBACK')/COUNT(*),2) FROM core_layer.fct_transactions WHERE txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
      spark: [1.2, 1.1, 1.3, 1.2, 3.6, 4.1, 2.8], value: 4.1, lastStatus: "BREACH",
    },
    {
      id: "KPI-011", name: "Data Freshness (fct_transactions)", dataset: "fct_transactions", datasetId: "ds1",
      metric: "ingested_at", aggregation: "MAX", dimensions: [], timeWindow: "1d", unit: "min",
      direction: "LOWER_IS_BETTER", target: 15, threshold: 45, owner: "Mei Lin", ownerId: "u8",
      status: "PUBLISHED", certified: true,
      sql: "SELECT TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(ingested_at), MINUTE) FROM core_layer.fct_transactions",
      spark: [14, 13, 15, 14, 16, 12, 41], value: 41, lastStatus: "BREACH",
    },
  ];
  return kpis;
}

/* ================= Incidents ================= */
export interface TimelineEntry {
  at: string;
  actor: string;
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: "P1" | "P2" | "P3";
  status: "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" | "CLOSED";
  detectedAt: string;
  owner: string;
  ownerId: string;
  source: string;
  detectionRule: string;
  affectedKpis: string[];
  affectedSystems: string[];
  businessImpact: string;
  rootCause: string;
  resolution: string;
  slaMet: boolean;
  timeline: TimelineEntry[];
}

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2026-041", title: "Cloud cost spike: $14k → $41k/day", severity: "P1", status: "INVESTIGATING",
    detectedAt: "2026-07-08T09:14:00Z", owner: "Marcus Lee", ownerId: "u3",
    source: "Cost Anomaly Detector", detectionRule: "daily_cost > 2.5x 30-day baseline",
    affectedKpis: ["Daily Cloud Cost"], affectedSystems: ["BigQuery", "Tableau"],
    businessImpact: "Runaway analyst extract scanned 4.3 TB every 30 min - est. $27k overrun in 7 days.",
    rootCause: "A Tableau extract bound to a full-table scan on fct_transactions with no caching.",
    resolution: "Bind dashboard to the certified gold mart, add LIMIT preview, set FinOps alert at $30k/day.",
    slaMet: false,
    timeline: [
      { at: "2026-07-08T09:14:00Z", actor: "Cost Anomaly Detector", message: "Detected cost 2.9x baseline; auto-opened INC-2026-041." },
      { at: "2026-07-08T09:40:00Z", actor: "Marcus Lee", message: "Queried cost_daily_summary; identified analyst@zumiq.io full_scan_extract." },
      { at: "2026-07-08T10:15:00Z", actor: "FinOps Bot", message: "Suspended extract schedule; notified dashboard owner." },
      { at: "2026-07-10T08:00:00Z", actor: "Marcus Lee", message: "Proposed caching + certified mart migration (fix deployed)." },
    ],
  },
  {
    id: "INC-2026-040", title: "Chargeback rate spike to 4.1%", severity: "P1", status: "MITIGATED",
    detectedAt: "2026-07-11T23:30:00Z", owner: "Omar Haddad", ownerId: "u7",
    source: "DQ Engine", detectionRule: "chargeback_ratio > 2.5%",
    affectedKpis: ["Chargeback Rate", "Net Revenue"], affectedSystems: ["Payment Gateway", "Billing"],
    businessImpact: "New reseller channel double-charged customers. Chargebacks peaked 4.1%; refund exposure est. $1.9M.",
    rootCause: "Reseller onboarding bypassed the idempotency check, duplicating payment calls.",
    resolution: "Froze reseller onboarding, reprocessed with idempotency keys, added partner-channel chargeback DQ rule.",
    slaMet: true,
    timeline: [
      { at: "2026-07-11T23:30:00Z", actor: "DQ Engine", message: "Chargeback ratio crossed 2.5% threshold (now 3.6%)." },
      { at: "2026-07-12T01:00:00Z", actor: "Omar Haddad", message: "Segmented by channel → PARTNER channel 9.4% chargeback rate." },
      { at: "2026-07-12T03:30:00Z", actor: "Billing SRE", message: "Idempotency keys applied; replay verified 0 dupes." },
    ],
  },
  {
    id: "INC-2026-039", title: "GMV volume dip −18% (silent source gap)", severity: "P1", status: "RESOLVED",
    detectedAt: "2026-07-13T07:05:00Z", owner: "Mei Lin", ownerId: "u8",
    source: "DQ Engine", detectionRule: "txn_volume < 85% of trailing 7-day avg",
    affectedKpis: ["GMV", "Active Customers"], affectedSystems: ["OMS", "Landing Zone"],
    businessImpact: "A 7-hour silent source gap read as an 18% crash in the executive dashboard.",
    rootCause: "OMS connector stopped emitting; no volume guardrail existed on the landing feed.",
    resolution: "Added VOLUME DQ rule on raw_layer.transactions_landing; paged on-call within 4 min.",
    slaMet: true,
    timeline: [
      { at: "2026-07-13T07:05:00Z", actor: "DQ Engine", message: "Volume anomaly detected at 07:05 (delayed to avoid daily dip)." },
      { at: "2026-07-13T07:09:00Z", actor: "On-call", message: "Paged; OMS connector found dead." },
      { at: "2026-07-13T10:30:00Z", actor: "Mei Lin", message: "Connector restarted; backfill replay queued." },
    ],
  },
  {
    id: "INC-2026-038", title: "Support SLA collapse 97% → 71%", severity: "P1", status: "RESOLVED",
    detectedAt: "2026-07-02T08:00:00Z", owner: "Elena Petrova", ownerId: "u6",
    source: "SLA Board", detectionRule: "sla_rate < 92%",
    affectedKpis: ["Support SLA Attainment", "CSAT"], affectedSystems: ["Billing", "Support Desk"],
    businessImpact: "Billing bug drove 4,000+ cases in 48h; true SLA was 71%, board showed 97%.",
    rootCause: "SLA board counted only CLOSED cases (closed ones were fine); open backlog hidden.",
    resolution: "Fixed SLA definition to include open + resolved; billing regression patched.",
    slaMet: false,
    timeline: [
      { at: "2026-07-02T08:00:00Z", actor: "SLA Board", message: "Alert: SLA 71% when including open cases." },
      { at: "2026-07-02T09:00:00Z", actor: "Elena Petrova", message: "Confirmed billing regression; opened support wave." },
      { at: "2026-07-03T18:00:00Z", actor: "Billing SRE", message: "Deploy rolled back; case backlog draining." },
    ],
  },
  {
    id: "INC-2026-037", title: "FCT_TRANSACTIONS_LOAD pipeline failing", severity: "P1", status: "OPEN",
    detectedAt: "2026-07-13T05:12:00Z", owner: "Marcus Lee", ownerId: "u3",
    source: "Pipeline Monitor", detectionRule: "pipeline status = FAILED twice consecutive",
    affectedKpis: ["Data Freshness", "GMV"], affectedSystems: ["Batch Orchestration", "Core Layer"],
    businessImpact: "Overnight batch blocked; fct_transactions stale 26h+ and counting.",
    rootCause: "Duplicate keys in retry file violate the unique constraint on txn_id.",
    resolution: "Replay with dedup pre-step; add UNIQUE DQ rule on txn_id.",
    slaMet: false,
    timeline: [
      { at: "2026-07-13T05:12:00Z", actor: "Pipeline Monitor", message: "FCT_TRANSACTIONS_LOAD FAILED (2 consecutive)." },
      { at: "2026-07-13T05:20:00Z", actor: "On-call", message: "Auto-retry queued; investigating log tail." },
      { at: "2026-07-13T06:10:00Z", actor: "Marcus Lee", message: "Found duplicate txn_id in retry file (S03)." },
    ],
  },
  {
    id: "INC-2026-036", title: "Null spike in Customer 360 (EMEA emails)", severity: "P2", status: "MITIGATED",
    detectedAt: "2026-07-13T12:40:00Z", owner: "Mei Lin", ownerId: "u8",
    source: "DQ Engine", detectionRule: "null_ratio on dim_customer.email > 5%",
    affectedKpis: ["Enterprise DQ Score"], affectedSystems: ["CRM CDC"],
    businessImpact: "CRM remap sent NULL emails for EMEA; campaign would silently lose audience.",
    rootCause: "CRM field rename not propagated to CDC mapping (schema drift).",
    resolution: "Fixed mapping; added SCHEMA drift rule on the CRM feed.",
    slaMet: true,
    timeline: [
      { at: "2026-07-13T12:40:00Z", actor: "DQ Engine", message: "NULL ratio 22% on dim_customer.email (EMEA)." },
      { at: "2026-07-13T13:15:00Z", actor: "Mei Lin", message: "Identified CRM mapping drift; corrected." },
    ],
  },
  {
    id: "INC-2026-035", title: "Billing case spike ×3.2", severity: "P2", status: "RESOLVED",
    detectedAt: "2026-07-11T10:00:00Z", owner: "Elena Petrova", ownerId: "u6",
    source: "Anomaly Detector", detectionRule: "case_volume > 2.5x 14-day avg",
    affectedKpis: ["Support SLA Attainment"], affectedSystems: ["Payment Gateway"],
    businessImpact: "Payment gateway regression produced 4,000+ billing cases in 48h.",
    rootCause: "Gateway config regression (PAYMENT_FAILED ×14 on svc-pay-3).",
    resolution: "Gateway rollback; case deflection flows updated.",
    slaMet: true,
    timeline: [
      { at: "2026-07-11T10:00:00Z", actor: "Anomaly Detector", message: "Case volume 3.2x baseline." },
      { at: "2026-07-11T11:30:00Z", actor: "Elena Petrova", message: "Linked to payment failures (svc-pay-3)." },
    ],
  },
  {
    id: "INC-2026-034", title: "Late-arriving data forcing restatement", severity: "P2", status: "CLOSED",
    detectedAt: "2026-07-08T03:00:00Z", owner: "Sofia Reyes", ownerId: "u4",
    source: "DQ Engine", detectionRule: "late_arrival_ratio > 1%",
    affectedKpis: ["GMV", "Gross Margin"], affectedSystems: ["Vendor Extract"],
    businessImpact: "1.4% of transactions arrived 3-9 days late; reports lacked as-of semantics.",
    rootCause: "Vendor delivery schedule changed; no late-arrival buffer in the semantic layer.",
    resolution: "Added as-of joins + late-arrival buffer window in the semantic layer.",
    slaMet: true,
    timeline: [
      { at: "2026-07-08T03:00:00Z", actor: "DQ Engine", message: "Late arrival ratio 1.4%." },
      { at: "2026-07-09T12:00:00Z", actor: "Sofia Reyes", message: "As-of semantics deployed to semantic layer." },
    ],
  },
  {
    id: "INC-2026-033", title: "Duplicate transactions inflating revenue", severity: "P1", status: "CLOSED",
    detectedAt: "2026-07-05T02:30:00Z", owner: "Marcus Lee", ownerId: "u3",
    source: "DQ Engine", detectionRule: "duplicate_ratio on txn_id > 0.5%",
    affectedKpis: ["GMV", "Net Revenue"], affectedSystems: ["OMS", "Landing Zone"],
    businessImpact: "Non-idempotent retry doubled 201k transactions - $2.3M inflation caught before close.",
    rootCause: "Retry replay without idempotency keys duplicated the payload set.",
    resolution: "Dedup MERGE into staging; UNIQUE rule enforced on txn_id.",
    slaMet: true,
    timeline: [
      { at: "2026-07-05T02:30:00Z", actor: "DQ Engine", message: "Duplicate ratio 3.2% on txn_id." },
      { at: "2026-07-05T03:00:00Z", actor: "Marcus Lee", message: "Dedup MERGE executed; net effect replayed." },
    ],
  },
  {
    id: "INC-2026-032", title: "Ops event volume drop (source feed down)", severity: "P1", status: "CLOSED",
    detectedAt: "2026-07-04T14:20:00Z", owner: "Rafi Ahmed", ownerId: "u12",
    source: "DQ Engine", detectionRule: "ops_volume < 40% of 7-day avg",
    affectedKpis: ["Service Error Rate"], affectedSystems: ["Kafka", "Streaming Worker"],
    businessImpact: "A dead streaming worker looked like a 'quiet day' - 5h of blind operations.",
    rootCause: "Streaming worker crashed; no volume guardrail on the ops feed.",
    resolution: "Added VOLUME rule on fct_operations_events; worker auto-restart policy.",
    slaMet: true,
    timeline: [
      { at: "2026-07-04T14:20:00Z", actor: "DQ Engine", message: "Ops volume at 18% of baseline." },
      { at: "2026-07-04T14:45:00Z", actor: "Rafi Ahmed", message: "Worker restarted; backlog replay started." },
    ],
  },
  {
    id: "INC-2026-031", title: "Schema drift breaking attribution model", severity: "P2", status: "RESOLVED",
    detectedAt: "2026-07-01T09:00:00Z", owner: "Sofia Reyes", ownerId: "u4",
    source: "Metadata Platform", detectionRule: "schema_diff detected vs registered",
    affectedKpis: ["Attribution Revenue"], affectedSystems: ["CRM", "Analytics"],
    businessImpact: "Renamed column silently broke the attribution model with no early warning.",
    rootCause: "No schema contract or drift detection on the source feed.",
    resolution: "Lineage impact analysis + SCHEMA rule; contract tests in CI.",
    slaMet: true,
    timeline: [
      { at: "2026-07-01T09:00:00Z", actor: "Metadata Platform", message: "Schema drift detected (campaign_status)." },
      { at: "2026-07-01T11:00:00Z", actor: "Sofia Reyes", message: "Impact: attribution_model; fixed mapping." },
    ],
  },
];

/* ================= DQ Rules ================= */
export interface DqRule {
  id: string;
  name: string;
  type: "NOT_NULL" | "UNIQUE" | "FRESHNESS" | "THRESHOLD" | "DUPLICATE_RATIO" | "VOLUME" | "APPROVAL_RATE" | "SCHEMA";
  dataset: string;
  datasetId: string;
  column?: string;
  params: string;
  threshold: string;
  enabled: boolean;
  owner: string;
  schedule: string;
  lastRun: {
    status: "PASS" | "FAIL" | "ERROR" | "PENDING";
    checked: number;
    failed: number;
    durationMs: number;
    at: string;
  };
}

export const DQ_RULES: DqRule[] = [
  { id: "R-101", name: "txn_id uniqueness", type: "UNIQUE", dataset: "core_layer.fct_transactions", datasetId: "ds1", column: "txn_id", params: "no dupes within partition", threshold: "0 dupes", enabled: true, owner: "Marcus Lee", schedule: "Every 15 min", lastRun: { status: "PASS", checked: 892341, failed: 0, durationMs: 3100, at: "2026-07-14T06:45:00Z" } },
  { id: "R-102", name: "amount NOT NULL", type: "NOT_NULL", dataset: "core_layer.fct_transactions", datasetId: "ds1", column: "amount_usd", params: "posted rows must carry amount", threshold: "0% null", enabled: true, owner: "Marcus Lee", schedule: "Every 15 min", lastRun: { status: "PASS", checked: 892341, failed: 0, durationMs: 1800, at: "2026-07-14T06:45:00Z" } },
  { id: "R-103", name: "fct_transactions freshness", type: "FRESHNESS", dataset: "core_layer.fct_transactions", datasetId: "ds1", params: "max ingest age vs now", threshold: "< 15 min", enabled: true, owner: "Mei Lin", schedule: "Every 5 min", lastRun: { status: "FAIL", checked: 1, failed: 1, durationMs: 900, at: "2026-07-14T06:48:00Z" } },
  { id: "R-104", name: "customer email null ratio", type: "THRESHOLD", dataset: "core_layer.dim_customer", datasetId: "ds2", column: "email", params: "null ratio across current version", threshold: "< 5%", enabled: true, owner: "Mei Lin", schedule: "Hourly", lastRun: { status: "FAIL", checked: 8421133, failed: 221480, durationMs: 5400, at: "2026-07-14T06:00:00Z" } },
  { id: "R-105", name: "txn volume guardrail", type: "VOLUME", dataset: "raw_layer.transactions_landing", datasetId: "ds7", params: "vs trailing 7-day avg", threshold: "> 85%", enabled: true, owner: "Mei Lin", schedule: "Every 5 min", lastRun: { status: "PASS", checked: 1, failed: 0, durationMs: 700, at: "2026-07-14T06:50:00Z" } },
  { id: "R-106", name: "chargeback ratio", type: "APPROVAL_RATE", dataset: "core_layer.fct_transactions", datasetId: "ds1", column: "txn_type", params: "chargebacks as % of txns", threshold: "< 2.5%", enabled: true, owner: "Omar Haddad", schedule: "Hourly", lastRun: { status: "FAIL", checked: 118204, failed: 4846, durationMs: 4100, at: "2026-07-14T06:00:00Z" } },
  { id: "R-107", name: "dim_customer schema contract", type: "SCHEMA", dataset: "raw_layer.crm_customer_cdc", datasetId: "ds2", params: "column set vs registered", threshold: "0 diffs", enabled: true, owner: "Mei Lin", schedule: "Per batch", lastRun: { status: "PASS", checked: 1, failed: 0, durationMs: 1500, at: "2026-07-14T06:30:00Z" } },
  { id: "R-108", name: "duplicate ratio fct_transactions", type: "DUPLICATE_RATIO", dataset: "core_layer.fct_transactions", datasetId: "ds1", column: "txn_id", params: "dupes / total", threshold: "< 0.5%", enabled: true, owner: "Marcus Lee", schedule: "Every 30 min", lastRun: { status: "PASS", checked: 892341, failed: 0, durationMs: 3600, at: "2026-07-14T06:30:00Z" } },
  { id: "R-109", name: "ops volume guardrail", type: "VOLUME", dataset: "core_layer.fct_operations_events", datasetId: "ds8", params: "events per 5 min", threshold: "> 60% of baseline", enabled: true, owner: "Rafi Ahmed", schedule: "Every 5 min", lastRun: { status: "PASS", checked: 1, failed: 0, durationMs: 800, at: "2026-07-14T06:50:00Z" } },
  { id: "R-110", name: "gold kpi recompute freshness", type: "FRESHNESS", dataset: "gold_layer.kpi_executive_daily", datasetId: "ds3", params: "partition age", threshold: "< 25h", enabled: true, owner: "Sofia Reyes", schedule: "Every 30 min", lastRun: { status: "PASS", checked: 1, failed: 0, durationMs: 600, at: "2026-07-14T06:40:00Z" } },
];

/* ================= Glossary ================= */
export interface GlossaryTerm {
  term: string;
  definition: string;
  formula: string;
  owner: string;
  certified: boolean;
  synonyms: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "GMV", definition: "Gross value of posted, non-reversed transactions", formula: "SUM(amount_usd) WHERE status='POSTED' AND is_reversal=FALSE", owner: "Finance", certified: true, synonyms: ["Gross Merchandise Value", "Gross Sales"] },
  { term: "Net Revenue", definition: "GMV minus refunds and chargebacks", formula: "GMV − refunds − chargebacks", owner: "Finance", certified: true, synonyms: ["Net Sales"] },
  { term: "Gross Margin", definition: "GMV × point-in-time product margin", formula: "GMV × margin_pct", owner: "Finance", certified: true, synonyms: ["Contribution Margin"] },
  { term: "Active Customer", definition: "Customer with ≥1 posted transaction in the window", formula: "COUNT(DISTINCT customer_key)", owner: "Growth", certified: true, synonyms: ["MAU", "Buyers"] },
  { term: "Average Order Value", definition: "GMV per posted transaction", formula: "GMV / posted txns", owner: "Growth", certified: true, synonyms: ["AOV", "Basket Size"] },
  { term: "Lifetime Value", definition: "Total posted value per customer", formula: "SUM(amount_usd) per customer_key", owner: "Growth", certified: true, synonyms: ["LTV", "CLV"] },
  { term: "SLA Attainment", definition: "% of cases resolved by SLA due time", formula: "100 × resolved≤due / total", owner: "CX Ops", certified: true, synonyms: ["SLA Compliance"] },
  { term: "First Contact Resolution", definition: "Closed cases with zero reopens", formula: "reopen_count=0 & CLOSED / total", owner: "CX Ops", certified: true, synonyms: ["FCR"] },
  { term: "CSAT", definition: "Average satisfaction score (1-5)", formula: "AVG(satisfaction_score)", owner: "CX Ops", certified: true, synonyms: ["Satisfaction"] },
  { term: "Service Error Rate", definition: "% failing events per service", formula: "COUNTIF(status='FAILURE')/COUNT(*)", owner: "Platform", certified: true, synonyms: ["Error Rate"] },
  { term: "p95 Latency", definition: "95th percentile latency in ms", formula: "PERCENTILE_CONT(latency_ms, 0.95)", owner: "Platform", certified: true, synonyms: [] },
  { term: "Pipeline Success Rate", definition: "% of runs SUCCESS in window", formula: "COUNTIF(status='SUCCESS')/COUNT(*)", owner: "Platform", certified: true, synonyms: [] },
  { term: "Data Freshness", definition: "Age of newest partition vs SLA", formula: "hours since last successful load", owner: "Platform", certified: true, synonyms: ["Staleness"] },
  { term: "MTTR", definition: "Mean time to resolve alerts", formula: "AVG(resolved − triggered)", owner: "Platform", certified: true, synonyms: ["Mean Time To Repair"] },
  { term: "Enterprise DQ Score", definition: "Rows-weighted DQ score across certified tables", formula: "see DQ engine", owner: "Data Quality", certified: true, synonyms: ["DQ Score"] },
  { term: "Cost per TB", definition: "$ per TB processed", formula: "SUM(cost)/SUM(tb)", owner: "FinOps", certified: true, synonyms: ["Scan Cost"] },
  { term: "Dashboard Adoption", definition: "Distinct viewers per dashboard / week", formula: "COUNT(DISTINCT employee_key)", owner: "Data PM", certified: true, synonyms: [] },
  { term: "Certified Coverage", definition: "% of T1 tables certified", formula: "certified T1 / total T1", owner: "Data PM", certified: true, synonyms: ["Coverage"] },
];

/* ================= Governance ================= */
export interface Policy {
  id: string;
  title: string;
  category: "RETENTION" | "CLASSIFICATION" | "PII" | "ACCESS" | "CERTIFICATION" | "DELETION";
  owner: string;
  status: "ACTIVE" | "REVIEW";
  lastReviewed: string;
  summary: string;
}

export const POLICIES: Policy[] = [
  { id: "POL-01", title: "Landing zone retention", category: "RETENTION", owner: "Ada Sharma", status: "ACTIVE", lastReviewed: "2026-05-12", summary: "raw_layer partitions auto-expire after 90 days; long-lived raw kept in cold storage." },
  { id: "POL-02", title: "PII handling", category: "PII", owner: "Ada Sharma", status: "ACTIVE", lastReviewed: "2026-04-02", summary: "All PII columns tagged in catalog; masked by default for non-owners; access gated via IAM." },
  { id: "POL-03", title: "Data classification", category: "CLASSIFICATION", owner: "Ada Sharma", status: "ACTIVE", lastReviewed: "2026-05-20", summary: "Every column classified PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED at registration." },
  { id: "POL-04", title: "Certification standard", category: "CERTIFICATION", owner: "Sofia Reyes", status: "ACTIVE", lastReviewed: "2026-03-30", summary: "A table is certified only when DQ score ≥ 97 for 30 days, has an owner, and a freshness SLA." },
  { id: "POL-05", title: "Quarterly access review", category: "ACCESS", owner: "Ada Sharma", status: "REVIEW", lastReviewed: "2026-06-15", summary: "Every dataset access grant reviewed quarterly; stale grants revoked automatically." },
  { id: "POL-06", title: "Right-to-delete", category: "DELETION", owner: "Ada Sharma", status: "ACTIVE", lastReviewed: "2026-02-10", summary: "Customer deletion requests cascade to all derived layers within 30 days." },
];

export interface RetentionRule {
  layer: string;
  hot: string;
  cold: string;
  expireAfter: string;
  notes: string;
}

export const RETENTION: RetentionRule[] = [
  { layer: "raw_layer", hot: "7 days", cold: "GCS coldline", expireAfter: "90 days", notes: "immutable; reprocess writes new partitions" },
  { layer: "stg_transactions", hot: "3 days", cold: "-", expireAfter: "30 days", notes: "validation + dedup area" },
  { layer: "core_layer", hot: "2 years", cold: "GCS nearline", expireAfter: "7 years", notes: "facts partitioned by date, clustered" },
  { layer: "analytics_layer", hot: "180 days", cold: "-", expireAfter: "3 years", notes: "derived models" },
  { layer: "gold_layer", hot: "indefinite", cold: "-", expireAfter: "never", notes: "certified marts, immutable" },
];

export interface ClassificationLabel {
  label: string;
  color: string;
  description: string;
}

export const CLASSIFICATIONS: ClassificationLabel[] = [
  { label: "PUBLIC", color: "success", description: "Freely accessible, non-sensitive" },
  { label: "INTERNAL", color: "default", description: "Internal business use only" },
  { label: "CONFIDENTIAL", color: "warning", description: "Financial, customer, competitive data" },
  { label: "RESTRICTED", color: "destructive", description: "Regulated / access-list enforced" },
];

export const PII_TAGS = ["EMAIL", "PHONE", "SSN", "ADDRESS", "LOCATION", "ACCOUNT_NUMBER", "ID", "DOB", "IP"];

/* ================= Audit Log ================= */
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  ip: string;
}

export function getAuditLog(): AuditEntry[] {
  const actions: Array<[string, string, string]> = [
    ["published KPI", "KPI-001 Gross Merchandise Value", "certified KPI re-published after threshold update"],
    ["created DQ rule", "R-106 chargeback ratio", "threshold changed 2.0% → 2.5%"],
    ["requested access", "core_layer.dim_customer", "waiting on owner approval"],
    ["granted access", "cost.gold.cost_daily_summary", "FinOps quarterly review"],
    ["viewed dataset", "gold_layer.kpi_executive_daily", "from Executive Dashboard"],
    ["ran query", "playground", "SELECT … GROUP BY region"],
    ["created incident", "INC-2026-041", "auto-opened by Cost Anomaly Detector"],
    ["edited glossary", "Gross Margin", "synonym added: Contribution Margin"],
    ["exported data", "analytics_layer.attribution_model", "CSV export, 41K rows"],
    ["deleted resource", "stg_transactions.20260701", "retention policy applied"],
  ];
  const users = ["ada@zumiq.io", "sofia@zumiq.io", "marcus@zumiq.io", "priya@zumiq.io", "omar@zumiq.io", "elena@zumiq.io"];
  const log: AuditEntry[] = [];
  for (let i = 0; i < 48; i++) {
    const [action, resource, details] = actions[i % actions.length];
    const daysAgo = Math.floor(i / 6);
    const hours = i % 6;
    const at = new Date(Date.UTC(2026, 6, 14) - daysAgo * 86400000 - hours * 3600000).toISOString();
    log.push({
      id: "AUD-" + (9000 + i),
      at,
      actor: users[i % users.length],
      action,
      resource,
      details,
      ip: "10." + (10 + (i % 4)) + "." + (i % 255) + "." + (20 + i),
    });
  }
  return log;
}

/* ================= Marketplace ================= */
export interface DataProduct {
  id: string;
  name: string;
  domain: string;
  owner: string;
  ownerId: string;
  qualityScore: number;
  freshness: string;
  consumers: number;
  monthlyQueries: number;
  version: string;
  certified: boolean;
  documentation: string;
  access: "OPEN" | "REQUEST" | "RESTRICTED";
  description: string;
}

export const PRODUCTS: DataProduct[] = [
  { id: "DP-01", name: "Revenue 360", domain: "Finance", owner: "Omar Haddad", ownerId: "u7", qualityScore: 99.1, freshness: "15 min", consumers: 87, monthlyQueries: 18420, version: "v2.4", certified: true, documentation: "docs/marketplace/revenue-360.md", access: "REQUEST", description: "Certified GMV, net revenue and margin by BU, region, channel and category." },
  { id: "DP-02", name: "Customer 360", domain: "Customer", owner: "Marcus Lee", ownerId: "u3", qualityScore: 95.2, freshness: "5 min", consumers: 54, monthlyQueries: 6210, version: "v3.1", certified: true, documentation: "docs/marketplace/customer-360.md", access: "RESTRICTED", description: "Conformed customer master with segments, tiers, and SCD2 history." },
  { id: "DP-03", name: "Executive KPIs", domain: "Executive", owner: "Sofia Reyes", ownerId: "u4", qualityScore: 98.8, freshness: "Daily 05:30", consumers: 210, monthlyQueries: 11200, version: "v1.9", certified: true, documentation: "docs/marketplace/executive-kpis.md", access: "OPEN", description: "The certified semantic layer behind the board pack and executive dashboards." },
  { id: "DP-04", name: "Operations Health", domain: "Operations", owner: "Rafi Ahmed", ownerId: "u12", qualityScore: 97.9, freshness: "2 min", consumers: 44, monthlyQueries: 12400, version: "v1.4", certified: true, documentation: "docs/marketplace/ops-health.md", access: "OPEN", description: "Service latency, error rates and event health for all production services." },
  { id: "DP-05", name: "Customer Experience", domain: "CX", owner: "Elena Petrova", ownerId: "u6", qualityScore: 96.4, freshness: "10 min", consumers: 26, monthlyQueries: 3120, version: "v2.0", certified: true, documentation: "docs/marketplace/cx.md", access: "REQUEST", description: "Support cases, SLA attainment, CSAT and escalation data." },
  { id: "DP-06", name: "Cloud Cost Insights", domain: "FinOps", owner: "Marcus Lee", ownerId: "u3", qualityScore: 98.2, freshness: "60 min", consumers: 8, monthlyQueries: 330, version: "v1.2", certified: true, documentation: "docs/marketplace/cost-insights.md", access: "RESTRICTED", description: "Query cost, storage, and efficiency data for FinOps." },
  { id: "DP-07", name: "Churn Risk Scores", domain: "Customer", owner: "Sofia Reyes", ownerId: "u4", qualityScore: 96.9, freshness: "Daily", consumers: 5, monthlyQueries: 240, version: "v0.9", certified: false, documentation: "docs/marketplace/churn-risk.md", access: "RESTRICTED", description: "ML churn scores used by retention campaigns. Pending certification." },
  { id: "DP-08", name: "Attribution Model", domain: "Marketing", owner: "Sofia Reyes", ownerId: "u4", qualityScore: 96.7, freshness: "Daily", consumers: 12, monthlyQueries: 1980, version: "v2.2", certified: true, documentation: "docs/marketplace/attribution.md", access: "REQUEST", description: "Multi-touch attribution revenue by campaign and channel." },
];

/* ================= Notifications ================= */
export interface Notification {
  id: string;
  type: "KPI_DROPPED" | "PIPELINE_FAILED" | "FRESHNESS" | "COST_SPIKE" | "DUPLICATE_SPIKE" | "SCHEMA_DRIFT" | "INCIDENT";
  title: string;
  body: string;
  severity: "critical" | "warning" | "info";
  createdAt: string;
  read: boolean;
  link: string;
}

export const NOTIFICATIONS: Notification[] = [
  { id: "N1", type: "PIPELINE_FAILED", title: "FCT_TRANSACTIONS_LOAD failed", body: "Pipeline failed 2 consecutive runs. Overnight batch blocked.", severity: "critical", createdAt: "2026-07-14T05:12:00Z", read: false, link: "/pipelines" },
  { id: "N2", type: "FRESHNESS", title: "fct_transactions freshness breach", body: "Data is 26h stale. SLA is 15 min. See INC-2026-037.", severity: "critical", createdAt: "2026-07-14T06:48:00Z", read: false, link: "/incidents" },
  { id: "N3", type: "KPI_DROPPED", title: "Chargeback Rate in BREACH", body: "Chargeback Rate 4.1% vs threshold 2.5% (KPI-010).", severity: "critical", createdAt: "2026-07-14T06:00:00Z", read: false, link: "/kpis" },
  { id: "N4", type: "KPI_DROPPED", title: "Support SLA in BREACH", body: "SLA Attainment 71% vs target 97% - see INC-2026-038.", severity: "critical", createdAt: "2026-07-02T08:00:00Z", read: false, link: "/kpis" },
  { id: "N5", type: "COST_SPIKE", title: "Cloud cost above $30k alert", body: "Daily cost $41k. Runaway extract detected. INC-2026-041.", severity: "warning", createdAt: "2026-07-14T09:14:00Z", read: false, link: "/cost" },
  { id: "N6", type: "DUPLICATE_SPIKE", title: "Null spike in dim_customer.email", body: "NULL ratio 22% on EMEA emails (R-104).", severity: "warning", createdAt: "2026-07-13T12:40:00Z", read: false, link: "/quality" },
  { id: "N7", type: "SCHEMA_DRIFT", title: "Schema drift detected", body: "crm_customer_cdc column set changed vs registered contract.", severity: "warning", createdAt: "2026-07-13T13:15:00Z", read: true, link: "/catalog" },
  { id: "N8", type: "INCIDENT", title: "INC-2026-041 escalated", body: "Cost incident open 6 days. Owner: Marcus Lee.", severity: "warning", createdAt: "2026-07-14T08:00:00Z", read: true, link: "/incidents" },
  { id: "N9", type: "KPI_DROPPED", title: "Data Freshness WARNING", body: "fct_transactions ingest age 41 min (target 15).", severity: "warning", createdAt: "2026-07-14T06:40:00Z", read: true, link: "/kpis" },
  { id: "N10", type: "INCIDENT", title: "INC-2026-039 resolved", body: "GMV volume dip resolved. Postmortem published.", severity: "info", createdAt: "2026-07-13T10:30:00Z", read: true, link: "/incidents" },
];

/* ================= Activity ================= */
export interface Activity {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
}

export const ACTIVITY: Activity[] = [
  { id: "A1", at: "2026-07-14T07:02:00Z", actor: "marcus@zumiq.io", action: "replayed pipeline", resource: "FCT_TRANSACTIONS_LOAD (retry #3)" },
  { id: "A2", at: "2026-07-14T06:58:00Z", actor: "sofia@zumiq.io", action: "published KPI", resource: "KPI-001 Gross Merchandise Value" },
  { id: "A3", at: "2026-07-14T06:50:00Z", actor: "dq-engine", action: "ran 132 checks", resource: "governance.dq_health_daily" },
  { id: "A4", at: "2026-07-14T06:45:00Z", actor: "marcus@zumiq.io", action: "edited DQ rule", resource: "R-108 duplicate ratio" },
  { id: "A5", at: "2026-07-14T06:12:00Z", actor: "omar@zumiq.io", action: "created incident", resource: "INC-2026-041" },
  { id: "A6", at: "2026-07-14T05:40:00Z", actor: "priya@zumiq.io", action: "viewed", resource: "Executive Dashboard" },
  { id: "A7", at: "2026-07-14T05:20:00Z", actor: "elena@zumiq.io", action: "escalated case", resource: "Support wave (billing)" },
  { id: "A8", at: "2026-07-13T22:10:00Z", actor: "daniel@zumiq.io", action: "published KPI", resource: "KPI-008 Pipeline Success Rate" },
  { id: "A9", at: "2026-07-13T18:30:00Z", actor: "rafi@zumiq.io", action: "requested access", resource: "cost.gold.cost_daily_summary" },
  { id: "A10", at: "2026-07-13T16:00:00Z", actor: "ada@zumiq.io", action: "updated policy", resource: "POL-05 quarterly access review" },
  { id: "A11", at: "2026-07-13T14:20:00Z", actor: "sofia@zumiq.io", action: "published data product", resource: "DP-03 Executive KPIs v1.9" },
  { id: "A12", at: "2026-07-13T13:15:00Z", actor: "mei@zumiq.io", action: "fixed mapping", resource: "CRM CDC (EMEA nulls)" },
];

/* ================= Product Analytics ================= */
export interface FeatureUsage {
  feature: string;
  users: number;
  sessions: number;
  label: string;
}

export const FEATURE_USAGE: FeatureUsage[] = [
  { feature: "kpi_studio", label: "KPI Studio", users: 84, sessions: 1420 },
  { feature: "playground", label: "Query Playground", users: 132, sessions: 2890 },
  { feature: "search", label: "Enterprise Search", users: 168, sessions: 3140 },
  { feature: "catalog", label: "Catalog", users: 156, sessions: 2310 },
  { feature: "incidents", label: "Incident Center", users: 73, sessions: 1180 },
  { feature: "pipelines", label: "Pipeline Monitor", users: 41, sessions: 640 },
  { feature: "marketplace", label: "Marketplace", users: 89, sessions: 1210 },
  { feature: "ask", label: "Executive Ask", users: 24, sessions: 380 },
];

export interface AdoptionSeries {
  label: string;
  value: number;
}

export function getDauSeries(): AdoptionSeries[] {
  const rnd = mulberry32(990001);
  return dRange.slice(-60).map((date, i) => ({
    label: date,
    value: Math.round(310 + 40 * Math.sin(i / 9) + 18 * Math.sin(i / 3) + (rnd() - 0.5) * 24),
  }));
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MOST_USED_KPIS = [
  { name: "GMV", views: 4120, trend: 8 },
  { name: "Support SLA Attainment", views: 2980, trend: -14 },
  { name: "Enterprise DQ Score", views: 2140, trend: 3 },
  { name: "Daily Cloud Cost", views: 1890, trend: 22 },
  { name: "Active Customers", views: 1610, trend: 5 },
  { name: "Service Error Rate", views: 1420, trend: -6 },
];

export const ANALYTICS_SUMMARY = {
  mau: 384,
  wau: 262,
  dau: 312,
  certifiedCoverage: 68,
  searchesPerDay: 1420,
  kpisCreated: 46,
  rulesCreated: 132,
  dashboardsActive: 24,
  adoptionDelta: 12.4,
};
