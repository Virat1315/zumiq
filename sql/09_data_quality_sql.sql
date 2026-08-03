-- ============================================================================
-- ZUMIQ — SQL LIBRARY · 09_data_quality_sql.sql
-- The SQL rule patterns used by the Data Quality Engine.
-- Each pattern maps to a governance DQ dimension and is parameterized by the
-- engine (see python/dq_engine). These are shown here so reviewers can see
-- exactly how the DQ engine detects each defect class.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q096 · Completeness — NULL rate per critical column
-- ----------------------------------------------------------------------------
SELECT
  ROUND(100 * SAFE_DIVIDE(COUNTIF(customer_key IS NULL), COUNT(*)), 4) AS null_pct,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(txn_timestamp IS NULL), COUNT(*)), 4) AS txn_ts_null_pct
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- ----------------------------------------------------------------------------
-- Q097 · Uniqueness — duplicate txn_id detection (PK violation)
-- ----------------------------------------------------------------------------
SELECT
  txn_id,
  COUNT(*) AS dup_count
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY 1
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- Q098 · Validity — values outside allowed domain (txn_type, currency)
-- ----------------------------------------------------------------------------
SELECT
  COUNTIF(txn_type NOT IN ('DEPOSIT','WITHDRAWAL','PAYMENT','TRANSFER','FEE','REFUND','CHARGEBACK')) AS invalid_txn_types,
  COUNTIF(LENGTH(currency_code) != 3) AS invalid_currencies,
  COUNTIF(amount_usd < 0 AND txn_type NOT IN ('REFUND','CHARGEBACK')) AS negative_non_refund
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- ----------------------------------------------------------------------------
-- Q099 · Referential integrity — orphan facts (FK violation)
-- ----------------------------------------------------------------------------
SELECT
  'dim_customer' AS fk_name,
  COUNT(*) AS orphan_rows
FROM `zumiq-prod.core_layer.fct_transactions` AS t
LEFT JOIN `zumiq-prod.core_layer.dim_customer` AS c
  ON t.customer_key = c.customer_key
WHERE c.customer_key IS NULL
  AND t.txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- ----------------------------------------------------------------------------
-- Q100 · Freshness — max age of the newest partition vs expected
-- ----------------------------------------------------------------------------
SELECT
  MAX(txn_date) AS newest_partition,
  DATE_DIFF(CURRENT_DATE(), MAX(txn_date), DAY) AS days_stale,
  IF(DATE_DIFF(CURRENT_DATE(), MAX(txn_date), DAY) > 1, 'STALE', 'OK') AS status
FROM `zumiq-prod.core_layer.fct_transactions`;

-- ----------------------------------------------------------------------------
-- Q101 · Volume — day-over-day row count anomaly
-- ----------------------------------------------------------------------------
WITH vol AS (
  SELECT txn_date, COUNT(*) AS row_count
  FROM `zumiq-prod.core_layer.fct_transactions`
  GROUP BY 1
)
SELECT
  txn_date,
  row_count,
  LAG(row_count) OVER (ORDER BY txn_date) AS prior_day,
  ROUND(SAFE_DIVIDE(row_count - LAG(row_count) OVER (ORDER BY txn_date),
                    LAG(row_count) OVER (ORDER BY txn_date)), 4) AS pct_change
FROM vol
ORDER BY 1 DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Q102 · Outliers — transactions beyond 5 standard deviations
-- ----------------------------------------------------------------------------
WITH stats AS (
  SELECT
    AVG(amount_usd) AS avg_amt,
    STDDEV(amount_usd) AS std_amt
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
)
SELECT
  t.txn_id,
  t.amount_usd,
  s.avg_amt,
  ROUND(ABS(t.amount_usd - s.avg_amt) / NULLIF(s.std_amt, 0), 2) AS z_score
FROM `zumiq-prod.core_layer.fct_transactions` AS t, stats AS s
WHERE t.txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  AND t.amount_usd > s.avg_amt + 5 * s.std_amt;

-- ----------------------------------------------------------------------------
-- Q103 · Consistency — cross-table reconciliation (fact vs aggregate table)
-- ----------------------------------------------------------------------------
SELECT
  (SELECT COALESCE(SUM(amount_usd), 0)
   FROM `zumiq-prod.core_layer.fct_transactions`
   WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
     AND status = 'POSTED' AND is_reversal = FALSE)                  AS fact_total,
  (SELECT COALESCE(SUM(gmv_usd), 0)
   FROM `zumiq-prod.gold_layer.kpi_executive_daily`
   WHERE metric_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))     AS kpi_total;

-- ----------------------------------------------------------------------------
-- Q104 · Null spike — column with >2× historical null rate
-- ----------------------------------------------------------------------------
WITH daily_nulls AS (
  SELECT
    txn_date,
    ROUND(100 * SAFE_DIVIDE(COUNTIF(customer_key IS NULL), COUNT(*)), 4) AS null_rate,
    ROUND(AVG(100 * SAFE_DIVIDE(COUNTIF(customer_key IS NULL), COUNT(*)))
          OVER (ORDER BY txn_date ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING), 4) AS trailing_avg
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY)
  GROUP BY 1
)
SELECT txn_date, null_rate, trailing_avg,
       IF(null_rate > 2 * trailing_avg AND trailing_avg > 0, 'NULL_SPIKE', 'OK') AS flag
FROM daily_nulls
ORDER BY 1 DESC;

-- ----------------------------------------------------------------------------
-- Q105 · Late-arriving rows (timeliness) — posted after business cutoff
-- ----------------------------------------------------------------------------
SELECT
  COUNTIF(TIMESTAMP(etl_loaded_at) > TIMESTAMP_ADD(TIMESTAMP(txn_date), INTERVAL 12 HOUR))
    AS late_rows,
  COUNT(*) AS total_rows
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- ============================================================================
-- END 09_data_quality_sql.sql  (queries Q096–Q105)
-- ============================================================================
-- TOTAL SQL LIBRARY: Q001–Q105 = 105 production queries across 9 files.
-- ============================================================================
