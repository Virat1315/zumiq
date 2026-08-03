# ZUMIQ — Executive Dashboards (Tableau)

> Ten certified dashboards. Every chart in this document is specified with
> **Purpose · Business Question · KPI · Calculation · Target User · Decision
> Enabled**. All KPIs are CERTIFIED glossary terms; all dashboards bind to
> certified semantic views (never raw SQL formulas).

## 1. Executive Overview
- **Purpose:** The CEO/CFO morning brief — one screen, one version of the truth.
- **Business question:** "Are we on track, and is the number right?"
- **KPIs:** GMV, Net Revenue, Gross Margin, Active Customers, DQ Score,
  Freshness, Cost/TB (guardrails on the side rail).
- **Calculations:** GMV = `SUM(amount_usd) WHERE status='POSTED' AND is_reversal=FALSE`
  (certified); DQ = `governance.dq_health_daily.dq_score`; freshness =
  `hours since last successful load`.
- **Target user:** CEO, CFO, EVPs.
- **Decision enabled:** Where to intervene today (region/BU drill-down);
  whether the number is trustworthy.

## 2. Business Unit P&L
- **Purpose:** BU heads see their own P&L + peer comparison.
- **Business question:** "How is my BU doing vs plan and vs peers?"
- **KPIs:** Net Revenue, Gross Margin %, Refund Rate, Chargeback Rate, AOV.
- **Calculation:** blended margin = `SUM(amount_usd × margin_pct)/SUM(amount_usd)`;
  AOV = `GMV / posted txns`.
- **Target user:** BU heads, Finance business partners.
- **Decision enabled:** Cost control, pricing/margin actions, plan-vs-actual review.

## 3. Operations Health
- **Purpose:** Real-time-ish platform and service health.
- **Business question:** "Is anything failing right now?"
- **KPIs:** Event volume by source, error rate, p95 latency, pipeline success rate.
- **Calculation:** error rate = `COUNTIF(status='FAILURE')/COUNT(*)`; p95 =
  `PERCENTILE_CONT(latency_ms, 0.95)`.
- **Target user:** Platform SRE, BU ops leads.
- **Decision enabled:** Rollback a release, scale a service, page the right team.

## 4. Customer Experience (CX)
- **Purpose:** SLA attainment, backlog, and satisfaction.
- **Business question:** "Are we meeting our service promises?"
- **KPIs:** SLA Attainment by priority, First Contact Resolution, CSAT,
  Escalation Rate, open-case age.
- **Calculation:** SLA = `100 × resolved≤due / total`; FCR = `closed & reopen=0 / total`.
- **Target user:** CX Ops, Head of CX.
- **Decision enabled:** Staffing, priority realignment, escalation interventions.

## 5. Financial Performance
- **Purpose:** P&L bridge + MTD vs prior periods.
- **Business question:** "Where did the money go, and is the number right?"
- **KPIs:** Net Revenue, Gross Margin, Refund Rate, MTD vs last MTD, variance
  to plan.
- **Calculation:** MTD vs last-MTD with `% change` (see Q079).
- **Target user:** CFO, Finance, auditors.
- **Decision enabled:** Guidance adjustments, cost actions, restatement review.

## 6. Platform Health
- **Purpose:** Pipeline, freshness, DQ, and alert status — one pane.
- **Business question:** "Is the platform keeping its promises?"
- **KPIs:** Pipeline success rate, DQ score, freshness compliance, open alerts,
  MTTR.
- **Calculation:** health index (Q077) = `0.35·pipeline + 0.35·DQ + 0.30·freshness`.
- **Target user:** Platform team, Data PM, exec sponsor.
- **Decision enabled:** Prioritize platform fixes, assess SLA risk.

## 7. Data Quality
- **Purpose:** The DQ scorecard per data product.
- **Business question:** "Which data products are at risk?"
- **KPIs:** Enterprise DQ score, per-product score, checks passed/failed,
  failures by dimension, DQ anomaly flags.
- **Calculation:** DQ score (severity-weighted) from `dq_health_daily`.
- **Target user:** Data Quality team, data owners, Data PM.
- **Decision enabled:** Which products to quarantine/fix first.

## 8. Metadata & Lineage
- **Purpose:** Catalog health: ownership, certification, lineage coverage.
- **Business question:** "Do we know what we have and who owns it?"
- **KPIs:** % tables owned, % certified, lineage coverage, unregistered tables,
  sensitivity flags (PII counts).
- **Calculation:** coverage = `owned / total` per criticality.
- **Target user:** Data stewards, platform team, auditors.
- **Decision enabled:** Naming owners, certification push, security review.

## 9. Pipeline Monitoring
- **Purpose:** Every pipeline run, SLA countdown, failure reasons.
- **Business question:** "What is about to break, and what already broke?"
- **KPIs:** Run status, success rate (30d), rows written, volume drift flag,
  time-to-SLA-breach.
- **Calculation:** drift = `rows_written / trailing_28d_avg` (Q069).
- **Target user:** Platform on-call, data engineers.
- **Decision enabled:** Re-run, page, roll back, extend SLA.

## 10. Cloud Cost
- **Purpose:** Spend, budgets, anomalies, top spenders.
- **Business question:** "Are we in budget, and who is spiking?"
- **KPIs:** Cost/day, cost/TB, budget attainment by team, top 10 users,
  cache-hit ratio, anomaly count.
- **Calculation:** cost = `SUM(cost_usd)` from `cost.fct_query_cost`; anomaly =
  `> $1k/user/day` (Q084/Q089).
- **Target user:** FinOps, Data PM, platform.
- **Decision enabled:** Budget enforcement, query optimization, reservation
  sizing.

---

## Chart Specification Format (used for every visual)

| Field | Example |
|---|---|
| Chart | Line: GMV vs 7-day moving average |
| Sheet | gmv_trend |
| X | metric_date |
| Y | SUM(gmv_usd) |
| Color | bu_name |
| Reference | 28-day avg band |
| Tooltip | GMV, Δvs prev day, DQ flag |
| Action | Click BU → filter P&L dashboard |
| Data source | analytics_layer.v_executive_daily |

*Full chart-by-chart specs are in the workbook; the workbook connects to the
semantic views listed above.*
