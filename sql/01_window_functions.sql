-- ============================================================================
-- ZUMIQ — SQL LIBRARY · 01_window_functions.sql
-- Production SQL for a global enterprise platform. Every query has an
-- explanation comment. Run against zumiq-prod datasets (synthetic data).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q001 · ROW_NUMBER — Deduplicate transactions loaded twice by the OMS
-- Problem: the payments batch loaded 201,043 transactions twice.
-- Answer: the latest etl_loaded_at row wins; keep one row per (txn_id).
-- ----------------------------------------------------------------------------
SELECT txn_id, txn_date, amount_usd, etl_loaded_at
FROM (
  SELECT
    txn_id,
    txn_date,
    amount_usd,
    etl_loaded_at,
    ROW_NUMBER() OVER (PARTITION BY txn_id ORDER BY etl_loaded_at DESC) AS rn
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date = DATE '2026-07-14'
)
WHERE rn = 1;

-- ----------------------------------------------------------------------------
-- Q002 · ROW_NUMBER — Identify the true "first transaction" per customer
-- Used by the Growth team to measure first-buy latency.
-- ----------------------------------------------------------------------------
WITH first_txn AS (
  SELECT
    customer_key,
    txn_id,
    txn_date,
    ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY txn_timestamp ASC) AS rn
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status = 'POSTED'
)
SELECT customer_key, txn_id, txn_date
FROM first_txn
WHERE rn = 1;

-- ----------------------------------------------------------------------------
-- Q003 · RANK vs DENSE_RANK — Daily GMV rank per region (shared ranks matter)
-- RANK: ties share a rank and skip (1,2,2,4). DENSE_RANK: ties share, no skip.
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  region_key,
  gmv_usd,
  RANK()       OVER (PARTITION BY txn_date ORDER BY gmv_usd DESC) AS rank_standard,
  DENSE_RANK() OVER (PARTITION BY txn_date ORDER BY gmv_usd DESC) AS rank_dense
FROM (
  SELECT txn_date, region_key, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1, 2
);

