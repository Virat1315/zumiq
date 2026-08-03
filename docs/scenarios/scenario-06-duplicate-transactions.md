# Scenario 06 — Duplicate Transactions Inflating Revenue

**Severity:** P1 · **Domain:** DQ / Uniqueness

## Problem
The finance close showed a suspicious revenue bump for one day. Audit found
thousands of transactions that appeared **twice** — revenue was inflated
~4.7%. If it had shipped, the quarter's guidance would have been wrong.

## SQL Investigation
Step 1 — find exact duplicates by the dedup key:

```sql
SELECT txn_id, txn_date, COUNT(*) AS occurrences
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = '2026-07-05'
GROUP BY 1, 2
HAVING COUNT(*) > 1;
-- 201,043 duplicated rows (every txn in the 04:00 batch repeated)
```

Step 2 — quantify the inflation:

```sql
WITH dup AS (
  SELECT txn_id, COUNT(*) AS c
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date = '2026-07-05'
  GROUP BY 1 HAVING COUNT(*) > 1
)
SELECT
  COUNT(*) AS dup_txns,
  ROUND(SUM(t.amount_usd), 2) AS inflated_amount
FROM dup
JOIN `zumiq-prod.core_layer.fct_transactions` AS t
  ON dup.txn_id = t.txn_id AND t.txn_date = '2026-07-05';
-- inflated_amount = $2.31M (4.7% of the day's GMV)
```

Step 3 — where did the second copy come from?

```sql
SELECT etl_batch_id, etl_loaded_at, COUNT(*) AS rows
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_id IN (SELECT txn_id FROM dup)
GROUP BY 1, 2 ORDER BY 2;
-- two batches both wrote the same txn_ids: batch 4120 and retry batch 4131
```

## Root Cause
The pipeline retried a "failed" load after a timeout, but the first attempt had
actually committed. The load was **not idempotent** — no dedup key guard before
insert. The DQ uniqueness rule on `txn_id` did not exist yet.

## Dashboard
"DQ Uniqueness" — per-table duplicate counts on the DQ dashboard; any table
with duplicate keys shows red. This incident motivated making uniqueness a
permanent ERROR-severity rule.

## Business Impact
- $2.31M revenue misstatement risk in the quarter close.
- Would have required a formal restatement if published (SOX exposure).

## Recommendation
1. **Uniqueness check on every fact** (DQ-UNI-001, ERROR severity, threshold 0):
   duplicates → FAIL → promotion blocked.
2. **Idempotent loads**: staging dedups by `dedup_key` via `ROW_NUMBER` (Q001)
   before the fact MERGE.
3. **Batch idempotency**: retry logic checks whether the batch already
   committed (write batch_id to a control table).
4. **Audit check** (Q103): nightly "fact total vs certified aggregate" diff —
   this is what would have caught it if the DQ rule had missed.
