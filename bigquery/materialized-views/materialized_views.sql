-- ============================================================================
-- ZUMIQ - Enterprise Data Intelligence Platform
-- materialized_views.sql
-- BigQuery materialized views: the engine auto-increments these as the base
-- tables change, so "fresh but cheap" pre-aggregates exist with NO manual
-- refresh. This is the single biggest win for dashboard latency + cost.
--
-- RULES:
--   * Only use MV for high-frequency, high-filter-count aggregations.
--   * Base tables must be partitioned/clustered for the MV to be effective.
--   * MVs cannot be queried in INFORMATION_SCHEMA until created; monitor
--     with MAX_STALENESS option below.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MV 1: Daily GMV by BU (reduces executive dashboard scan from ~100GB to KB)
-- Base: fct_transactions (~1.2M rows/day, partitioned by txn_date)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE MATERIALIZED VIEW `zumiq-prod.analytics_layer.mv_daily_gmv_by_bu`
PARTITION BY metric_date
CLUSTER BY bu_key
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 60,      -- auto-increment every hour
  max_staleness = INTERVAL 3 HOUR,    -- dashboard SLA: accept ≤3h staleness
  description = 'Auto-refreshed daily GMV by business unit for the executive dashboard.'
) AS
SELECT
  txn_date                                            AS metric_date,
  bu_key,
  COUNT(*)                                            AS txn_count,
  COUNT(DISTINCT customer_key)                        AS active_customers,
  ROUND(SUM(amount_usd), 2)                           AS gmv_usd
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status = 'POSTED' AND is_reversal = FALSE
GROUP BY 1, 2;

-- ----------------------------------------------------------------------------
-- MV 2: Hourly operational event counts by type/system (ops dashboard)
-- Base: fct_operations_events (partitioned by event_date)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE MATERIALIZED VIEW `zumiq-prod.analytics_layer.mv_hourly_ops_events`
PARTITION BY event_date
CLUSTER BY source_system
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 15,
  description = 'Hourly event volume by type & system for ops monitoring.'
) AS
SELECT
  event_date,
  TIMESTAMP_TRUNC(event_timestamp, HOUR)              AS event_hour,
  source_system,
  event_type,
  COUNT(*)                                            AS event_count,
  ROUND(AVG(latency_ms), 0)                           AS avg_latency_ms,
  COUNTIF(status = 'FAILURE')                         AS failures
FROM `zumiq-prod.core_layer.fct_operations_events`
GROUP BY 1, 2, 3, 4;

-- ----------------------------------------------------------------------------
-- MV 3: Daily cost by user (cost governance dashboard)
-- Base: cost.fct_query_cost
-- ----------------------------------------------------------------------------
CREATE OR REPLACE MATERIALIZED VIEW `zumiq-prod.analytics_layer.mv_daily_cost_by_user`
PARTITION BY job_date
CLUSTER BY user_email
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 1440,
  description = 'Daily BigQuery spend by user - powers cost anomaly alerting.'
) AS
SELECT
  job_date,
  user_email,
  dataset_id,
  COUNT(*)                                AS query_count,
  ROUND(SUM(bytes_processed) / 1e12, 3)   AS terabytes_processed,
  ROUND(SUM(cost_usd), 2)                 AS cost_usd
FROM `zumiq-prod.cost.fct_query_cost`
GROUP BY 1, 2, 3;

-- ----------------------------------------------------------------------------
-- MV 4: DQ health trend (governance dashboard)
-- Base: governance.dq_health_daily
-- ----------------------------------------------------------------------------
CREATE OR REPLACE MATERIALIZED VIEW `zumiq-prod.analytics_layer.mv_dq_trend`
PARTITION BY score_date
OPTIONS (
  enable_refresh = TRUE,
  refresh_interval_minutes = 720,
  description = 'Enterprise DQ score trend by data product.'
) AS
SELECT
  score_date,
  data_product_name,
  AVG(dq_score) AS dq_score,
  SUM(checks_failed) AS checks_failed
FROM `zumiq-prod.governance.dq_health_daily`
GROUP BY 1, 2;

-- ============================================================================
-- NOTE: To observe auto-refresh behavior use INFORMATION_SCHEMA:
-- SELECT * FROM `zumiq-prod`.`region-us`.INFORMATION_SCHEMA.MATERIALIZED_VIEWS
--   WHERE table_name = 'mv_daily_gmv_by_bu';
-- ============================================================================
