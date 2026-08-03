-- ============================================================================
-- ZUMIQ - SQL LIBRARY · 02_cte_subqueries.sql
-- CTEs, recursive CTEs, subqueries, semi/anti joins, dedupe patterns.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q019 · CTE chain - Customer RFM-style analysis (the CX standard query)
-- ----------------------------------------------------------------------------
WITH txns AS (
  SELECT customer_key, txn_date, amount_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
),
summary AS (
  SELECT
    customer_key,
    COUNT(*)                              AS frequency,
    ROUND(SUM(amount_usd),2)              AS monetary,
    MAX(txn_date)                         AS last_order
  FROM txns
  GROUP BY 1
),
final AS (
  SELECT
    customer_key,
    frequency,
    monetary,
    DATE_DIFF(CURRENT_DATE(), last_order, DAY) AS recency_days,
    CASE WHEN monetary > 50000 THEN 'A' WHEN monetary > 10000 THEN 'B'
         WHEN monetary > 1000  THEN 'C' ELSE 'D' END AS value_segment
  FROM summary
)
SELECT
  value_segment,
  COUNT(*) AS customers,
  ROUND(AVG(monetary),2) AS avg_ltv,
  ROUND(AVG(recency_days),1) AS avg_recency_days
FROM final
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q020 · Multiple CTEs - Pipeline SLA dashboard (freshness per critical table)
-- ----------------------------------------------------------------------------
WITH last_load AS (
  SELECT target_table, MAX(run_finished_at) AS last_ok
  FROM `zumiq-prod.ops.fct_pipeline_runs`
  WHERE status = 'SUCCESS'
  GROUP BY 1
),
catalog AS (
  SELECT table_id, table_name, sla_hours, data_owner, criticality
  FROM `zumiq-prod.metadata.table_catalog`
  WHERE is_certified = TRUE
)
SELECT
  c.table_name,
  c.data_owner,
  c.criticality,
  c.sla_hours,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), l.last_ok, HOUR) AS hours_since_last_load,
  CASE WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), l.last_ok, HOUR) > c.sla_hours
       THEN 'BREACHED' ELSE 'OK' END AS sla_status
FROM catalog AS c
LEFT JOIN last_load AS l
  ON c.table_id = l.target_table
ORDER BY c.criticality, sla_status DESC;

-- ----------------------------------------------------------------------------
-- Q021 · Scalar subquery - Compare BU performance vs enterprise average
-- ----------------------------------------------------------------------------
SELECT
  txn_date,
  bu_key,
  ROUND(SUM(amount_usd),2) AS bu_gmv,
  ROUND((SELECT SUM(amount_usd) FROM `zumiq-prod.core_layer.fct_transactions`
         WHERE status='POSTED' AND is_reversal = FALSE
           AND txn_date = a.txn_date),2) AS enterprise_gmv,
  ROUND(SAFE_DIVIDE(SUM(amount_usd),
    (SELECT SUM(amount_usd) FROM `zumiq-prod.core_layer.fct_transactions`
     WHERE status='POSTED' AND is_reversal = FALSE
       AND txn_date = a.txn_date)), 4) AS share_pct
FROM `zumiq-prod.core_layer.fct_transactions` AS a
WHERE status='POSTED' AND is_reversal = FALSE
GROUP BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q022 · Correlated subquery - Customers with no transaction in 90 days
-- (anti-pattern avoided: rewritten as NOT EXISTS; EXISTS is the flag here)
-- ----------------------------------------------------------------------------
SELECT c.customer_id, c.full_name, c.tier
FROM `zumiq-prod.core_layer.dim_customer` AS c
WHERE c.is_current = TRUE
  AND c.is_active = TRUE
  AND EXISTS (
    SELECT 1 FROM `zumiq-prod.core_layer.fct_support_cases` AS s
    WHERE s.customer_key = c.customer_key
      AND s.priority = 'P1'
      AND s.opened_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
  );

-- ----------------------------------------------------------------------------
-- Q023 · NOT EXISTS (anti-join) - Products sold in no transaction this month
-- (inventory/demand planning: dead stock candidates)
-- ----------------------------------------------------------------------------
SELECT p.product_id, p.product_name, p.product_category
FROM `zumiq-prod.core_layer.dim_product` AS p
WHERE p.is_current = TRUE
  AND p.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM `zumiq-prod.core_layer.fct_transactions` AS t
    WHERE t.product_key = p.product_key
      AND t.txn_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  );

-- ----------------------------------------------------------------------------
-- Q024 · Recursive CTE - Employee org hierarchy (depth + root ancestor)
-- The management chain for any employee, walking up dim_employee.
-- ----------------------------------------------------------------------------
WITH RECURSIVE org AS (
  -- anchor: the target employee
  SELECT
    employee_key,
    full_name,
    manager_employee_key,
    0 AS depth,
    CAST(full_name AS STRING) AS chain
  FROM `zumiq-prod.core_layer.dim_employee`
  WHERE employee_key = 4482
  UNION ALL
  -- recursive: walk up to manager
  SELECT
    m.employee_key,
    m.full_name,
    m.manager_employee_key,
    o.depth + 1,
    CONCAT(o.chain, ' → ', m.full_name)
  FROM org AS o
  JOIN `zumiq-prod.core_layer.dim_employee` AS m
    ON m.employee_key = o.manager_employee_key
)
SELECT depth, full_name, chain
FROM org
ORDER BY depth;

