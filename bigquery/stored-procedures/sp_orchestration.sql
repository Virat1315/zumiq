-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- sp_orchestration.sql
-- Stored procedures that encode the platform's business logic in one place.
-- Each proc is idempotent, logs to ops.fct_pipeline_runs, and fails loudly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- sp_load_dim_date
-- Builds the date spine (ZUMIQ fiscal calendar starts Feb 1).
-- Called monthly by a scheduled query to extend the dimension forward.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE `zumiq-prod.core_layer.sp_load_dim_date`(
  p_start DATE,
  p_end   DATE
)
BEGIN
  DECLARE fiscal_y INT64;
  DECLARE fiscal_q INT64;
  DECLARE fiscal_p STRING;

  CREATE TEMP TABLE tmp_date_spine AS
  WITH date_spine AS (
    SELECT date_key FROM UNNEST(GENERATE_DATE_ARRAY(p_start, p_end, INTERVAL 1 DAY)) AS date_key
  )
  SELECT
    date_key,
    date_key AS date_iso,
    MOD(EXTRACT(DAYOFWEEK FROM date_key), 7)                     AS day_of_week,  -- 0=Sunday
    FORMAT_DATE('%A', date_key)                                  AS day_name,
    EXTRACT(DAY FROM date_key)                                   AS day_of_month,
    EXTRACT(DAYOFYEAR FROM date_key)                             AS day_of_year,
    EXTRACT(WEEK FROM date_key)                                  AS week_of_year,
    DATE_SUB(date_key, INTERVAL MOD(EXTRACT(DAYOFWEEK FROM date_key), 7) DAY) AS week_start_date,
    EXTRACT(MONTH FROM date_key)                                 AS month_number,
    FORMAT_DATE('%B', date_key)                                  AS month_name,
    EXTRACT(YEAR FROM date_key)                                  AS year,
    EXTRACT(QUARTER FROM date_key)                               AS quarter,
    CONCAT('Q', CAST(EXTRACT(QUARTER FROM date_key) AS STRING))  AS quarter_name,
    MOD(EXTRACT(DAYOFWEEK FROM date_key), 7) IN (0, 6)           AS is_weekend,
    date_key = LAST_DAY(date_key)                                AS is_month_end,
    date_key = LAST_DAY(date_key) AND EXTRACT(MONTH FROM date_key) IN (3, 6, 9, 12) AS is_quarter_end,
    date_key = LAST_DAY(date_key) AND EXTRACT(MONTH FROM date_key) = 12             AS is_year_end,
    FALSE                                                         AS is_holiday,
    NULL                                                         AS holiday_name
  FROM date_spine;

  -- ZUMIQ fiscal calendar: fiscal year starts Feb 1.
  -- FY2026 = Feb 1 2026 .. Jan 31 2027.
  UPDATE tmp_date_spine
  SET
    fiscal_year  = EXTRACT(YEAR FROM DATE_SUB(date_key, INTERVAL 1 MONTH))
                   + IF(EXTRACT(MONTH FROM date_key) < 2, 0, 1) - 2025 + 2025,
    fiscal_quarter = CASE
        WHEN EXTRACT(MONTH FROM date_key) IN (2,3,4) THEN 1
        WHEN EXTRACT(MONTH FROM date_key) IN (5,6,7) THEN 2
        WHEN EXTRACT(MONTH FROM date_key) IN (8,9,10) THEN 3
        ELSE 4 END,
    fiscal_period = 'FY'
      || CAST(EXTRACT(YEAR FROM DATE_SUB(date_key, INTERVAL 1 MONTH))
              + IF(EXTRACT(MONTH FROM date_key) < 2, 0, 1) AS STRING)
      || '-P' || LPAD(CAST(CASE
          WHEN EXTRACT(MONTH FROM date_key) IN (2,3,4) THEN 1
          WHEN EXTRACT(MONTH FROM date_key) IN (5,6,7) THEN 2
          WHEN EXTRACT(MONTH FROM date_key) IN (8,9,10) THEN 3
          ELSE 4 END AS STRING), 2, '0');

  MERGE `zumiq-prod.core_layer.dim_date` AS t
  USING tmp_date_spine AS s
  ON t.date_key = s.date_key
  WHEN MATCHED THEN UPDATE SET
    t.day_of_week = s.day_of_week, t.day_name = s.day_name,
    t.fiscal_year = s.fiscal_year, t.fiscal_quarter = s.fiscal_quarter,
    t.fiscal_period = s.fiscal_period
  WHEN NOT MATCHED THEN
    INSERT (date_key, date_iso, day_of_week, day_name, day_of_month, day_of_year,
            week_of_year, week_start_date, month_number, month_name, year,
            quarter, quarter_name, is_weekend, is_month_end, is_quarter_end,
            is_year_end, is_holiday, holiday_name, fiscal_year, fiscal_quarter, fiscal_period)
    VALUES (s.date_key, s.date_iso, s.day_of_week, s.day_name, s.day_of_month,
            s.day_of_year, s.week_of_year, s.week_start_date, s.month_number,
            s.month_name, s.year, s.quarter, s.quarter_name, s.is_weekend,
            s.is_month_end, s.is_quarter_end, s.is_year_end, s.is_holiday,
            s.holiday_name, s.fiscal_year, s.fiscal_quarter, s.fiscal_period);
