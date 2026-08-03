-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- performance/query_optimization.sql
-- Performance & cost governance SQL that the platform runs on itself:
--   · INFORMATION_SCHEMA telemetry (slots, jobs, partitioning)
--   · Partition / cluster effectiveness checks
--   · Materialized view refresh health
--   · Query performance regression detection
-- These power the "Dashboard Performance" and "Cost Governance" dashboards
-- and the dry-run CI gate.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Top queries by slot-seconds (which jobs actually burn capacity?)
-- ----------------------------------------------------------------------------
SELECT
  job_id,
  user_email,
  job_type,
  ROUND(total_slot_ms / 1000 / 60, 1)     AS slot_minutes,
  ROUND(IFNULL(bytes_processed, 0) / 1e9, 2) AS gb_processed,
  ROUND(IFNULL(bytes_billed, 0) / 1e12, 3)   AS tb_billed,
  query
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND state = 'DONE'
  AND job_type = 'QUERY'
ORDER BY total_slot_ms DESC
LIMIT 25;

-- ----------------------------------------------------------------------------
-- 2. Queries that scanned the most (candidates for partition/cluster fixes)
-- ----------------------------------------------------------------------------
SELECT
  job_id,
  user_email,
  ROUND(IFNULL(bytes_processed, 0) / 1e9, 2) AS gb_processed,
  ROUND(IFNULL(bytes_billed, 0) / 1e12, 3)   AS tb_billed,
  query
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND state = 'DONE'
ORDER BY bytes_processed DESC
LIMIT 25;

-- ----------------------------------------------------------------------------
-- 3. Cache efficiency (low cache-hit users re-scan shared tables)
-- ----------------------------------------------------------------------------
SELECT
  user_email,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(cache_hit), COUNT(*)), 1) AS cache_hit_pct,
  COUNT(*) AS jobs
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY' AND state = 'DONE'
GROUP BY 1
HAVING COUNT(*) > 10
ORDER BY 2;

-- ----------------------------------------------------------------------------
-- 4. Slot utilization by hour (right-sizing flat-rate reservations)
-- ----------------------------------------------------------------------------
SELECT
  TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
  ROUND(MAX(slot_count), 1) AS peak_slots,
  ROUND(AVG(slot_count), 1) AS avg_slots
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.RESERVATION_USAGE
WHERE period_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- 5. Materialized view health (last refresh + staleness)
-- ----------------------------------------------------------------------------
SELECT
  table_name,
  last_refresh_time,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_refresh_time, MINUTE) AS minutes_since_refresh,
  total_rows
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.MATERIALIZED_VIEWS
ORDER BY 3;

-- ----------------------------------------------------------------------------
-- 6. Table size / partition effectiveness snapshot for the catalog
-- ----------------------------------------------------------------------------
SELECT
  table_schema,
  table_name,
  ROUND(IFNULL(size_bytes, 0) / 1e9, 2) AS size_gb,
  row_count
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.TABLES
WHERE table_schema IN ('raw_layer','staging_layer','core_layer','gold_layer',
                       'analytics_layer','governance','ops','cost')
ORDER BY size_bytes DESC;

-- ----------------------------------------------------------------------------
-- 7. Dry-run CI gate (executed by the pipeline; exits nonzero if > 5 TB)
-- A wrapper runs `bq query --dry_run` and blocks the PR if bytes exceed the
-- budget. The SQL below is what the gate evaluates after the fact.
-- ----------------------------------------------------------------------------
SELECT
  SUM(IFNULL(bytes_processed, 0)) / 1e12 AS estimated_tb,
  IF(SUM(IFNULL(bytes_processed, 0)) / 1e12 > 5.0, 'BLOCK', 'ALLOW') AS ci_decision
FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE job_id = 'job-running-in-ci';

-- ============================================================================
-- END performance/query_optimization.sql
-- ============================================================================
