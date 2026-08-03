-- ============================================================================
-- ZUMIQ — SQL LIBRARY · 03_advanced_aggregations.sql
-- ROLLUP, CUBE, GROUPING SETS, PIVOT, UNPIVOT, conditional aggregation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q031 · GROUP BY ROLLUP — GMV at (day × BU) → (day) → (grand total)
-- One pass produces subtotals for executive "drill-up" reporting.
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  bu_key,
  ROUND(SUM(amount_usd), 2) AS gmv_usd,
  GROUPING(txn_date) AS is_day_total,
  GROUPING(bu_key)    AS is_bu_total
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status='POSTED' AND is_reversal = FALSE
  AND txn_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-07'
GROUP BY ROLLUP (txn_date, bu_key)
ORDER BY txn_date, bu_key;

-- ----------------------------------------------------------------------------
-- Q032 · GROUP BY CUBE — GMV across every combination of (region, channel, type)
-- Complete slice-and-dice table for the planning team.
-- ----------------------------------------------------------------------------
SELECT
  region_key,
  channel_key,
  txn_type,
  ROUND(SUM(amount_usd), 2) AS gmv_usd,
  GROUPING(region_key)  AS region_all,
  GROUPING(channel_key) AS channel_all,
  GROUPING(txn_type)    AS type_all
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status='POSTED' AND is_reversal = FALSE
  AND txn_date = DATE '2026-07-14'
GROUP BY CUBE (region_key, channel_key, txn_type)
ORDER BY 1, 2, 3;

-- ----------------------------------------------------------------------------
-- Q033 · GROUPING SETS — Explicit subtotal control (BU total + day total)
-- More efficient than ROLLUP when you don't need the full hierarchy.
-- ----------------------------------------------------------------------------
SELECT
  bu_key,
  txn_date,
  ROUND(SUM(amount_usd), 2) AS gmv_usd
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status='POSTED' AND is_reversal = FALSE
  AND txn_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-03'
GROUP BY GROUPING SETS ((bu_key, txn_date), (bu_key), (txn_date), ())
ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q034 · Conditional aggregation with FILTER-like COUNTIF — Service SLAs
-- % of cases resolved within SLA by priority.
-- ----------------------------------------------------------------------------
SELECT
  priority,
  COUNT(*)                                        AS total_cases,
  COUNTIF(status = 'CLOSED')                      AS closed_cases,
  COUNTIF(sla_due_at < COALESCE(resolved_at, CURRENT_TIMESTAMP())) AS breached,
  ROUND(100 * SAFE_DIVIDE(
    COUNTIF(sla_due_at >= COALESCE(resolved_at, CURRENT_TIMESTAMP())),
    COUNT(*)), 2)                                 AS sla_attainment_pct
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q035 · PIVOT — Regions as columns (weekly GMV matrix for exec review)
-- PIVOT in BigQuery is implemented with explicit conditional aggregation.
-- ----------------------------------------------------------------------------
SELECT
  week_start,
  SUM(IF(region_name = 'North America', gmv, 0))  AS amer_gmv,
  SUM(IF(region_name = 'Europe', gmv, 0))         AS emea_gmv,
  SUM(IF(region_name = 'Asia Pacific', gmv, 0))   AS apac_gmv,
  SUM(gmv) AS total_gmv