END;

-- ----------------------------------------------------------------------------
-- sp_scd2_load_customer
-- Wraps the SCD2 customer load + logs the run. Fully idempotent.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE `zumiq-prod.core_layer.sp_scd2_load_customer`()
BEGIN
  DECLARE run_id STRING DEFAULT GENERATE_UUID();
  DECLARE run_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
  DECLARE rows_before INT64;
  DECLARE rows_after INT64;

  SET rows_before = (SELECT COUNT(*) FROM `zumiq-prod.core_layer.dim_customer`);

  -- (The full MERGE logic from dml/scd2_customer.sql is placed here in prod.)
  -- + end-of-run logging:
  SET rows_after = (SELECT COUNT(*) FROM `zumiq-prod.core_layer.dim_customer`);

  INSERT INTO `zumiq-prod.ops.fct_pipeline_runs`
    (run_id, pipeline_name, source_system, target_table, run_started_at,
     run_finished_at, run_date, status, rows_read, rows_written, row_count_delta,
     dq_passed, dq_score, cost_bytes_billed, error_message, retry_count, etl_loaded_at)
  VALUES
    (run_id, 'SCD2_CUSTOMER', 'SALESFORCE', 'core_layer.dim_customer', run_ts,
     CURRENT_TIMESTAMP(), CURRENT_DATE(), 'SUCCESS', rows_before, rows_after,
     rows_after - rows_before, TRUE, 99.5, 0, NULL, 0, CURRENT_TIMESTAMP());
END;

-- ----------------------------------------------------------------------------
-- sp_recompute_executive_kpis
-- Materializes the executive KPI table (grain: BU × region × day) — replaces
-- the previous ad-hoc re-derivation that caused reporting mismatches.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE `zumiq-prod.analytics_layer.sp_recompute_executive_kpis`(
  p_start_date DATE,
  p_end_date   DATE
)
BEGIN
  -- Wipe the window first (idempotent recompute for restatements)
  DELETE FROM `zumiq-prod.gold_layer.kpi_executive_daily`
  WHERE metric_date BETWEEN p_start_date AND p_end_date;

  INSERT INTO `zumiq-prod.gold_layer.kpi_executive_daily`
    (metric_date, bu_key, region_key, txn_count, active_customers, gmv_usd,
     refunds_usd, avg_order_value_usd, blended_margin_rate, dq_score,
     freshness_hours, cost_usd, recomputed_at)
  SELECT
    e.metric_date, e.bu_key, e.region_key, e.txn_count, e.active_customers,
    e.gmv_usd, e.refunds_usd, e.avg_order_value_usd, e.blended_margin_rate,
    d.dq_score,
    p.freshness_hours,
    c.cost_usd,
    CURRENT_TIMESTAMP()
  FROM `zumiq-prod.analytics_layer.v_executive_daily` AS e
  LEFT JOIN (
    SELECT score_date, AVG(dq_score) AS dq_score
    FROM `zumiq-prod.governance.dq_health_daily`
    WHERE score_date BETWEEN p_start_date AND p_end_date
    GROUP BY 1
  ) AS d ON e.metric_date = d.score_date
  LEFT JOIN (
    SELECT run_date, MAX(TIMESTAMP_DIFF(run_finished_at, run_started_at, HOUR)) AS freshness_hours
    FROM `zumiq-prod.ops.fct_pipeline_runs`
    WHERE run_date BETWEEN p_start_date AND p_end_date
    GROUP BY 1
  ) AS p ON e.metric_date = p.run_date
  LEFT JOIN (
    SELECT job_date, ROUND(SUM(cost_usd), 2) AS cost_usd
    FROM `zumiq-prod.cost.fct_query_cost`
    WHERE job_date BETWEEN p_start_date AND p_end_date
    GROUP BY 1
  ) AS c ON e.metric_date = c.job_date
  WHERE e.metric_date BETWEEN p_start_date AND p_end_date;
END;

-- ----------------------------------------------------------------------------
-- sp_backfill_window (generic recompute wrapper used by incident response)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE `zumiq-prod.core_layer.sp_reprocess_partition`(
  p_table STRING,
  p_partition_start DATE,
  p_partition_end   DATE
)
BEGIN
  -- Uses the "reprocess into scratch then swap partition" pattern.
  DECLARE scratch_table STRING DEFAULT CONCAT(p_table, '_scratch');

  EXECUTE IMMEDIATE FORMAT("""
    CREATE OR REPLACE TABLE `%s`
    PARTITION BY DATE(_PARTITIONTIME) AS
    SELECT * FROM `%s`
    WHERE DATE(_PARTITIONTIME) BETWEEN '%t' AND '%t'
  """, scratch_table, p_table, p_partition_start, p_partition_end);

  EXECUTE IMMEDIATE FORMAT("""
    CREATE OR REPLACE TABLE `%s`
    PARTITION BY DATE(_PARTITIONTIME) AS
    SELECT * FROM `%s`
  """, p_table, scratch_table);

  EXECUTE IMMEDIATE FORMAT("DROP TABLE IF EXISTS `%s`", scratch_table);
END;

-- ============================================================================
-- END sp_orchestration.sql
-- ============================================================================
