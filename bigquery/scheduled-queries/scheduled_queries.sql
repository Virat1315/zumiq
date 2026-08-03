-- ============================================================================
-- ZUMIQ - Enterprise Data Intelligence Platform
-- scheduled_queries.sql
-- Scheduled queries = the orchestration heartbeat. Each schedule has:
--   * a cron expression (US/Central)
--   * an owner
--   * a cost budget
--   * a destination (partitioned table or append)
-- Production implements these via BigQuery Data Transfer Service / Workflows;
-- the SQL below documents the schedule catalog and the alerting queries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SCHEDULE CATALOG (metadata.table_catalog refresh_schedule column)
-- ----------------------------------------------------------------------------
-- +---------------------------+---------------------------+-----------------+---------+
-- | Pipeline                  | Cron (CT timezone)         | Owner           | SLA    |
-- +---------------------------+---------------------------+-----------------+---------+
-- | DQ_ENGINE_DAILY           | 45 2 * * *   (02:45)      | Data Quality    | 06:00   |
-- | METADATA_SCAN             | 0 3 * * *    (03:00)      | Platform Eng    | 06:00   |
-- | SCD2_CUSTOMER             | 0 4 * * *    (04:00)      | Master Data     | 06:00   |
-- | SCD2_PRODUCT              | 15 4 * * *   (04:15)      | Master Data     | 06:00   |
-- | FCT_TRANSACTIONS_LOAD     | 30 5 * * *   (05:30)      | Data Engineering | 07:30   |
-- | FCT_OPS_EVENTS_STREAM     | continuous (Pub/Sub)      | Platform Eng    | realtime|
-- | EXEC_KPIS_RECOMPUTE       | 0 7 * * *    (07:00)      | Analytics Eng   | 08:30   |
-- | COST_GOVERNANCE_SUMMARY   | 15 6 * * *   (06:15)      | FinOps          | 09:00   |
-- | DQ_ANOMALY_ALERTS         | */15 * * * * (every 15m)  | Data Quality    | 15min   |
-- | PIPELINE_FRESHNESS_ALERTS | */30 * * * * (every 30m)  | Platform Eng    | 30min   |
-- +---------------------------+---------------------------+-----------------+---------+

-- ----------------------------------------------------------------------------
-- SQ 1: EXEC_KPIS_RECOMPUTE - recompute yesterday's executive KPIs
-- ----------------------------------------------------------------------------
CALL `zumiq-prod.analytics_layer.sp_recompute_executive_kpis`(
  DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY),
  CURRENT_DATE()
);

-- ----------------------------------------------------------------------------
-- SQ 2: DQ_ENGINE_DAILY - run DQ suite and write health scores
-- (Implemented in Python: python/dq_engine/dq_engine.py)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- SQ 3: COST_GOVERNANCE_SUMMARY - materialize daily cost summary + flag anomalies
-- ----------------------------------------------------------------------------
INSERT INTO `zumiq-prod.gold_layer.cost_daily_summary`
  (summary_date, total_cost_usd, total_queries, top_spender_user,
   top_spender_cost_usd, anomalous_users, tier_1_query_cost_usd)
