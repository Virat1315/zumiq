# ZUMIQ - Resume Bullet Points

> Copy-paste-ready, quantified, role-targeted. Pick the set that matches the
> job you're applying for. Numbers are real to the project (synthetic data,
> but the reasoning is production-grade).

## Product Manager / Data Product Manager

- Designed and shipped an enterprise data intelligence platform (ZUMIQ) that
  converts raw operational data from 9 source systems into certified, governed
  data products - 6,500+ internal users, 1.2M events/day.
- Defined the north-star metric (Weekly Trusted Decisions) and a guardrail
  framework (DQ score, freshness, cost/TB); eliminated 7 conflicting KPI
  definitions via a semantic layer + certified glossary, reducing metric
  disputes to zero.
- Wrote the full product lifecycle: PRD, personas, journey maps, user stories,
  acceptance criteria, roadmap, sprint planning, RICE prioritization, and a
  22-item risk register with mitigations.
- Ran a 4-person squad in 2-week sprints (velocity 18–22 pts), shipping 6
  certified data products and 10 dashboards; recovered a 38% adoption drop by
  instrumenting usage and interviewing 12 users (churn→recovery in one quarter).
- Led data-product operations: ownership, SLAs, DQ floors, deprecation
  workflow - 100% of T1 tables certified and owned.

## Analytics Engineer / Data Product Analyst

- Built a semantic layer in BigQuery: certified metric views + governed
  business glossary (20+ terms) so every dashboard reads the same definition;
  enforced dashboard certification in CI.
- Implemented SCD Type 2 dimensions (customer/account/product) with MERGE
  loads and record-hash change detection; point-in-time (as-of) joins for
  finance restatements.
- Automated a 9-dimension data quality engine (completeness → volume) with a
  severity-weighted enterprise score, root-cause failure samples, and
  promotion-gating; enterprise DQ score 82 → 98.
- Wrote 105 production SQL queries (window functions, recursive CTEs, JSON,
  PIVOT/UNPIVOT, MERGE, QUALIFY) with documented business rationale.

## Data Engineer (BigQuery / Cloud)

- Designed a medallion data architecture on Google BigQuery: landing → raw →
  staging → core → gold/analytics, with partitioned facts and clustered
  dimensions (fct_transactions: ~200k rows/day/partition, clustered by
  customer/region/account).
- Engineered pipeline observability: every job logs to one runs table;
  freshness SLAs, volume-drift detection, and alerting wired end-to-end.
- Built cost governance: per-job cost telemetry, team budgets via labels,
  anomaly alerts (>$1k/day/user), dry-run CI gate (>5TB blocked), materialized
  views for hot aggregates → 43% query-spend reduction.
- Automated metadata: catalog + column sensitivity (PII/PCI/PHI), column-level
  lineage parser, schema-drift detection with recursive impact analysis.

## Data Analyst / Business Analyst

- Investigated 22 enterprise incidents end-to-end (SQL → root cause → business
  impact → recommendation), including an 18% GMV drop traced to a silent feed
  failure and a $2.3M duplicate-revenue near-miss.
- Designed 10 certified Tableau dashboards (Executive Overview, P&L, Ops Health,
  CX SLA, Platform Health, DQ, Cost) - each with purpose, KPI, calculation,
  target user, and decision enabled.
- Built KPI frameworks: executive / business / operational / platform / data
  product tiers, plus adoption funnel and north-star tracking on the platform
  itself.

## Universal (any role)

- Documented everything an enterprise expects: ADRs, ERDs, data dictionary,
  metadata catalog, business glossary, SLA framework, and an interview guide.
- Full artifacts: README, architecture, 105-query SQL library, BigQuery DDL/DML,
  Python DQ engine, metadata agent, lineage parser, Tableau workbook, 22
  scenario playbooks, product docs, and wireframes.
