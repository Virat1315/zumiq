# ZUMIQ — Enterprise Business Scenarios (22 Playbooks)

> Every scenario is a realistic enterprise incident with: **Problem, SQL
> Investigation, Root Cause, Dashboard, Business Impact, Recommendation.**
> These double as interview stories and as a reference for the platform team.
> SQL references point to files in `/sql` and `/bigquery`.

## Index

| # | Scenario | Domain | Severity |
|---|---|---|---|
| 01 | Executive P&L mismatch: Finance vs Retail teams | Governance/Semantics | P1 |
| 02 | Unexpected 18% KPI drop in daily GMV | Revenue | P1 |
| 03 | Pipeline failure blocking the overnight batch | Reliability | P1 |
| 04 | Data freshness breach delaying Finance close | Freshness/SLA | P1 |
| 05 | Cloud cost spike: $14k/day → $41k/day | Cost | P1 |
| 06 | Duplicate transactions inflating revenue | DQ/Uniqueness | P1 |
| 07 | Metadata inconsistency breaking Tableau extracts | Metadata | P2 |
| 08 | Customer service degradation: SLA breaches | CX | P1 |
| 09 | Schema drift breaking downstream models | Schema/Lineage | P1 |
| 10 | Late-arriving data forcing a restatement | Timeliness | P1 |
| 11 | Support case spike from a billing bug | CX/Product | P2 |
| 12 | Stockout eating revenue (inventory receipts) | Operations | P2 |
| 13 | Dashboard latency from full-table scans | Performance | P2 |
| 14 | Null spike in the customer dimension | DQ/Completeness | P2 |
| 15 | Ops event volume drop: source feed down | Reliability | P1 |
| 16 | Wrong product margin in a restatement | Accuracy | P1 |
| 17 | DQ alert fatigue: false positives | DQ/Ops | P2 |
| 18 | Stale Tableau extracts causing report mismatch | BI | P2 |
| 19 | ZUMIQ self-serve adoption drop | Product Analytics | P2 |
| 20 | Chargeback rate spike | Risk/Revenue | P1 |
| 21 | FX conversion error in global consolidation | Finance | P1 |
| 22 | Orphan FK surge after master data cleanup | DQ/Integrity | P2 |

## How to read a playbook
Each file is structured: Problem → Investigation (SQL that found the truth) →
Root cause → Dashboard (which one surfaced it) → Business impact ($, time,
risk) → Recommendation (what we changed so it never happens again).
