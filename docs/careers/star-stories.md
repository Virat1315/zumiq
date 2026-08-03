# ZUMIQ — STAR Stories (Behavioral Interview Arsenal)

> Six stories, each a full STAR (Situation, Task, Action, Result), built on
> the ZUMIQ scenarios. Use the one that matches the question asked.

---

## Story 1 — "Killed the Revenue Definition War" (Scenario 01) · Collaboration/Influence

- **Situation:** The CEO's morning brief and the Retail BU report showed
  different GMV for the same day ($12.4M vs $9.8M). Execs spent 40+ minutes a
  week arguing about the number.
- **Task:** Eliminate conflicting KPI definitions across 11 teams.
- **Action:** I investigated and proved the gap was two different formulas
  (refunds + channel filters), not a data bug. I built a **semantic layer** —
  every metric defined once in certified views bound to a governance glossary —
  and made dashboard certification mandatory: any dashboard whose metric
  doesn't match the certified formula is flagged. I added an automated
  consistency check that diffs every dashboard total against the certified view.
- **Result:** Definition disputes dropped to zero; the "one number" pledge held;
  executive meeting time freed. The board now trusts the number because the
  number is now *one thing*.

## Story 2 — "Caught a $2.3M Revenue Inflation Before It Shipped" (Scenario 06) · Judgment/Analytical

- **Situation:** A load retry had committed twice; 201,043 duplicate
  transactions inflated a day's revenue by 4.7%.
- **Task:** Prevent misstated revenue from reaching the quarter close.
- **Action:** I wrote the uniqueness and integrity SQL to prove the duplicates,
  traced them to a non-idempotent retry, then implemented (1) a dedup guard in
  staging using ROW_NUMBER on the dedup key, (2) an ERROR-severity uniqueness
  rule in the DQ engine that blocks promotion on any duplicate, and (3) a
  nightly fact-vs-aggregate reconciliation check.
- **Result:** The inflation never hit the books. The DQ engine now catches this
  class of failure in minutes, not audits-later. Avoided a formal restatement
  (SOX exposure).

## Story 3 — "Turned a $27k/Week Cost Spike into a 43% Reduction" (Scenario 05) · Ownership/Financial

- **Situation:** BigQuery spend jumped $14k → $41k/day; a single analyst's
  Tableau extract scanned the entire table every 30 minutes.
- **Task:** Regain cost control and make it structural.
- **Action:** I built cost telemetry from BigQuery job logs, added per-user
  anomaly alerts and team budgets via labels, enforced a **dry-run CI gate**
  that blocks any query scanning >5 TB, fixed the extract to a rolling 90-day
  date filter, and introduced materialized views for hot aggregates.
- **Result:** Platform query spend fell 43% in two months; the runaway pattern
  is now auto-detected; cost/TB per team is visible monthly.

## Story 4 — "Fixed Alert Fatigue to Save a 36-Hour Blind Window" (Scenario 17) · Process Improvement

- **Situation:** The DQ engine raised 40+ alerts a week; engineers ignored
  them, then missed a real failure for 36 hours.
- **Task:** Make alerts trustworthy again without losing coverage.
- **Action:** I analyzed ack rates and false-positive rates per rule, ran a
  threshold-tuning pass (per-table SLAs, not one-size), enforced
  ERROR-pages-only (WARNING→dashboard, INFO→log), added an unacked-HIGH
  escalation after 30 minutes, and introduced a precision metric tracked on the
  DQ dashboard.
- **Result:** Alert noise cut ~70%; ack rate climbed above 90%; the blind-window
  failure mode is structurally gone.

## Story 5 — "Launched a Feature Nobody Used — Then Fixed It With Users" (Scenario 19) · Product/Learning

- **Situation:** The platform was technically healthy (DQ 98) but analyst
  self-serve queries fell 38%.
- **Task:** Recover adoption on the platform's own product.
- **Action:** I instrumented adoption (weekly active users, stale dashboards,
  per-team usage), saw Marketing dropped 80%, then — critically — **talked to
  12 analysts**. Interviews revealed slow catalog search and untrustworthy marts.
  I fixed discoverability (business-term search, glossary + lineage links),
  added a "first query in 5 minutes" onboarding, and recruited BU champions.
- **Result:** Queries recovered and the north-star metric (Weekly Trusted
  Decisions) is now tracked weekly, so a regression shows in days. The lesson —
  data pointed, but conversations confirmed — became a platform principle.

## Story 6 — "Built the Platform Nobody Wanted to Hand-Build" (Across the Project) · Craft/Technical

- **Situation:** Data quality checks lived in random notebooks; cataloging was
  manual; lineage didn't exist; cost was a surprise at invoice time.
- **Task:** Build a self-describing, self-healing data platform on BigQuery.
- **Action:** I designed and built the medallion warehouse (SCD2 dims,
  partitioned/clustered facts), an automated DQ engine (9 dimensions,
  severity-weighted enterprise score, RCA samples), a metadata agent + lineage
  parser, cost governance with anomaly alerts, and 10 certified Tableau
  dashboards bound to a semantic layer. All documented with ADRs, a glossary,
  22 incident playbooks, and 105 production SQL queries.
- **Result:** Enterprise DQ score 98, 43% cost reduction, one version of the
  truth, and a portfolio that behaves like a Fortune-100 internal platform.