-- ----------------------------------------------------------------------------
-- Q025 · Recursive CTE - Number of employees reporting under each manager
-- (management span-of-control, HR planning)
-- ----------------------------------------------------------------------------
WITH RECURSIVE org AS (
  SELECT employee_key, manager_employee_key
  FROM `zumiq-prod.core_layer.dim_employee`
  WHERE employment_status = 'ACTIVE'
  UNION ALL
  SELECT e.employee_key, o.manager_employee_key
  FROM org AS o
  JOIN `zumiq-prod.core_layer.dim_employee` AS e
    ON e.manager_employee_key = o.employee_key
)
SELECT manager_employee_key AS manager_key,
       COUNT(*) AS total_indirect_reports
FROM org
WHERE manager_employee_key IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC
LIMIT 25;

-- ----------------------------------------------------------------------------
-- Q026 · Recursive CTE - Bill of materials explosion (manufacturing BU)
-- Total component quantity needed for a finished good.
-- ----------------------------------------------------------------------------
WITH RECURSIVE bom AS (
  SELECT
    component_product_key,
    parent_product_key,
    quantity_per_unit,
    1 AS level
  FROM `zumiq-prod.staging_layer.stg_bom`
  WHERE parent_product_key = 110        -- finished good
  UNION ALL
  SELECT
    b.component_product_key,
    b.parent_product_key,
    b.quantity_per_unit * bom.quantity_per_unit AS quantity_per_unit,
    bom.level + 1
  FROM bom
  JOIN `zumiq-prod.staging_layer.stg_bom` AS b
    ON b.parent_product_key = bom.component_product_key
)
SELECT
  component_product_key,
  ROUND(SUM(quantity_per_unit), 2) AS total_qty_needed
FROM bom
GROUP BY 1
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q027 · Nested subquery with CASE - GMV by tier with cohort bucketing
-- ----------------------------------------------------------------------------
SELECT
  CASE
    WHEN lifetime_value >= 100000 THEN '1. VVVIP'
    WHEN lifetime_value >= 25000  THEN '2. VIP'
    WHEN lifetime_value >= 5000   THEN '3. Core'
    ELSE '4. Low'
  END AS customer_bucket,
  COUNT(*) AS customers,
  ROUND(SUM(lifetime_value), 2) AS total_value
FROM (
  SELECT customer_key, SUM(amount_usd) AS lifetime_value
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q028 · Derived table (inline view) - Active customers per BU with margin
-- ----------------------------------------------------------------------------
SELECT
  bu.bu_name,
  act.active_customers,
  act.gmv,
  ROUND(SAFE_DIVIDE(act.gmv, act.active_customers), 2) AS gmv_per_customer
FROM (
  SELECT
    bu_key,
    COUNT(DISTINCT customer_key) AS active_customers,
    SUM(amount_usd)              AS gmv
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
) AS act
JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu
  ON act.bu_key = bu.bu_key
ORDER BY act.gmv DESC;

-- ----------------------------------------------------------------------------
-- Q029 · EXISTS + NOT EXISTS combo - Customers whose latest 3 cases all escalated
-- ----------------------------------------------------------------------------
SELECT DISTINCT c.customer_id, c.full_name
FROM `zumiq-prod.core_layer.dim_customer` AS c
JOIN (
  SELECT customer_key, is_escalated,
         ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY opened_at DESC) AS rn
  FROM `zumiq-prod.core_layer.fct_support_cases`
) AS recent
  ON recent.customer_key = c.customer_key AND recent.rn <= 3
WHERE NOT EXISTS (
  SELECT 1 FROM `zumiq-prod.core_layer.fct_support_cases` AS s2
  WHERE s2.customer_key = c.customer_key
    AND s2.is_escalated = FALSE
    AND s2.opened_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
)
  AND c.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- Q030 · Set operations (UNION ALL) - Merging cross-system transaction views
-- (ERP + OMS transactions into a unified ledger for finance)
-- ----------------------------------------------------------------------------
SELECT txn_id, txn_date, amount_usd, 'ERP' AS source_system
FROM `zumiq-prod.raw_layer.erp_transactions_raw`
WHERE txn_date = DATE '2026-07-14'
UNION ALL
SELECT txn_id, txn_date, amount_usd, 'OMS' AS source_system
FROM `zumiq-prod.raw_layer.oms_orders_raw`
WHERE txn_date = DATE '2026-07-14';

-- ============================================================================
-- END 02_cte_subqueries.sql  (queries Q019–Q030)
-- ============================================================================
