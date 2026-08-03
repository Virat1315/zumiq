# Scenario 22 - Orphan FK Surge After Master Data Cleanup

**Severity:** P2 · **Domain:** DQ / Integrity

## Problem
After a master-data cleanup script merged duplicate customers in the CRM, the
transactions fact table suddenly had thousands of rows pointing at customers
that no longer exist. Downstream customer views silently dropped those rows.

## SQL Investigation
Step 1 - count orphans (FK violations):

```sql
SELECT
  COUNT(*) AS orphan_txns,
  ROUND(SUM(t.amount_usd), 2) AS orphan_amount
FROM `zumiq-prod.core_layer.fct_transactions` AS t
LEFT JOIN `zumiq-prod.core_layer.dim_customer` AS c
  ON t.customer_key = c.customer_key
WHERE t.txn_date >= DATE '2026-07-01'
  AND c.customer_key IS NULL;
-- 4,302 orphans ($610k) appearing right after the cleanup job ran
```

Step 2 - when did orphans appear? (correlate with pipeline runs)

```sql
SELECT t.txn_date,
       COUNTIF(c.customer_key IS NULL) AS orphans
FROM `zumiq-prod.core_layer.fct_transactions` AS t
LEFT JOIN `zumiq-prod.core_layer.dim_customer` AS c
  ON t.customer_key = c.customer_key
WHERE t.txn_date >= DATE '2026-06-20'
GROUP BY 1 ORDER BY 1;
-- Orphans start on Jul 08 - same day 'MASTER_DATA_MERGE' pipeline ran
```

Step 3 - confirm the merge changed surrogate keys:

```sql
SELECT run_id, pipeline_name, error_message, rows_written
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE pipeline_name = 'MASTER_DATA_MERGE' AND run_date = '2026-07-08';
-- Merge script deleted old customer rows and reassigned customer_id,
-- but did NOT remap customer_key in fct_transactions.
```

## Root Cause
The CRM merge changed natural customer IDs and re-surrogated keys, but the
cleanup script updated `dim_customer` only - it forgot to remap
`fct_transactions.customer_key` (and `fct_support_cases`). This is the exact
reason the DQ engine treats INTEGRITY as an ERROR dimension.

## Dashboard
"Integrity / Orphans" - orphan counts by FK per table with the merge-job
overlay; red when orphans > 0 on a T1 fact.

## Business Impact
- $610k of transactions invisible in customer views (misleading LTV/revenue).
- Customer merge follow-up cost: remap + reload + verify.

## Recommendation
1. **INTEGRITY rule on every FK** (DQ-INT): orphan count > 0 on a fact =
   ERROR → promotion blocked.
2. **Merge job contract**: master-data merges must execute a pre-written
   remap procedure (surrogate mapping table) and run DQ before/after.
3. **Pipeline guard**: any job that deletes dim rows triggers an automatic
   FK integrity sweep + alert.
4. **Audit**: the merge is now a certified procedure with `fct_pipeline_runs`
   logging and a post-run integrity check - the "big red button" is now a
   controlled, tested process.
