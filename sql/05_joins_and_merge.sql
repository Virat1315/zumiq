-- ============================================================================
-- ZUMIQ - SQL LIBRARY · 05_joins_and_merge.sql
-- Join optimization, temporal/as-of joins, MERGE patterns, semi/anti joins,
-- fan-out control. Enterprise join discipline: always join dims on their
-- surrogate key + is_current guard, never fan out facts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q055 · Star-join discipline - fact × 4 dimensions with is_current guards
-- ----------------------------------------------------------------------------
SELECT
  t.txn_id,
  c.customer_segment,
  p.product_category,
  r.region_name,
  bu.bu_code,
  t.amount_usd
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_customer`    AS c  ON t.customer_key = c.customer_key AND c.is_current = TRUE
JOIN `zumiq-prod.core_layer.dim_product`     AS p  ON t.product_key  = p.product_key  AND p.is_current = TRUE
JOIN `zumiq-prod.core_layer.dim_region`      AS r  ON t.region_key   = r.region_key
JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu ON t.bu_key      = bu.bu_key
WHERE t.txn_date = DATE '2026-07-14'
  AND t.status = 'POSTED'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q056 · LEFT JOIN with NULL probe - DQ coverage gap (columns never checked)
-- ----------------------------------------------------------------------------
SELECT
  cc.table_id,
  cc.column_name,
  cc.sensitivity
FROM `zumiq-prod.metadata.column_catalog` AS cc
LEFT JOIN (
  SELECT DISTINCT table_id, column_name
  FROM `zumiq-prod.governance.dq_rules`
  WHERE is_active = TRUE
) AS r
  ON r.table_id = cc.table_id AND r.column_name = cc.column_name
WHERE r.column_name IS NULL
  AND cc.sensitivity IN ('PII', 'PCI', 'PHI', 'RESTRICTED');

-- ----------------------------------------------------------------------------
-- Q057 · Temporal as-of join (SCD2 point-in-time) - margin at time of sale
-- Correct restatement: join transaction to the product version valid THEN.
-- ----------------------------------------------------------------------------
SELECT
  t.txn_id,
  t.txn_date,
  p.product_category,
  p.list_price AS list_price_as_of_sale,
  p.margin_pct AS margin_as_of_sale,
  t.amount_usd
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key
 AND t.txn_timestamp >= p.valid_from
 AND (p.valid_to IS NULL OR t.txn_timestamp < p.valid_to)
WHERE t.txn_date BETWEEN DATE '2026-05-01' AND DATE '2026-07-14'
  AND t.status = 'POSTED'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q058 · MERGE (upsert) - sync glossary terms into a dashboard reference table
-- ----------------------------------------------------------------------------
MERGE `zumiq-prod.gold_layer.glossary_export` AS tgt
USING `zumiq-prod.metadata.business_glossary` AS src
  ON tgt.term_name = src.term_name AND src.status = 'CERTIFIED'
WHEN MATCHED AND tgt.version < src.version THEN
  UPDATE SET tgt.definition = src.definition, tgt.version = src.version,
             tgt.approved_at = src.approved_at, tgt.updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (term_name, definition, owner_team, version, approved_at, updated_at)
  VALUES (src.term_name, src.definition, src.owner_team, src.version,
          src.approved_at, CURRENT_TIMESTAMP());

-- ----------------------------------------------------------------------------
-- Q059 · SELF-JOIN - employees and their managers (flat hierarchy export)
-- ----------------------------------------------------------------------------
SELECT
  e.full_name  AS employee,
  e.department,
  m.full_name  AS manager,
  m.department AS manager_department
FROM `zumiq-prod.core_layer.dim_employee` AS e
LEFT JOIN `zumiq-prod.core_layer.dim_employee` AS m
  ON e.manager_employee_key = m.employee_key
WHERE e.employment_status = 'ACTIVE'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q060 · SELF-JOIN for session pairs - consecutive transactions same customer
-- (fraud-adjacent pattern: rapid-fire identical amounts, risk team)
-- ----------------------------------------------------------------------------
SELECT
  a.customer_key,
  a.txn_id AS first_txn,
  b.txn_id AS second_txn,
  TIMESTAMP_DIFF(b.txn_timestamp, a.txn_timestamp, MINUTE) AS gap_minutes,
  a.amount_usd
FROM `zumiq-prod.core_layer.fct_transactions` AS a
JOIN `zumiq-prod.core_layer.fct_transactions` AS b
  ON a.customer_key = b.customer_key
 AND a.txn_timestamp < b.txn_timestamp
 AND b.txn_timestamp <= TIMESTAMP_ADD(a.txn_timestamp, INTERVAL 5 MINUTE)
 AND a.amount_usd = b.amount_usd
WHERE a.txn_date = DATE '2026-07-14'
LIMIT 100;

-- ----------------------------------------------------------------------------
-- Q061 · LEFT ANTI JOIN (explicit) - tables in catalog with no pipeline owner
-- ----------------------------------------------------------------------------
SELECT c.table_id
FROM `zumiq-prod.metadata.table_catalog` AS c
LEFT JOIN `zumiq-prod.ops.fct_pipeline_runs` AS p
  ON c.table_id = p.target_table
WHERE p.target_table IS NULL
  AND c.criticality = 'T1';

-- ----------------------------------------------------------------------------
-- Q062 · FULL OUTER JOIN - reconciliation between two systems (ERP vs OMS)
-- The money-match check that Finance runs every morning.
-- ----------------------------------------------------------------------------
WITH erp AS (
  SELECT txn_date, ROUND(SUM(amount_usd),2) AS erp_amount
  FROM `zumiq-prod.raw_layer.erp_transactions_raw`
  GROUP BY 1
),
oms AS (
  SELECT txn_date, ROUND(SUM(amount_usd),2) AS oms_amount
  FROM `zumiq-prod.raw_layer.oms_orders_raw`
  GROUP BY 1
)
SELECT
  COALESCE(e.txn_date, o.txn_date)          AS txn_date,
  e.erp_amount,
  o.oms_amount,
  ROUND(IFNULL(e.erp_amount,0) - IFNULL(o.oms_amount,0), 2) AS variance,
  ABS(IFNULL(e.erp_amount,0) - IFNULL(o.oms_amount,0)) > 0.01 AS mismatched
FROM erp AS e
FULL OUTER JOIN oms AS o ON e.txn_date = o.txn_date
WHERE e.txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
   OR o.txn_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q063 · Join with aggregated derived table - active customers and their quota
-- ----------------------------------------------------------------------------
SELECT
  c.tier,
  COUNT(DISTINCT c.customer_key)                                    AS customers,
  ROUND(COUNT(DISTINCT c.customer_key) * 1000.0, 0)                 AS notional_sales_quota
FROM `zumiq-prod.core_layer.dim_customer` AS c
JOIN (
  SELECT DISTINCT customer_key
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE txn_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
    AND status = 'POSTED'
) AS act ON act.customer_key = c.customer_key
WHERE c.is_current = TRUE
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q064 · Cross join to date spine - fill missing days (gap filling)
-- Every BU must have a row for every calendar day, even with no sales.
-- ----------------------------------------------------------------------------
SELECT
  d.date_key,
  bu.bu_key,
  COALESCE(s.gmv, 0) AS gmv_usd
FROM `zumiq-prod.core_layer.dim_date` AS d
CROSS JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu
LEFT JOIN (
  SELECT txn_date, bu_key, SUM(amount_usd) AS gmv
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1, 2
) AS s ON s.txn_date = d.date_key AND s.bu_key = bu.bu_key
WHERE d.date_key BETWEEN DATE '2026-07-01' AND DATE '2026-07-14'
ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q065 · Join fan-out guard - verify a fact never joins to 2+ dimension rows
-- (the "one current dim" integrity check that prevents GMV inflation)
-- ----------------------------------------------------------------------------
SELECT
  p.product_id,
  COUNTIF(p.is_current) AS current_versions,
  COUNT(*) AS total_versions
FROM `zumiq-prod.core_layer.dim_product` AS p
GROUP BY 1
HAVING current_versions != 1;

-- ----------------------------------------------------------------------------
-- Q066 · CROSS JOIN with SPLIT - expand CSV lists in metadata (tags)
-- ----------------------------------------------------------------------------
SELECT
  c.table_id,
  tag
FROM `zumiq-prod.metadata.table_catalog` AS c
CROSS JOIN UNNEST(SPLIT(c.clustering_columns, ',')) AS tag
WHERE c.clustering_columns IS NOT NULL
LIMIT 100;

-- ============================================================================
-- END 05_joins_and_merge.sql  (queries Q055–Q066)
-- ============================================================================
