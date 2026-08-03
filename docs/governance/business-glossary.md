# ZUMIQ — Business Glossary (Certified Metrics)

> The single source of truth for every metric. A metric is only usable in an
> executive dashboard once it is **CERTIFIED** here with an explicit formula.
> This is the mechanism that ended the "which revenue is correct?" wars.

## 1. Revenue & Profitability

| Term | Definition | Canonical Formula | Owner | Status |
|---|---|---|---|---|
| **GMV** | Gross value of posted, non-reversed transactions | `SUM(amount_usd) WHERE status='POSTED' AND is_reversal=FALSE` | Finance | CERTIFIED |
| **Net Revenue** | GMV minus refunds and chargebacks | `GMV − refunds_usd − chargebacks_usd` | Finance | CERTIFIED |
| **Gross Margin** | Contribution before operating costs | `GMV × product margin_pct` (point-in-time margin) | Finance | CERTIFIED |
| **Net Margin Rate** | (Net Revenue − Gross Margin) / Net Revenue | see Q078 | Finance | CERTIFIED |
| **Refund Rate** | Refunds as % of GMV | `refunds_usd / GMV` | Finance | CERTIFIED |
| **Chargeback Rate** | Chargebacks as % of GMV | `chargebacks_usd / GMV` | Risk | CERTIFIED |

## 2. Customer & Growth

| Term | Definition | Canonical Formula | Owner | Status |
|---|---|---|---|---|
| **Active Customer** | Customer with ≥1 posted transaction in window | `COUNT(DISTINCT customer_key)` | Growth | CERTIFIED |
| **Average Order Value (AOV)** | GMV / transaction count | `GMV / COUNTIF(status='POSTED')` | Growth | CERTIFIED |
| **Lifetime Value (LTV)** | Total posted value per customer | `SUM(amount_usd) per customer` | Growth | CERTIFIED |
| **Customer Churn** | Active→inactive within 90 days | `1 − retained_90d / active_90d_ago` | Growth | DRAFT |
| **Engagement Status** | ACTIVE/AT_RISK/DORMANT/LAPSED | recency window rule (see v_customer_360) | Growth | CERTIFIED |

## 3. Customer Experience

| Term | Definition | Canonical Formula | Owner | Status |
|---|---|---|---|---|
| **SLA Attainment** | % cases resolved by SLA due | `100 × COUNTIF(resolved ≤ sla_due) / COUNT(*)` | CX Ops | CERTIFIED |
| **First Contact Resolution** | Closed cases with 0 reopens | `COUNTIF(reopen_count=0 AND status='CLOSED') / total` | CX Ops | CERTIFIED |
| **CSAT** | Average satisfaction score | `AVG(satisfaction_score)` (1–5) | CX Ops | CERTIFIED |
| **Escalation Rate** | Escalated / total cases | `COUNTIF(is_escalated) / COUNT(*)` | CX Ops | CERTIFIED |

## 4. Operations & Reliability

| Term | Definition | Canonical Formula | Owner | Status |
|---|---|---|---|---|
| **Service Error Rate** | % failing events per service | `COUNTIF(status='FAILURE') / COUNT(*)` | Platform | CERTIFIED |
| **p95 Latency** | 95th percentile latency | `PERCENTILE_CONT(latency_ms, 0.95)` | Platform | CERTIFIED |
| **Pipeline Success Rate** | % runs SUCCESS in window | `COUNTIF(status='SUCCESS') / COUNT(*)` | Platform | CERTIFIED |
| **Data Freshness** | Age of newest partition vs SLA | `hours since last successful load` | Platform | CERTIFIED |
| **MTTR** | Mean time to resolve alerts | `AVG(resolved − triggered)` | Platform | CERTIFIED |

## 5. Platform & Data Product

| Term | Definition | Canonical Formula | Owner | Status |
|---|---|---|---|---|
| **Enterprise DQ Score** | Rows-weighted DQ score across certified tables | see DQ engine | Data Quality | CERTIFIED |
| **DQ Floor** | Minimum acceptable score per product | `table_catalog.dq_sla` | Data Quality | CERTIFIED |
| **Cost per Query TB** | $ per TB processed | `SUM(cost) / SUM(tb)` | FinOps | CERTIFIED |
| **Query Cost Budget** | Team monthly spend cap | sum by labels | FinOps | CERTIFIED |
| **Dashboard Adoption** | Distinct viewers per dashboard / week | `COUNT(DISTINCT employee_key)` | Data PM | CERTIFIED |
| **Certified Coverage** | % of T1 tables certified | `certified T1 / total T1` | Data PM | CERTIFIED |

## 6. Glossary Governance Rules

1. **Only CERTIFIED terms** can appear in an executive dashboard.
2. **Formula lives here and in the semantic layer** — never re-derived in SQL.
3. **Changes are versioned** (`effective_from/to`); a change bumps the version
   and triggers consumer notification via lineage.
4. **Owner + steward named**; disputes escalate to the Data Product Manager.
5. **Deprecation** requires a replacement term and a 2-sprint migration.

## 7. The "One Number" Pledge

Because GMV, Net Revenue, Active Customers, SLA Attainment, and DQ Score are
all defined once, the number shown in the CEO's morning brief **always equals**
the number shown to the BU head — eliminating the #1 trust complaint in the
pre-ZUMIQ enterprise.
