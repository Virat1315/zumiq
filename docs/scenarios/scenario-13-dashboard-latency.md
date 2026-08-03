# Scenario 13 - Dashboard Latency from Full-Table Scans

**Severity:** P2 · **Domain:** Performance

## Problem
The executive dashboard took 40–60 seconds to load in the morning, and the
"30-day GMV" tile sometimes timed out. Executives stopped using it - the most
important dashboard in the company was abandoned for performance.

## SQL Investigation
Step 1 - profile the dashboard's queries in cost telemetry:

```sql
SELECT
  ROUND(SUM(cost_usd), 2) AS cost,
  ROUND(SUM(bytes_processed) / 1e12, 2) AS tb,
  ROUND(AVG(total_slot_ms) / 1000, 1) AS avg_sec,
  COUNT(*) AS runs
FROM `zumiq-prod.cost.fct_query_cost`
WHERE query_id = 'exec_dash'
  AND job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1;
-- Each refresh scanned ~600 GB (whole fct_transactions, all partitions)
```

Step 2 - prove the partition filter is missing:

```sql
SELECT job_id, ROUND(bytes_processed / 1e9, 2) AS gb,
       ROUND(cost_usd, 2) AS cost, table_reference
FROM `zumiq-prod.cost.fct_query_cost`
WHERE query_id = 'exec_dash'
  AND job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);
-- table_reference shows fct_transactions with NO date predicate
```

Step 3 - what would the same query cost with partitioning? (dry-run)

```bash
# Partition-pruned: filter last 30 days → ~30 partitions → ~50 GB → <5s
bq query --dry_run --use_legacy_sql=false \
"SELECT SUM(amount_usd) FROM \`zumiq-prod.core_layer.fct_transactions\`
 WHERE status='POSTED' AND txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)"
```

## Root Cause
The dashboard was built pre-layering against the *raw* table without any
date filter, and was never migrated to the certified semantic view. BigQuery
on-demand pricing + full scans = slow AND expensive.

## Dashboard
"Dashboard Performance" - per-dashboard scan size, query cost, and p95
latency; red flags for scans > 100 GB.

## Business Impact
- Executive adoption fell: the dashboard was "too slow to be useful."
- ~$4k/week of wasted scans on one dashboard.

## Recommendation
1. **Rewrite on certified views** (`analytics_layer.v_executive_daily`) with
   rolling-30-day filter → scans drop ~12×.
2. **Materialized view** (`mv_daily_gmv_by_bu`) serves the hot GMV tile → KB
   scan, sub-second.
3. **Tableau extracts** refreshed every 30 min (delta) instead of live full
   scans → bounded latency + cost.
4. **Performance budget in CI**: dashboard builds fail if the model scans
   > 100 GB. Result: p95 < 3s.
