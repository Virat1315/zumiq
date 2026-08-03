-- ============================================================================
-- ZUMIQ - Enterprise Data Intelligence Platform
-- semantic_executive.sql
-- The ANALYTICS + SEMANTIC LAYER.
-- These views are the ONLY place KPI formulas live. Dashboards never
-- re-derive metrics - they select from these certified views. This is the
-- mechanism that kills "different KPI definitions" across teams.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v_executive_daily - Executive Daily KPIs (grain: business_unit × region × date)
-- North Star metric: GMV. Guardrail: cost, freshness, DQ score.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `zumiq-prod.analytics_layer.v_executive_daily`
OPTIONS (
  description = 'Certified executive daily KPIs: GMV, Net Revenue, Gross Margin, active customers, transactions, avg order value.',
  labels = [("semantic", "certified")]
) AS
SELECT
  t.txn_date                                          AS metric_date,
  t.bu_key,
  bu.bu_code,
  bu.bu_name,
  t.region_key,
  r.region_name,
  COUNTIF(t.status = 'POSTED' AND t.is_reversal = FALSE)           AS txn_count,
  COUNT(DISTINCT IF(t.status = 'POSTED' AND NOT t.is_reversal, t.customer_key, NULL)) AS active_customers,
  ROUND(SUM(IF(t.status = 'POSTED' AND NOT t.is_reversal, t.amount_usd, 0)), 2)         AS gmv_usd,
  ROUND(SUM(IF(t.txn_type = 'REFUND', -t.amount_usd, 0)), 2)                            AS refunds_usd,
  ROUND(SUM(IF(t.status = 'POSTED' AND NOT t.is_reversal, t.amount_usd, 0))
        / NULLIF(COUNTIF(t.status = 'POSTED' AND NOT t.is_reversal), 0), 2)            AS avg_order_value_usd,
  ROUND(SUM(t.amount_usd * p.margin_pct) / NULLIF(SUM(t.amount_usd), 0), 4)            AS blended_margin_rate
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu
  ON t.bu_key = bu.bu_key
JOIN `zumiq-prod.core_layer.dim_region` AS r
  ON t.region_key = r.region_key
LEFT JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key AND p.is_current = TRUE
GROUP BY 1, 2, 3, 4, 5, 6;

-- ----------------------------------------------------------------------------
-- v_executive_overview - the single view that powers the executive dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `zumiq-prod.analytics_layer.v_executive_overview`
OPTIONS (description = 'One-stop executive view: GMV, revenue, margin, customers, DQ, freshness, cost.',
         labels = [("semantic", "certified")]) AS
SELECT
  e.metric_date,
  e.bu_name,
  e.region_name,
  e.txn_count,
  e.active_customers,
  e.gmv_usd,
  e.avg_order_value_usd,
  e.blended_margin_rate,
  -- Platform health sub-metrics joined in (0-100 scales)
  d.dq_score,
  p.freshness_hours,
  c.cost_usd
FROM `zumiq-prod.analytics_layer.v_executive_daily` AS e
LEFT JOIN (
  SELECT score_date, AVG(dq_score) AS dq_score
  FROM `zumiq-prod.governance.dq_health_daily`
  GROUP BY 1
) AS d ON e.metric_date = d.score_date
LEFT JOIN (
  SELECT
    run_date,
    MAX(TIMESTAMP_DIFF(run_finished_at, run_started_at, HOUR)) AS freshness_hours
  FROM `zumiq-prod.ops.fct_pipeline_runs`
  GROUP BY 1
) AS p ON e.metric_date = p.run_date
LEFT JOIN (
  SELECT job_date, ROUND(SUM(cost_usd), 2) AS cost_usd
  FROM `zumiq-prod.cost.fct_query_cost`
  GROUP BY 1
) AS c ON e.metric_date = c.job_date;

-- ----------------------------------------------------------------------------
-- v_customer_360 - Customer lifecycle + health view (for CX teams)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `zumiq-prod.analytics_layer.v_customer_360`
OPTIONS (description = 'Customer 360: lifetime value, recency/frequency, open cases, segment.',
         labels = [("semantic", "certified")]) AS
WITH customer_activity AS (
  SELECT
    customer_key,
    COUNT(*)                                        AS total_txns,
    ROUND(SUM(amount_usd), 2)                       AS lifetime_value_usd,
    MAX(txn_date)                                   AS last_txn_date,
    DATE_DIFF(CURRENT_DATE(), MAX(txn_date), DAY)   AS days_since_last_txn,
    COUNT(DISTINCT account_key)                     AS account_count
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status = 'POSTED' AND is_reversal = FALSE
  GROUP BY customer_key
),
open_cases AS (
  SELECT customer_key, COUNT(*) AS open_cases
  FROM `zumiq-prod.core_layer.fct_support_cases`
  WHERE status IN ('OPEN', 'IN_PROGRESS')
  GROUP BY customer_key
)
SELECT
  c.customer_key,
  c.customer_id,
  c.full_name,
  c.customer_segment,
  c.tier,
  c.is_active,
  a.total_txns,
  a.lifetime_value_usd,
  a.last_txn_date,
  a.days_since_last_txn,
  -- RFM-style segmentation (ntile window function)
  NTILE(4) OVER (ORDER BY a.lifetime_value_usd DESC)       AS value_quartile,
  NTILE(4) OVER (ORDER BY a.days_since_last_txn ASC)       AS recency_quartile,
  IFNULL(oc.open_cases, 0)                                 AS open_cases,
  CASE
    WHEN a.days_since_last_txn <= 30  THEN 'ACTIVE'
    WHEN a.days_since_last_txn <= 90  THEN 'AT_RISK'
    WHEN a.days_since_last_txn <= 180 THEN 'DORMANT'
    ELSE 'LAPSED'
  END                                                     AS engagement_status
FROM `zumiq-prod.core_layer.dim_customer` AS c
JOIN customer_activity AS a ON c.customer_key = a.customer_key
LEFT JOIN open_cases AS oc ON c.customer_key = oc.customer_key
WHERE c.is_current = TRUE;

-- ----------------------------------------------------------------------------
-- v_platform_health - pipeline/quality/freshness combined health
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `zumiq-prod.analytics_layer.v_platform_health`
OPTIONS (description = 'Platform health: pipeline success, DQ score, freshness SLA compliance.',
         labels = [("semantic", "certified")]) AS
SELECT
  p.run_date,
  ROUND(100 * COUNTIF(p.status = 'SUCCESS') / COUNT(*), 2)            AS pipeline_success_rate,
  COUNTIF(p.status = 'FAILED')                                        AS pipeline_failures,
  ROUND(AVG(IF(p.dq_score IS NOT NULL, p.dq_score, 100)), 2)          AS avg_dq_score,
  ROUND(100 * COUNTIF(p.dq_passed = TRUE) / COUNT(*), 2)              AS dq_pass_rate,
  SUM(IF(p.run_finished_at IS NULL, 1, 0))                            AS still_running
FROM `zumiq-prod.ops.fct_pipeline_runs` AS p
GROUP BY 1;

-- ============================================================================
-- END semantic_executive.sql
-- ============================================================================
