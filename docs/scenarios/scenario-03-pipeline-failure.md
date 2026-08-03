# Scenario 03 — Pipeline Failure Blocking the Overnight Batch

**Severity:** P1 · **Domain:** Reliability

## Problem
The 05:30 `FCT_TRANSACTIONS_LOAD` failed, blocking everything downstream. The
Finance close team waited for data that never arrived; the exec brief was
stale. Nobody was paged because there was no alert wiring.

## SQL Investigation
Step 1 — read the pipeline runs table for the failure:

```sql
SELECT run_id, pipeline_name, run_started_at, run_finished_at, status,
       rows_read, rows_written, error_message, retry_count
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE pipeline_name = 'FCT_TRANSACTIONS_LOAD'
  AND run_date = '2026-07-13'
ORDER BY run_started_at;
-- status = FAILED · error_message = 'partition mismatch in staging'
-- rows_read = 412,903 · rows_written = 0
```

Step 2 — what did the staging input look like? (schema/dedup context):

```sql
-- Did staging receive a malformed file / schema change?
SELECT COUNT(*) AS staging_rows,
       COUNTIF(txn_id IS NULL) AS null_txn_ids,
       COUNT(DISTINCT txn_id) AS distinct_ids
FROM `zumiq-prod.staging_layer.stg_transactions`
WHERE ingestion_date = '2026-07-13';
-- staging_rows = 412,903 but distinct_ids = 411,102 → 1,801 DUPLICATES
```

Step 3 — check dependency ordering (which jobs were supposed to run first):

```sql
SELECT run_id, pipeline_name, status, run_started_at
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE run_date = '2026-07-13'
ORDER BY run_started_at;
```

## Root Cause
The OMS sent a batch that included a **retry file** (same txn_ids as the 04:00
batch). The load's PK-check rejected the whole batch rather than deduping it.
The failure was silent: no alert existed, so the batch sat failed for 6 hours.

## Dashboard
"Pipeline Health" — success rate per pipeline, latest run status, failure
reason, and **SLA countdown** (how much time before this table breaks its SLA).

## Business Impact
- Finance close delayed ~6 hours.
- Exec brief stale on a board morning.
- Recovery cost: manual re-run + data verification (~3 engineer-hours).

## Recommendation
1. **Idempotent dedup in staging** (Q001 pattern): `ROW_NUMBER` by dedup_key
   before load → retry files become harmless.
2. **Alert wiring**: pipeline FAILED → HIGH alert → page platform on-call
   (30-min SLA). This is now the #1 rule in the runbook.
3. **Dependency DAG awareness**: `FCT_TRANSACTIONS_LOAD` waits on staging
   success (Composer sensor) — no partial source.
4. **Auto-retry**: first retry at +10 min; escalate to human at +30 min.
