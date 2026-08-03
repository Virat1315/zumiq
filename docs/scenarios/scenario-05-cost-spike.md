# Scenario 05 - Cloud Cost Spike: $14k/day → $41k/day

**Severity:** P1 · **Domain:** Cost

## Problem
The monthly cloud invoice jumped ~3× in a week. BigQuery spend went from
~$14k/day to ~$41k/day with nobody approving new workloads. Finance wanted
answers and a cap.

## SQL Investigation
Step 1 - find the spender(s) driving the spike:

```sql
SELECT user_email, ROUND(SUM(cost_usd), 2) AS cost_usd,
       ROUND(SUM(bytes_processed) / 1e12, 3) AS tb_processed,
       COUNT(*) AS queries
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
-- analyst@zumiq.io: $27,100 in 7 days → 54 TB
```

Step 2 - what exactly is this user running? (query text / tables):

```sql
SELECT job_id, ROUND(bytes_processed / 1e9, 2) AS gb, ROUND(cost_usd,2) AS cost,
       table_reference, query_labels
FROM `zumiq-prod.cost.fct_query_cost`
WHERE user_email = 'analyst@zumiq.io'
  AND job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY 3 DESC LIMIT 10;
-- One query scanning the ENTIRE fct_transactions (all partitions) every 30 min
-- via a Tableau extract refresh with NO date filter.
```

Step 3 - confirm it's wasteful (cache / partitioning):

```sql
SELECT COUNTIF(cache_hit) AS cached, COUNT(*) AS total,
       ROUND(100 * SAFE_DIVIDE(COUNTIF(cache_hit), COUNT(*)),1) AS cache_pct
FROM `zumiq-prod.cost.fct_query_cost`
WHERE user_email = 'analyst@zumiq.io'
  AND job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
```

## Root Cause
A Tableau data extract was configured with a **full-table refresh every 30
minutes** and no partition filter. Every refresh scanned ~2 years of
`fct_transactions` (~200 TB/month). On-demand pricing multiplied by volume.
Classic "small config, huge bill" - invisible because there was no cost alert.

## Dashboard
"Cost Governance" - daily spend by user/team/dataset with anomaly threshold
($1k/day/user → red). Budget bar per cost center.

## Business Impact
- $27k in avoidable spend in one week.
- Budget pressure → random cuts to legitimate workloads (misaligned saving).
- Finance lost confidence in cloud cost control.

## Recommendation
1. **Cost anomaly alert** (SQ-3): any user > $1k/day → MEDIUM alert; > $5k/day
   → HIGH (page FinOps).
2. **Partition discipline**: extract must filter on `txn_date` (date range
   rolling 90 days) → 30-min refresh now scans 90 partitions, not 730.
3. **Budget + labels**: per-team budget via labels; enforcement + reporting.
4. **Dry-run gate in CI**: any PR whose query scans > 5 TB is blocked.
5. **Result**: total platform query spend cut 43% within two months, and the
   re-offending query pattern is now auto-detected (Q090/Q092).
