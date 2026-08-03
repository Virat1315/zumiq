-- ============================================================================
-- ZUMIQ — SQL LIBRARY · 07_business_kpi_queries.sql
-- Cross-domain KPI queries: finance, CX, operations, cost, product.
-- All metrics match the certified glossary definitions (semantic layer).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q078 · Finance — P&L bridge: GMV → Net Revenue → Gross Margin by BU
-- ----------------------------------------------------------------------------
SELECT
  bu.bu_name,
  ROUND(SUM(IF(t.txn_type = 'REFUND', -t.amount_usd, t.amount_usd)), 2)          AS net_revenue_usd,
  ROUND(SUM(IF(t.txn_type NOT IN ('REFUND','CHARGEBACK'), t.amount_usd, 0)), 2)  AS gross_revenue_usd,
  ROUND(SUM(IF(t.txn_type = 'CHARGEBACK', t.amount_usd, 0)), 2)                  AS chargebacks_usd,
  ROUND(SUM(t.amount_usd * p.margin_pct), 2)                                     AS gross_margin_usd,
  ROUND(SAFE_DIVIDE(
    SUM(IF(t.txn_type NOT IN ('REFUND','CHARGEBACK'), t.amount_usd, 0))
      - SUM(IF(t.txn_type = 'CHARGEBACK', t.amount_usd, 0))
      - SUM(t.amount_usd * p.margin_pct),
    SUM(IF(t.txn_type NOT IN ('REFUND','CHARGEBACK'), t.amount_usd, 0))), 4)     AS net_margin_rate
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu ON t.bu_key = bu.bu_key
JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key AND p.is_current = TRUE
WHERE t.status = 'POSTED'
  AND t.txn_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
GROUP BY 1
ORDER BY 2 DESC;

-- ----------------------------------------------------------------------------
-- Q079 · Finance — MTD vs last-MTD with % change (month-over-month)
-- ----------------------------------------------------------------------------
WITH mtd AS (
  SELECT bu_key, SUM(amount_usd) AS gmv
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
    AND txn_date BETWEEN DATE_TRUNC(CURRENT_DATE(), MONTH) AND CURRENT_DATE()
  GROUP BY 1
),
last_mtd AS (
  SELECT bu_key, SUM(amount_usd) AS gmv
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
    AND txn_date BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
                     AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
  GROUP BY 1
)
SELECT
  m.bu_key,
  ROUND(m.gmv, 2)                              AS mtd_gmv,
  ROUND(IFNULL(l.gmv, 0), 2)                   AS last_mtd_gmv,
  ROUND(SAFE_DIVIDE(m.gmv - IFNULL(l.gmv,0), IFNULL(l.gmv,0)), 4) AS mom_change
FROM mtd AS m
LEFT JOIN last_mtd AS l ON m.bu_key = l.bu_key
ORDER BY 3 DESC;

-- ----------------------------------------------------------------------------
-- Q080 · CX — First Call Resolution and CSAT trends by case type
-- ----------------------------------------------------------------------------
SELECT
  DATE_TRUNC(opened_date, WEEK(MONDAY)) AS week_start,
  case_type,
  COUNT(*)                                          AS cases,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(reopen_count = 0 AND status = 'CLOSED'), COUNT(*)), 2) AS fcr_pct,
  ROUND(AVG(satisfaction_score), 2)                 AS avg_csat,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(is_escalated), COUNT(*)), 2) AS escalation_pct
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1, 2
ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Q081 · CX — SLA attainment by priority vs target (Service desk board)
-- ----------------------------------------------------------------------------
SELECT
  priority,
  COUNT(*)                                                                  AS total_cases,
  COUNTIF(resolved_at <= sla_due_at AND status = 'CLOSED')                  AS met_sla,
  ROUND(100 * SAFE_DIVIDE(
    COUNTIF(resolved_at <= sla_due_at AND status = 'CLOSED'), COUNT(*)), 2) AS sla_pct,
  CASE priority
    WHEN 'P1' THEN 98 WHEN 'P2' THEN 95 WHEN 'P3' THEN 90 ELSE 85
  END                                                                       AS sla_target_pct
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q082 · Ops — service error rate by microservice (SLO tracking)
-- ----------------------------------------------------------------------------
SELECT
  service_name,
  COUNT(*) AS requests,
  COUNTIF(status = 'FAILURE') AS failures,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(status='FAILURE'), COUNT(*)), 4) AS error_rate_pct,
  ROUND(PERCENTILE_CONT(latency_ms, 0.95) OVER (PARTITION BY service_name), 0) AS p95_latency_ms
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY 1
ORDER BY 3 DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- Q083 · Ops — SLA breach forecaster: services trending toward SLO violation
-- ----------------------------------------------------------------------------
WITH daily AS (
  SELECT
    DATE_TRUNC(event_date, WEEK(MONDAY)) AS week_start,
    service_name,
    COUNT(*) AS total,
    COUNTIF(status = 'FAILURE') AS failures
  FROM `zumiq-prod.core_layer.fct_operations_events`
  WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
  GROUP BY 1, 2
)
SELECT
  week_start,
  service_name,
  ROUND(100 * failures / total, 2) AS error_rate_pct,
  LAG(ROUND(100 * failures / total, 2)) OVER (PARTITION BY service_name ORDER BY week_start)
    AS prior_week_rate