FROM (
  SELECT
    d.week_start_date AS week_start,
    r.region_name,
    t.amount_usd AS gmv
  FROM `zumiq-prod.core_layer.fct_transactions` AS t
  JOIN `zumiq-prod.core_layer.dim_region` AS r        ON t.region_key = r.region_key
  JOIN `zumiq-prod.core_layer.dim_date` AS d          ON t.txn_date = d.date_key
  WHERE t.status='POSTED' AND t.is_reversal = FALSE
    AND t.txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q036 · UNPIVOT — Normalize wide cost columns into long-form for Tableau
-- ----------------------------------------------------------------------------
WITH cost_matrix AS (
  SELECT
    job_date,
    SUM(IF(layer = 'raw', cost_usd, 0))        AS raw_cost,
    SUM(IF(layer = 'staging', cost_usd, 0))    AS staging_cost,
    SUM(IF(layer = 'core', cost_usd, 0))       AS core_cost,
    SUM(IF(layer = 'analytics', cost_usd, 0))  AS analytics_cost
  FROM `zumiq-prod.cost.fct_query_cost`
  WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY 1
)
SELECT job_date, layer_name, cost_usd
FROM cost_matrix
UNPIVOT (cost_usd FOR layer_name IN (raw_cost, staging_cost, core_cost, analytics_cost))
ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q037 · FILTER inside HAVING — BUs with both high GMV and rising failures
-- ----------------------------------------------------------------------------
SELECT
  bu_key,
  ROUND(SUM(amount_usd),2) AS gmv_usd,
  COUNTIF(status = 'FAILED') AS failed_txns
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE '2026-06-01' AND DATE '2026-07-14'
GROUP BY 1
HAVING SUM(amount_usd) > 1000000
   AND COUNTIF(status = 'FAILED') > 500;

-- ----------------------------------------------------------------------------
-- Q038 · Matrix of event types × statuses (ops health heatmap)
-- ----------------------------------------------------------------------------
SELECT
  event_type,
  COUNTIF(status = 'SUCCESS') AS success,
  COUNTIF(status = 'FAILURE') AS failure,
  COUNTIF(status = 'TIMEOUT') AS timeout,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(status='SUCCESS'), COUNT(*)), 2) AS success_rate
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_date = DATE '2026-07-14'
GROUP BY 1
ORDER BY 5;

-- ----------------------------------------------------------------------------
-- Q039 · Weighted average with SUM — Blended margin per category
-- ----------------------------------------------------------------------------
SELECT
  p.product_category,
  SUM(t.amount_usd)                                   AS sales,
  ROUND(SUM(t.amount_usd * p.margin_pct), 2)          AS gross_profit,
  ROUND(SAFE_DIVIDE(
    SUM(t.amount_usd * p.margin_pct),
    SUM(t.amount_usd)), 4)                            AS weighted_margin
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key AND p.is_current = TRUE
WHERE t.status='POSTED' AND t.is_reversal = FALSE
  AND t.txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q040 · Bucketed aggregation with CASE — age of open support cases
-- ----------------------------------------------------------------------------
SELECT
  CASE
    WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, DAY) < 1  THEN '0-1 days'
    WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, DAY) < 3  THEN '1-3 days'
    WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, DAY) < 7  THEN '3-7 days'
    ELSE '7+ days'
  END AS age_bucket,
  COUNT(*) AS open_cases,
  ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct_of_open
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE status IN ('OPEN','IN_PROGRESS')
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q041 · HAVING with aggregation across two tables — high-churn regions
-- ----------------------------------------------------------------------------
SELECT
  r.region_name,
  COUNT(DISTINCT t.customer_key) AS active,
  COUNT(DISTINCT c.customer_key) AS total_customers,
  ROUND(100 * SAFE_DIVIDE(COUNT(DISTINCT c.customer_key) - COUNT(DISTINCT t.customer_key),
                          COUNT(DISTINCT c.customer_key)), 2) AS not_engaged_pct
FROM `zumiq-prod.core_layer.dim_region` AS r
LEFT JOIN `zumiq-prod.core_layer.dim_customer` AS c
  ON r.region_key = c.region_key AND c.is_current = TRUE
LEFT JOIN `zumiq-prod.core_layer.fct_transactions` AS t
  ON c.customer_key = t.customer_key
 AND t.status='POSTED' AND t.is_reversal = FALSE
 AND t.txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1
HAVING COUNT(DISTINCT c.customer_key) > 1000
ORDER BY 5 DESC;

-- ----------------------------------------------------------------------------
-- Q042 · ARRAY_AGG for lists — one row per BU with its top SKUs (JSON-friendly)
-- ----------------------------------------------------------------------------
SELECT
  bu_key,
  ARRAY_AGG(STRUCT(product_key, gmv_usd) ORDER BY gmv_usd DESC LIMIT 5) AS top_products
FROM (
  SELECT bu_key, product_key, SUM(amount_usd) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
    AND txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY 1, 2
)
GROUP BY 1;

-- ============================================================================
-- END 03_advanced_aggregations.sql  (queries Q031–Q042)
-- ============================================================================
