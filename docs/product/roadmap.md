# ZUMIQ - Product Roadmap

> The plan that shows disciplined, outcome-driven product management. Each
> quarter has a theme, an outcome, and measurable exit criteria.

## Quarter Roadmap

### Q1 - "Foundation & Trust" (completed)
**Outcome:** certified data products exist and are governed.
- Medallion layers + BigQuery DDL (partition/cluster)
- DQ engine v1 (9 dimensions, scorecard, alerts)
- Metadata agent + column catalog + sensitivity flags
- 3 certified data products: Enterprise P&L, Customer 360, Platform Health
- Pipeline observability (fct_pipeline_runs) + freshness alerts
- **Exit criteria:** DQ score ≥ 91; 0 unregistered T1 tables; exec dashboard < 3s

### Q2 - "Scale & Self-Serve" (completed)
**Outcome:** analysts self-serve on certified semantics safely.
- Semantic layer views + certified glossary (20+ terms)
- Cost governance: telemetry, budgets, anomaly alerts, dry-run CI gate
- Materialized views for hot aggregations (GMV, ops events, cost)
- Tableau exec dashboards (7 dashboards) on certified views
- Data product registry + certification workflow
- **Exit criteria:** 43% cost reduction; DQ ≥ 96; 7 dashboards live

### Q3 - "Advanced Analytics & Product Adoption" (in progress)
**Outcome:** the platform becomes a daily habit.
- Customer 360 + RFM segmentation + churn-risk scoring
- Scenario playbooks (22 runbooks) + incident response automation
- Product analytics on ZUMIQ itself (adoption dashboards, stale report detection)
- Lineage-powered impact analysis + deprecation workflow
- Flat-rate slot sizing review; reservation recommendation
- **Exit criteria:** DQ ≥ 98; WTD +30% WoW trend; MTTR < 4h

### Q4 - "Innovation & Hardening" (planned)
- Streaming anomaly detection (payments + ops events, near-real-time)
- Row-level security for CONFIDENTIAL gold marts
- Looker Studio self-serve for light users
- Cost forecasting + budget alerting to finance
- **Exit criteria:** streaming alerting live; security review passed; cost forecast ±5%

## Release Themes by Epic

| Epic | Quarter | Value |
|---|---|---|
| Data product certification | Q1 | Trust |
| DQ engine | Q1 | Trust |
| Metadata & lineage | Q1 | Findability |
| Semantic layer | Q2 | One number |
| Cost governance | Q2 | Cost |
| Tableau dashboards | Q2 | Decision speed |
| Product analytics | Q3 | Adoption |
| Scenario runbooks | Q3 | Reliability |
| Streaming anomalies | Q4 | Speed |

## Rolling 12-Month Vision
- **M1–M3:** Trust (DQ, governance, certification)
- **M4–M6:** Scale (self-serve, cost, dashboards)
- **M7–M9:** Habit (adoption, runbooks, product analytics)
- **M10–M12:** Edge (streaming anomalies, RL security, forecasting)

## Prioritization Philosophy
Every feature is scored by RICE (see rice-prioritization.md) and must move at
least one of: WTD (north star), cost/TB (guardrail), DQ score (guardrail), or
MTTR (guardrail). If it doesn't, it's deprioritized regardless of stakeholder
loudness - the roadmap is a promise, not a wish list.
