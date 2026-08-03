-- ============================================================================
-- ZUMIQ - SQL LIBRARY · 04_json_struct_array.sql
-- BigQuery JSON, STRUCT, ARRAY functions - used for event payloads,
-- metadata, lineage, and ML feature tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q043 · JSON_VALUE - extract simple fields from operational event payloads
-- ----------------------------------------------------------------------------
SELECT
  event_id,
  JSON_VALUE(payload, '$.order_id')       AS order_id,
  JSON_VALUE(payload, '$.gateway')        AS gateway,
  JSON_VALUE(payload, '$.error_code')     AS error_code,
  CAST(JSON_VALUE(payload, '$.attempts') AS INT64) AS retry_attempts
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_type = 'PAYMENT_FAILED'
  AND event_date = DATE '2026-07-14'
LIMIT 50;

-- ----------------------------------------------------------------------------
-- Q044 · JSON_QUERY - extract nested arrays (items within an order payload)
-- ----------------------------------------------------------------------------
SELECT
  event_id,
  JSON_QUERY(payload, '$.line_items') AS line_items_json,
  ARRAY_LENGTH(JSON_QUERY_ARRAY(payload, '$.line_items')) AS line_item_count
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_type = 'ORDER_PLACED'
  AND event_date = DATE '2026-07-14'
LIMIT 50;

-- ----------------------------------------------------------------------------
-- Q045 · JSON_EXTRACT_ARRAY + UNNEST - flatten order line items into rows
-- ----------------------------------------------------------------------------
SELECT
  e.event_id,
  line_item.sku,
  line_item.qty,
  line_item.price
FROM `zumiq-prod.core_layer.fct_operations_events` AS e,
UNNEST(JSON_QUERY_ARRAY(e.payload, '$.line_items')) AS line_item
WHERE e.event_type = 'ORDER_PLACED'
  AND e.event_date = DATE '2026-07-14'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q046 · JSON_QUERY_ARRAY + STRING_AGG - comma list of failure reasons per BU
-- ----------------------------------------------------------------------------
WITH failures AS (
  SELECT
    bu_key,
    JSON_QUERY_ARRAY(payload, '$.error_list') AS errors
  FROM `zumiq-prod.core_layer.fct_operations_events`
  WHERE event_type = 'PAYMENT_FAILED'
    AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
)
SELECT
  bu_key,
  STRING_AGG(err, ' | ' ORDER BY err) AS distinct_errors
FROM failures, UNNEST(errors) AS err
GROUP BY 1;

-- ----------------------------------------------------------------------------
-- Q047 · STRUCT construction - build a nested customer profile row
-- ----------------------------------------------------------------------------
SELECT
  c.customer_id,
  STRUCT(
    c.customer_segment,
    c.tier,
    c.annual_revenue,
    STRUCT(c.country_code, c.region_key) AS geography
  ) AS profile
FROM `zumiq-prod.core_layer.dim_customer` AS c
WHERE c.is_current = TRUE
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q048 · STRUCT unpacking - unnest the JSON failure samples stored in DQ results
-- The DQ engine stores failing rows as JSON; this turns them back into rows
-- so the analyst can see exactly which records broke the check.
-- ----------------------------------------------------------------------------
SELECT
  dq.table_id,
  dq.run_date,
  failure_row.customer_id,
  failure_row.txn_id,
  failure_row.amount_usd
FROM `zumiq-prod.governance.dq_run_results` AS dq,
UNNEST(JSON_QUERY_ARRAY(dq.sample_of_failures)) AS failure_row
WHERE dq.status = 'FAIL'
  AND dq.table_id = 'zumiq-prod.core_layer.fct_transactions'
  AND dq.run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
LIMIT 50;

-- ----------------------------------------------------------------------------
-- Q049 · ARRAY_AGG with FILTER - pivot list of customer's last 3 products
-- ----------------------------------------------------------------------------
SELECT
  customer_key,
  ARRAY_AGG(product_key ORDER BY txn_timestamp DESC LIMIT 3) AS last_three_products
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status='POSTED' AND is_reversal = FALSE
GROUP BY 1;

-- ----------------------------------------------------------------------------
-- Q050 · UNNEST for value counts - distribution of event payload keys
-- ----------------------------------------------------------------------------
SELECT
  key_name,
  COUNT(*) AS occurrences
FROM `zumiq-prod.core_layer.fct_operations_events` AS e,
UNNEST(REGEXP_EXTRACT_ALL(TO_JSON_STRING(e.payload), r'"([a-zA-Z_]+)":')) AS key_name
WHERE e.event_date = DATE '2026-07-14'
GROUP BY 1
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q051 · JSON + window - per-SKU failure ratio in a 7-day window
-- ----------------------------------------------------------------------------
SELECT
  sku,
  SUM(failures) AS total_failures,
  COUNT(*) AS total_events,
  ROUND(100 * SAFE_DIVIDE(SUM(failures), COUNT(*)), 2) AS failure_rate
FROM (
  SELECT
    JSON_VALUE(payload, '$.sku') AS sku,
    IF(JSON_VALUE(payload, '$.ok') = 'true', 0, 1) AS failures
  FROM `zumiq-prod.core_layer.fct_operations_events`
  WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
)
GROUP BY 1
HAVING SUM(failures) > 0
ORDER BY 3 DESC;

-- ----------------------------------------------------------------------------
-- Q052 · JSON_TO_STRUCT / struct types - typed extraction of order payload
-- ----------------------------------------------------------------------------
SELECT
  event_id,
  CAST(JSON_QUERY(payload, '$.customer') AS STRUCT<
         id STRING,
         name STRING,
         email STRING
       >).id AS customer_id
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_type = 'ORDER_PLACED'
  AND event_date = DATE '2026-07-14'
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q053 · Metadata as JSON - lineage graph as nested edges (for graph tools)
-- ----------------------------------------------------------------------------
SELECT
  target_table,
  ARRAY_AGG(STRUCT(source_table, source_column, transformation)) AS incoming_edges
FROM `zumiq-prod.metadata.lineage_edges`
GROUP BY 1;

-- ----------------------------------------------------------------------------
-- Q054 · TO_JSON_STRING - build the alert payload for a DQ failure
-- ----------------------------------------------------------------------------
SELECT
  run_id,
  TO_JSON_STRING(STRUCT(
    table_id AS table,
    column_name,
    dimension,
    severity,
    observed_value,
    threshold AS expected_value,
    rows_failed
  )) AS alert_payload
FROM `zumiq-prod.governance.dq_run_results`
WHERE status = 'FAIL'
  AND run_date = CURRENT_DATE()
ORDER BY severity DESC;

-- ============================================================================
-- END 04_json_struct_array.sql  (queries Q043–Q054)
-- ============================================================================