SELECT
  CURRENT_DATE() - 1                                   AS summary_date,
  ROUND(SUM(cost_usd), 2)                              AS total_cost_usd,
  COUNT(*)                                             AS total_queries,
  (SELECT user_email FROM `zumiq-prod.cost.fct_query_cost`
    WHERE job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY user_email ORDER BY SUM(cost_usd) DESC LIMIT 1) AS top_spender_user,
  (SELECT ROUND(SUM(cost_usd),2) FROM `zumiq-prod.cost.fct_query_cost`
    WHERE job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY user_email ORDER BY SUM(cost_usd) DESC LIMIT 1) AS top_spender_cost_usd,
  TO_JSON_STRING((
    SELECT ARRAY_AGG(STRUCT(user_email, cost_usd))
    FROM (
      SELECT user_email, ROUND(SUM(cost_usd),2) AS cost_usd
      FROM `zumiq-prod.cost.fct_query_cost`
      WHERE job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY user_email
      HAVING SUM(cost_usd) > 1000        -- anomaly threshold: >$1k/day/user
    )
  ))                                                 AS anomalous_users,
  ROUND(SUM(IF(table_reference LIKE '%core_layer%' OR
               table_reference LIKE '%analytics_layer%', cost_usd, 0)), 2) AS tier_1_query_cost_usd
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- ----------------------------------------------------------------------------
-- SQ 4: PIPELINE_FRESHNESS_ALERTS - detect SLA breaches (every 30 min)
-- Inserts into ops.alert_history when a table is older than its SLA.
-- ----------------------------------------------------------------------------
INSERT INTO `zumiq-prod.ops.alert_history`
  (alert_id, alert_type, severity, subject, message, triggered_at,
   triggered_date, status, source_table)
SELECT
  GENERATE_UUID()                                  AS alert_id,
  'FRESHNESS'                                      AS alert_type,
  'HIGH'                                           AS severity,
  CONCAT('Freshness breach: ', t.table_name)       AS subject,
  CONCAT('Table ', t.table_name, ' last loaded ',
         TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_loaded_at, HOUR),
         ' hours ago. SLA is ', CAST(t.sla_hours AS STRING), ' hours.') AS message,
  CURRENT_TIMESTAMP()                              AS triggered_at,
  CURRENT_DATE()                                   AS triggered_date,
  'OPEN'                                           AS status,
  t.table_id                                       AS source_table
FROM `zumiq-prod.metadata.table_catalog` AS t
WHERE t.last_loaded_at IS NOT NULL
  AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_loaded_at, HOUR) > t.sla_hours
  AND t.criticality = 'T1';

-- ----------------------------------------------------------------------------
-- SQ 5: DQ_ANOMALY_ALERTS - raise an alert when any DQ dimension drops >X
-- ----------------------------------------------------------------------------
INSERT INTO `zumiq-prod.ops.alert_history`
  (alert_id, alert_type, severity, subject, message, triggered_at,
   triggered_date, status, source_table, run_id)
SELECT
  GENERATE_UUID(), 'DQ', 'HIGH',
  CONCAT('DQ score drop on ', data_product_name),
  CONCAT('DQ score ', CAST(dq_score AS STRING),
         ' is below the 90.0 threshold on ', CAST(score_date AS STRING)),
  CURRENT_TIMESTAMP(), CURRENT_DATE(), 'OPEN', table_id, NULL
FROM `zumiq-prod.governance.dq_health_daily`
WHERE score_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  AND dq_score < 90
  AND data_product_name != 'ENTERPRISE';

-- ----------------------------------------------------------------------------
-- SQ 6: METADATA_SCAN - refresh catalog row counts & sizes (INFORMATION_SCHEMA)
-- ----------------------------------------------------------------------------
MERGE `zumiq-prod.metadata.table_catalog` AS t
USING (
  SELECT
    CONCAT(table_catalog, '.', table_schema, '.', table_name) AS table_id,
    table_schema                                       AS dataset_id,
    table_name,
    ROW_COUNT                                          AS row_count,
    SIZE_BYTES                                         AS size_bytes
  FROM `zumiq-prod`.INFORMATION_SCHEMA.TABLES
) AS s
ON t.table_id = s.table_id
WHEN MATCHED THEN UPDATE SET
  t.row_count  = s.row_count,
  t.size_bytes = s.size_bytes,
  t.updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT
  (table_id, dataset_id, table_name, table_type, owning_team, data_owner,
   classification, criticality, is_certified, version, created_at, updated_at)
  VALUES (s.table_id, s.dataset_id, s.table_name, 'TABLE', 'UNASSIGNED',
          'UNASSIGNED', 'INTERNAL', 'T3', FALSE, 'v1.0.0',
          CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());

-- ============================================================================
-- END scheduled_queries.sql
-- ============================================================================
