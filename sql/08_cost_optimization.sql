-- ============================================================================
-- ZUMIQ - SQL LIBRARY · 08_cost_optimization.sql
-- Queries that find money left on the table. These are run by FinOps and
-- the platform team; each result maps to a concrete savings action.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q089 · Scans vs cost per GB - expensive low-value query patterns
-- ----------------------------------------------------------------------------
SELECT
  user_email,
  ROUND(SUM(cost_usd), 2)                      AS cost_usd,
  ROUND(SUM(bytes_processed) / 1e12, 3)        AS tb_processed,
  ROUND(SUM(cost_usd) / NULLIF(SUM(bytes_processed) / 1e12, 0), 4) AS cost_per_tb
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY 1
HAVING SUM(cost_usd) > 100
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q090 · Full-table scans that could have been partitioned/clustered
-- (table_reference has no partition filter → predicate pushdown misses)
-- ----------------------------------------------------------------------------
SELECT
  job_id,
  user_email,
  ROUND(bytes_processed / 1e9, 2) AS gb_processed,
  ROUND(cost_usd, 2)              AS cost_usd,
  table_reference
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  AND bytes_processed > 10e9          -- >10 GB in one query
ORDER BY 3 DESC
LIMIT 25;

-- ----------------------------------------------------------------------------
-- Q091 · Cache hit ratio - low cache-hit users are re-scanning shared tables
-- ----------------------------------------------------------------------------
SELECT
  user_email,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(cache_hit), COUNT(*)), 1) AS cache_hit_pct,
  ROUND(SUM(bytes_billed) / 1e12, 3) AS tb_billed
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1
HAVING COUNT(*) > 20
ORDER BY 2
LIMIT 15;

-- ----------------------------------------------------------------------------
-- Q092 · Redundant dashboard queries - same query text run repeatedly
-- Candidate for materialized views or Tableau data extracts.
-- ----------------------------------------------------------------------------
SELECT
  query_text,
  COUNT(*) AS executions,
  ROUND(SUM(cost_usd), 2) AS cost_usd
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1
HAVING COUNT(*) >= 5
ORDER BY 2 DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q093 · Slot utilization - peak vs idle (right-sizing the reservation)
-- ----------------------------------------------------------------------------
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour_slot,
  ROUND(MAX(slot_count) / 1000.0, 2) AS peak_thousand_slots,
  ROUND(AVG(slot_count) / 1000.0, 2) AS avg_thousand_slots
FROM `zumiq-prod.cost.slot_usage`
WHERE period_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q094 · Cost by job label (cost center) - budget compliance by team
-- ----------------------------------------------------------------------------
SELECT
  JSON_VALUE(query_labels, '$.cost_center') AS cost_center,
  JSON_VALUE(query_labels, '$.team')        AS team,
  ROUND(SUM(cost_usd), 2)                   AS cost_usd,
  ROUND(SUM(cost_usd) / SUM(SUM(cost_usd)) OVER (), 4) AS pct_of_total
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
GROUP BY 1, 2
ORDER BY 3 DESC;

-- ----------------------------------------------------------------------------
-- Q095 · Partition pruning check - queries scanning full months on a daily table
-- ----------------------------------------------------------------------------
SELECT
  job_id,
  ROUND(bytes_processed / 1e9, 2) AS gb_processed
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND table_reference LIKE '%fct_transactions%'
  AND bytes_processed > 200e9            -- >200GB: almost certainly no date filter
ORDER BY 2 DESC
LIMIT 10;

-- ============================================================================
-- END 08_cost_optimization.sql  (queries Q089–Q095)
-- ============================================================================