FROM daily
QUALIFY error_rate_pct > 1.0 AND prior_week_rate IS NOT NULL
ORDER BY 2, 1;

-- ----------------------------------------------------------------------------
-- Q084 · Cost — top 10 expensive queries this week (FinOps review)
-- ----------------------------------------------------------------------------
SELECT
  user_email,
  query_id,
  ROUND(SUM(cost_usd), 2)                AS cost_usd,
  ROUND(SUM(bytes_processed) / 1e12, 3)  AS tb_processed,
  COUNT(*)                               AS executions
FROM `zumiq-prod.cost.fct_query_cost`
WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1, 2
ORDER BY 3 DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Q085 · Cost — % of spend by layer and by user segment (allocation)
-- ----------------------------------------------------------------------------
SELECT
  layer,
  ROUND(SUM(cost_usd), 2)                              AS cost_usd,
  ROUND(100 * SUM(cost_usd) / SUM(SUM(cost_usd)) OVER (), 2) AS cost_share_pct
FROM (
  SELECT
    CASE
      WHEN table_reference LIKE '%raw%' THEN '1_raw'
      WHEN table_reference LIKE '%staging%' THEN '2_staging'
      WHEN table_reference LIKE '%core%' THEN '3_core'
      WHEN table_reference LIKE '%analytics%' THEN '4_analytics'
      ELSE '5_other'
    END AS layer,
    cost_usd
  FROM `zumiq-prod.cost.fct_query_cost`
  WHERE job_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q086 · Product adoption — weekly active users on ZUMIQ platform (our own dogfood)
-- ----------------------------------------------------------------------------
SELECT
  DATE_TRUNC(activity_date, WEEK(MONDAY)) AS week_start,
  COUNT(DISTINCT employee_key)            AS weekly_active_users,
  COUNTIF(activity_type = 'DASHBOARD_VIEW') AS dashboard_views,
  ROUND(SAFE_DIVIDE(
    COUNTIF(activity_type = 'DASHBOARD_VIEW'),
    COUNT(DISTINCT employee_key)), 2)     AS dashboard_views_per_user
FROM `zumiq-prod.core_layer.fct_employee_activity`
WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- Q087 · Adopted vs stale dashboards — where is self-serve dying?
-- ----------------------------------------------------------------------------
SELECT
  resource_name,
  COUNT(DISTINCT employee_key)                AS viewers,
  COUNTIF(activity_type = 'DASHBOARD_VIEW')   AS views,
  MAX(activity_date)                          AS last_viewed,
  CASE WHEN MAX(activity_date) < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
       THEN 'STALE' ELSE 'ACTIVE' END         AS status
FROM `zumiq-prod.core_layer.fct_employee_activity`
WHERE app_name = 'Tableau'
GROUP BY 1
ORDER BY 3 DESC;

-- ----------------------------------------------------------------------------
-- Q088 · Support cost of quality — cases opened due to data errors (attribution)
-- ----------------------------------------------------------------------------
SELECT
  CASE
    WHEN LOWER(case_note) LIKE '%data%' OR LOWER(case_note) LIKE '%report%' THEN 'DATA_RELATED'
    ELSE 'OPERATIONAL'
  END AS root_cause_bucket,
  COUNT(*) AS cases,
  ROUND(AVG(TIMESTAMP_DIFF(COALESCE(resolved_at, CURRENT_TIMESTAMP()), opened_at, HOUR)),1)
    AS avg_handle_hours
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1;

-- ============================================================================
-- END 07_business_kpi_queries.sql  (queries Q078–Q088)
-- ============================================================================
