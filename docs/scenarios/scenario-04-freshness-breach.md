# Scenario 04 - Data Freshness Breach Delaying Finance Close

**Severity:** P1 · **Domain:** Freshness / SLA

## Problem
Quarter-end close. Finance needed certified July data by 07:00 ET. At 09:15
the P&L still showed June numbers. The freshness SLA (T1 = 07:30 ET) was
breached, and nobody knew until Finance called.

## SQL Investigation
Step 1 - how stale is each T1 table right now?

```sql
SELECT c.table_id, c.sla_hours, c.data_owner,
       TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(p.run_finished_at), HOUR) AS hours_since_load,
       IF(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(p.run_finished_at), HOUR) > c.sla_hours,
          'BREACHED', 'OK') AS status
FROM `zumiq-prod.metadata.table_catalog` AS c
LEFT JOIN `zumiq-prod.ops.fct_pipeline_runs` AS p
  ON c.table_id = p.target_table AND p.status = 'SUCCESS'
WHERE c.criticality = 'T1'
GROUP BY 1, 2, 3
ORDER BY 4 DESC;
-- fct_transactions: 26h since load → BREACHED
```

Step 2 - trace which hop broke (raw → staging → core):

```sql
SELECT pipeline_name, status, run_started_at, run_finished_at, error_message
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE run_date = '2026-07-13'
  AND target_table IN ('raw_layer.erp_transactions_raw','core_layer.fct_transactions')
ORDER BY run_started_at;
-- ERP source file never landed at 02:00 (vendor side) → nothing upstream ran
```

## Root Cause
The SAP ERP **vendor failed to deliver** the daily extract (their incident,
not ours). No freshness alert existed to escalate the breach; the platform
only discovered it when Finance called.

## Dashboard
"Freshness SLA" - every T1 table's age vs SLA with red breach bands, plus an
escalation ladder status. This dashboard now sits on the platform team's wall.

## Business Impact
- Finance close delayed by a day → regulatory reporting risk.
- 6+ hours of cross-team firefighting.
- The incident landed in the board deck as a platform failure (reputational).

## Recommendation
1. **Freshness alert on every T1 table** (SQ-4 in scheduled_queries.sql):
   age > SLA → HIGH alert → page owner + escalation ladder.
2. **SLA countdown** on the pipeline dashboard (time-to-breach visible).
3. **Vendor SLA**: SAP extract guaranteed by 02:00 with an alert if missing;
   add a source-check job at 02:15.
4. **Backup feed**: manual recovery path documented + tested (reprocess
   procedure `sp_reprocess_partition`).
