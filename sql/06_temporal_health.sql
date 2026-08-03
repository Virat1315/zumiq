-- ============================================================================
-- ZUMIQ - SQL LIBRARY · 06_temporal_health.sql
-- Freshness, SLAs, pipeline health, DQ observability, alerting.
-- These are the "platform health" queries that ops and governance run daily.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q067 · Freshness report - hours since last successful load per certified table
-- ----------------------------------------------------------------------------
SELECT
  c.table_id,
  c.sla_hours,
  c.data_owner,
  MAX(p.run_finished_at) AS last_success,
  ROUND(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(p.run_finished_at), MINUTE) / 60.0, 2)
    AS hours_since_load,
  CASE
    WHEN MAX(p.run_finished_at) IS NULL THEN 'NEVER_LOADED'
    WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(p.run_finished_at), MINUTE) > c.sla_hours * 60
         THEN 'BREACHED'
    ELSE 'OK'
  END AS freshness_status
FROM `zumiq-prod.metadata.table_catalog` AS c
LEFT JOIN `zumiq-prod.ops.fct_pipeline_runs` AS p
  ON c.table_id = p.target_table AND p.status = 'SUCCESS'
WHERE c.criticality = 'T1'
GROUP BY 1, 2, 3
ORDER BY 5 DESC;

-- ----------------------------------------------------------------------------
-- Q068 · Pipeline success rate - trailing 30 days by pipeline
-- ----------------------------------------------------------------------------
SELECT
  pipeline_name,
  COUNT(*)                                  AS runs,
  COUNTIF(status = 'SUCCESS')               AS successes,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(status='SUCCESS'), COUNT(*)), 2) AS success_rate,
  ROUND(AVG(dq_score), 2)                   AS avg_dq_score,
  ROUND(AVG(TIMESTAMP_DIFF(run_finished_at, run_started_at, MINUTE)), 1) AS avg_duration_min
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
HAVING COUNT(*) > 0
ORDER BY 3;

-- ----------------------------------------------------------------------------
-- Q069 · Volume drift detection - today's row count vs trailing-28-day average
-- Uses a window function to compute the baseline without a second scan.
-- ----------------------------------------------------------------------------
WITH daily_rows AS (
  SELECT
    target_table,
    run_date,
    rows_written,
    AVG(rows_written) OVER (PARTITION BY target_table ORDER BY run_date
      ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING) AS avg_prior_rows
  FROM `zumiq-prod.ops.fct_pipeline_runs`
  WHERE status = 'SUCCESS'
)
SELECT
  target_table,
  run_date,
  rows_written,
  ROUND(avg_prior_rows, 0) AS trailing_avg,
  ROUND(SAFE_DIVIDE(rows_written, avg_prior_rows), 3) AS volume_ratio,
  CASE
    WHEN avg_prior_rows IS NULL OR rows_written = 0 THEN 'WARN'
    WHEN rows_written < 0.5 * avg_prior_rows THEN 'DROP_ALERT'
    WHEN rows_written > 2.0 * avg_prior_rows THEN 'SURGE_ALERT'
    ELSE 'NORMAL'
  END AS drift_flag
FROM daily_rows
WHERE run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY 5 DESC;

-- ----------------------------------------------------------------------------
-- Q070 · Late-arriving data - transactions that hit the fact table N days late
-- (causes revenue restatements; monitored daily)
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  MAX(DATE(etl_loaded_at)) AS latest_load_date,
  MAX(DATE_DIFF(DATE(etl_loaded_at), txn_date, DAY)) AS max_late_days
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND CURRENT_DATE()
GROUP BY 1
HAVING max_late_days > 3
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q071 · DQ score trend - daily health by data product with 7-day slope
-- ----------------------------------------------------------------------------
SELECT
  score_date,
  data_product_name,
  dq_score,
  dq_score - LAG(dq_score, 7) OVER (PARTITION BY data_product_name ORDER BY score_date)
    AS dq_change_7d
FROM `zumiq-prod.governance.dq_health_daily`
WHERE score_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q072 · DQ failures by dimension & severity - trailing 7 days
-- ----------------------------------------------------------------------------
SELECT
  dimension,
  severity,
  COUNT(*) AS failed_checks,
  SUM(rows_failed) AS rows_impacted,
  ROUND(SUM(rows_failed) / NULLIF(SUM(rows_checked),0), 4) AS failure_rate
