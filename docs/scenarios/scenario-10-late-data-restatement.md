# Scenario 10 — Late-Arriving Data Forcing a Restatement

**Severity:** P1 · **Domain:** Timeliness

## Problem
Two weeks after a daily GMV report was published, 1.4% of its transactions
arrived late (3–9 days after the fact). Finance had to re-state the number —
and the BU had already acted on the first version.

## SQL Investigation
Step 1 — quantify late arrivals by day:

```sql
SELECT
  txn_date,
  MAX(DATE(etl_loaded_at)) AS last_load,
  MAX(DATE_DIFF(DATE(etl_loaded_at), txn_date, DAY)) AS max_late_days,
  COUNTIF(DATE_DIFF(DATE(etl_loaded_at), txn_date, DAY) > 3) AS late_rows
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE '2026-06-01' AND DATE '2026-07-01'
GROUP BY 1
HAVING late_rows > 0
ORDER BY 1;
-- Jun 18: 12,400 rows arrived 5-9 days late (1.4% of the day)
```

Step 2 — where did they come from?

```sql
SELECT source_system, txn_type, COUNT(*) AS n, SUM(amount_usd) AS amt
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = '2026-06-18'
  AND DATE_DIFF(DATE(etl_loaded_at), txn_date, DAY) > 3
GROUP BY 1, 2 ORDER BY 3 DESC;
-- ERP "batch settlement" file for Jun 18 only processed on Jun 27 (vendor backlog)
```

Step 3 — was the report frozen correctly? (as-of check)

```sql
-- If the report was "as-of Jun 20", late Jun 18 rows SHOULD have been excluded.
SELECT
  COUNTIF(DATE(etl_loaded_at) <= '2026-06-20') AS rows_in_asof,
  COUNTIF(DATE(etl_loaded_at) >  '2026-06-20') AS late_after_asof
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = '2026-06-18';
-- Report was NOT as-of: it pulled everything present at refresh time.
```

## Root Cause
Transactions can legitimately arrive late (vendor settlement lag). The
reporting layer had **no point-in-time (as-of) semantics** — it just re-read
the table, so the published number kept changing silently. SCD2-style versioning
existed for dims but not for *report snapshots*.

## Dashboard
"Late Arrivals / Restatement Risk" — daily late-row counts, max lateness, and
which reports are affected (via lineage).

## Business Impact
- Formal restatement of a published daily KPI.
- BU made a staffing decision on stale data.
- Finance added a restatement line item — the cost of untrusted numbers.

## Recommendation
1. **As-of reporting**: certified KPI views support `AS_OF_DATE` so a report is
   a frozen snapshot; late rows update the *next* report, never a published one.
2. **Cutoff policy**: define "reporting cutoff" per data product (e.g., rows
   arriving > 3 days late roll into the next period).
3. **DQ TIMELINESS rule** (Q105): > 2% late or > 3-day max → WARNING → alert.
4. **Reconciliation**: when a restatement is unavoidable, the stored procedure
   `sp_recompute_executive_kpis` recomputes the window idempotently and the
   version bump notifies consumers via lineage.