-- ----------------------------------------------------------------------------
-- Q004 · LAG — Day-over-day GMV change (the executive "momentum" column)
-- ----------------------------------------------------------------------------
WITH daily AS (
  SELECT
    txn_date,
    ROUND(SUM(amount_usd), 2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
SELECT
  txn_date,
  gmv_usd,
  LAG(gmv_usd, 1) OVER (ORDER BY txn_date)            AS prev_day_gmv,
  ROUND(gmv_usd - LAG(gmv_usd, 1) OVER (ORDER BY txn_date), 2)  AS change_vs_prev,
  ROUND(SAFE_DIVIDE(gmv_usd - LAG(gmv_usd, 1) OVER (ORDER BY txn_date),
                    LAG(gmv_usd, 1) OVER (ORDER BY txn_date)), 4) AS pct_change
FROM daily
ORDER BY txn_date;

-- ----------------------------------------------------------------------------
-- Q005 · LAG with 7-day offset — Week-over-week comparison (smooths weekday effect)
-- ----------------------------------------------------------------------------
WITH daily AS (
  SELECT txn_date, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
SELECT
  txn_date,
  gmv_usd,
  LAG(gmv_usd, 7) OVER (ORDER BY txn_date) AS gmv_same_weekday_last_week,
  ROUND(SAFE_DIVIDE(gmv_usd - LAG(gmv_usd, 7) OVER (ORDER BY txn_date),
                    LAG(gmv_usd, 7) OVER (ORDER BY txn_date)), 4) AS wow_change
FROM daily
ORDER BY txn_date;

-- ----------------------------------------------------------------------------
-- Q006 · LEAD — Forecast pipeline: next refresh time vs SLA (freshness watch)
-- ----------------------------------------------------------------------------
SELECT
  pipeline_name,
  run_finished_at,
  LEAD(run_finished_at) OVER (PARTITION BY pipeline_name ORDER BY run_finished_at)
    AS next_run_finished,
  TIMESTAMP_DIFF(
    LEAD(run_finished_at) OVER (PARTITION BY pipeline_name ORDER BY run_finished_at),
    run_finished_at, MINUTE) AS run_interval_min
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE pipeline_name = 'FCT_TRANSACTIONS_LOAD'
ORDER BY run_finished_at DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q007 · NTILE — Decile customers by lifetime value (segmentation for CX)
-- ----------------------------------------------------------------------------
SELECT
  customer_key,
  lifetime_value_usd,
  NTILE(10) OVER (ORDER BY lifetime_value_usd DESC) AS ltv_decile
FROM (
  SELECT customer_key, ROUND(SUM(amount_usd),2) AS lifetime_value_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
);

-- ----------------------------------------------------------------------------
-- Q008 · FIRST_VALUE / LAST_VALUE — Session analysis:
-- First page vs last event in a user session (product behavior team)
-- ----------------------------------------------------------------------------
SELECT
  session_id,
  FIRST_VALUE(event_type) OVER (PARTITION BY session_id ORDER BY event_timestamp
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS first_event,
  LAST_VALUE(event_type)  OVER (PARTITION BY session_id ORDER BY event_timestamp
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_event,
  COUNT(*) OVER (PARTITION BY session_id) AS events_in_session
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_type IN ('LOGIN','ORDER_PLACED','PAYMENT_FAILED','API_CALL')
  AND event_date = DATE '2026-07-14'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q009 · Running total (cumulative) — YTD GMV with ROWS UNBOUNDED PRECEDING
-- ----------------------------------------------------------------------------
WITH daily AS (
  SELECT txn_date, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
SELECT
  txn_date,
  gmv_usd,
  ROUND(SUM(gmv_usd) OVER (ORDER BY txn_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS ytd_gmv
FROM daily
ORDER BY txn_date;

-- ----------------------------------------------------------------------------
-- Q010 · Moving average (7-day) — smooths daily volatility for trend reporting
-- ----------------------------------------------------------------------------
WITH daily AS (
  SELECT txn_date, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
SELECT
  txn_date,
  gmv_usd,
  ROUND(AVG(gmv_usd) OVER (ORDER BY txn_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),2)
    AS gmv_7day_avg
FROM daily
ORDER BY txn_date;

-- ----------------------------------------------------------------------------
-- Q011 · SUM with PARTITION — % of BU total (contribution analysis)
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  bu_key,
  gmv_usd,
  ROUND(SAFE_DIVIDE(gmv_usd, SUM(gmv_usd) OVER (PARTITION BY txn_date)), 4)
    AS share_of_total_gmv
FROM (
  SELECT txn_date, bu_key, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1, 2
)
ORDER BY txn_date, gmv_usd DESC;

-- ----------------------------------------------------------------------------
-- Q012 · Nested window — moving rank of BU share over time (competitive view)
-- ----------------------------------------------------------------------------
WITH bu_daily AS (
  SELECT txn_date, bu_key, ROUND(SUM(amount_usd),2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1, 2
)
SELECT
  txn_date,
  bu_key,
  gmv_usd,
  RANK() OVER (PARTITION BY txn_date ORDER BY gmv_usd DESC) AS bu_rank_today,
  ROUND(AVG(gmv_usd) OVER (PARTITION BY bu_key ORDER BY txn_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),2) AS bu_7day_avg
FROM bu_daily
ORDER BY txn_date, bu_rank_today;

-- ----------------------------------------------------------------------------
-- Q013 · QUALIFY — Keep only top-3 products by GMV per BU/day (feeds dashboard)
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  bu_key,
  product_key,
  ROUND(SUM(amount_usd),2) AS gmv_usd
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status='POSTED' AND is_reversal = FALSE
GROUP BY 1, 2, 3
QUALIFY ROW_NUMBER() OVER (PARTITION BY txn_date, bu_key ORDER BY SUM(amount_usd) DESC) <= 3;

-- ----------------------------------------------------------------------------
-- Q014 · NTH_VALUE — 2nd highest order value per day (risk: outlier check)
-- ----------------------------------------------------------------------------
WITH daily_orders AS (
  SELECT txn_date, txn_id, amount_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
)
SELECT DISTINCT
  txn_date,
  NTH_VALUE(txn_id, 2) OVER (PARTITION BY txn_date ORDER BY amount_usd DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_highest_txn,
  NTH_VALUE(amount_usd, 2) OVER (PARTITION BY txn_date ORDER BY amount_usd DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_highest_amount
FROM daily_orders
ORDER BY txn_date;

-- ----------------------------------------------------------------------------
-- Q015 · Percentile via PERCENT_RANK / CUME_DIST — "is this order an outlier?"
-- ----------------------------------------------------------------------------
SELECT
  txn_id,
  amount_usd,
  ROUND(PERCENT_RANK() OVER (ORDER BY amount_usd), 4) AS pct_rank,
  ROUND(CUME_DIST()  OVER (ORDER BY amount_usd), 4)    AS cum_dist
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = DATE '2026-07-14' AND status='POSTED'
ORDER BY amount_usd DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q016 · Session windowing with SUM IF — customer journey funnel per day
-- ----------------------------------------------------------------------------
SELECT
  event_date,
  COUNTIF(event_type = 'LOGIN')           AS logins,
  COUNTIF(event_type = 'ORDER_PLACED')    AS orders,
  COUNTIF(event_type = 'PAYMENT_FAILED')  AS payment_failures,
  ROUND(SAFE_DIVIDE(COUNTIF(event_type='ORDER_PLACED'),
                    COUNTIF(event_type='LOGIN')), 4) AS login_to_order_conv
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-14'
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q017 · LAG + LEAD combo — SLA breach detection on support cases
-- Reopened cases: closed then reopened within 7 days (signal of poor FCR).
-- ----------------------------------------------------------------------------
SELECT
  case_number,
  customer_key,
  closed_at,
  LEAD(opened_at) OVER (PARTITION BY customer_key ORDER BY opened_at) AS next_case_opened,
  TIMESTAMP_DIFF(
    LEAD(opened_at) OVER (PARTITION BY customer_key ORDER BY opened_at),
    closed_at, DAY) AS days_to_next_case
FROM `zumiq-prod.core_layer.fct_support_cases`
QUALIFY days_to_next_case BETWEEN 1 AND 7;

-- ----------------------------------------------------------------------------
-- Q018 · Difference from median (IQR-style) — anomaly flagging for GMV
-- ----------------------------------------------------------------------------
WITH stats AS (
  SELECT
    PERCENTILE_CONT(amount_usd, 0.5) OVER () AS median_amt,
    PERCENTILE_CONT(amount_usd, 0.75) OVER () AS q3,
    PERCENTILE_CONT(amount_usd, 0.25) OVER () AS q1
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date = DATE '2026-07-14' AND status='POSTED'
  LIMIT 1
)
SELECT
  t.txn_id,
  t.amount_usd,
  ROUND(s.q3 + 1.5 * (s.q3 - s.q1), 2) AS iqr_upper_fence
FROM `zumiq-prod.core_layer.fct_transactions` AS t, stats AS s
WHERE t.txn_date = DATE '2026-07-14' AND t.status='POSTED'
  AND t.amount_usd > (s.q3 + 1.5 * (s.q3 - s.q1));

-- ============================================================================
-- END 01_window_functions.sql  (18 queries: Q001–Q018)
-- ============================================================================