FROM `zumiq-prod.governance.dq_run_results`
WHERE status = 'FAIL'
  AND run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1, 2
ORDER BY 3 DESC;

-- ----------------------------------------------------------------------------
-- Q073 · Schema drift detection - columns in today's source not in catalog
-- ----------------------------------------------------------------------------
SELECT
  i.table_name,
  i.column_name,
  i.data_type
FROM `zumiq-prod`.INFORMATION_SCHEMA.COLUMNS AS i
LEFT JOIN `zumiq-prod.metadata.column_catalog` AS cc
  ON CONCAT(i.table_schema, '.', i.table_name) = cc.table_id
 AND i.column_name = cc.column_name
WHERE i.table_schema IN ('staging_layer', 'raw_layer')
  AND cc.column_name IS NULL;

-- ----------------------------------------------------------------------------
-- Q074 · Alert queue - open alerts by type, age, and severity
-- ----------------------------------------------------------------------------
SELECT
  alert_type,
  severity,
  status,
  COUNT(*) AS open_alerts,
  ROUND(AVG(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), triggered_at, HOUR)), 1) AS avg_age_hours,
  STRING_AGG(subject, ' | ' ORDER BY triggered_at DESC LIMIT 5) AS samples
FROM `zumiq-prod.ops.alert_history`
WHERE status IN ('OPEN', 'ACKNOWLEDGED')
GROUP BY 1, 2, 3
ORDER BY 2;

-- ----------------------------------------------------------------------------
-- Q075 · MTTR - mean time to resolve DQ/pipeline alerts by type
-- ----------------------------------------------------------------------------
SELECT
  alert_type,
  ROUND(AVG(TIMESTAMP_DIFF(resolved_at, triggered_at, HOUR)), 1) AS avg_mttr_hours,
  COUNTIF(status = 'RESOLVED') AS resolved_count
FROM `zumiq-prod.ops.alert_history`
WHERE status = 'RESOLVED'
  AND resolved_at IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q076 · Data freshness of DQ runs vs SLA - is the watchdog itself healthy?
-- ----------------------------------------------------------------------------
SELECT
  run_date,
  COUNT(*) AS runs,
  COUNTIF(TIMESTAMP_DIFF(run_timestamp, TIMESTAMP_TRUNC(run_timestamp, DAY), MINUTE) <= 45 * 60)
    AS runs_within_45min_of_midnight,
  ROUND(100 * SAFE_DIVIDE(
    COUNTIF(TIMESTAMP_DIFF(run_timestamp, TIMESTAMP_TRUNC(run_timestamp, DAY), MINUTE) <= 45 * 60),
    COUNT(*)), 1) AS on_time_pct
FROM `zumiq-prod.governance.dq_run_results`
WHERE run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1;

-- ----------------------------------------------------------------------------
-- Q077 · Composite platform health index (single number for the exec screen)
-- Blend of pipeline success, DQ score, freshness compliance, cost budget.
-- ----------------------------------------------------------------------------
SELECT
  p.run_date AS metric_date,
  ROUND(100 * COUNTIF(p.status='SUCCESS') / COUNT(*), 2)                              AS pipeline_score,
  ROUND(AVG(d.dq_score), 2)                                                           AS dq_score,
  ROUND(100 * AVG(IF(f.freshness_ok, 1, 0)), 2)                                       AS freshness_score,
  ROUND(0.35 * (100 * COUNTIF(p.status='SUCCESS') / COUNT(*))
      + 0.35 * AVG(d.dq_score)
      + 0.30 * (100 * AVG(IF(f.freshness_ok, 1, 0))), 2)                               AS health_index
FROM `zumiq-prod.ops.fct_pipeline_runs` AS p
LEFT JOIN `zumiq-prod.governance.dq_health_daily` AS d ON p.run_date = d.score_date AND d.data_product_name = 'ENTERPRISE'
LEFT JOIN (
  SELECT
    run_date,
    TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(run_finished_at), HOUR) <= 24 AS freshness_ok
  FROM `zumiq-prod.ops.fct_pipeline_runs`
  GROUP BY 1
) AS f ON p.run_date = f.run_date
WHERE p.run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY 1
ORDER BY 1;

-- ============================================================================
-- END 06_temporal_health.sql  (queries Q067–Q077)
-- ============================================================================
