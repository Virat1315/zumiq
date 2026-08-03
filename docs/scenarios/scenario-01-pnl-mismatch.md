# Scenario 01 - Executive P&L Mismatch: Finance vs Retail

**Severity:** P1 · **Domain:** Governance / Semantics

## Problem
The CEO's morning brief showed Retail **GMV = $12.4M** for July 13, while the
Retail BU report showed **$9.8M** for the same day. The board meeting started
with "which number is right?" This was the classic symptom of the 7-definition
problem: two teams computing the same KPI differently.

## SQL Investigation
Step 1 - What are the two definitions actually doing? Diff the two queries:

```sql
-- Finance version (brief): includes ALL posted transactions
SELECT ROUND(SUM(amount_usd), 2) AS gmv
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status = 'POSTED'
  AND txn_date = '2026-07-13'
  AND bu_key = (SELECT bu_key FROM `zumiq-prod.core_layer.dim_business_unit`
                WHERE bu_code = 'RTL');   -- → 12,412,900.00

-- Retail version (BU report): EXCLUDES refunds treated as negative + channels
SELECT ROUND(SUM(amount_usd), 2) AS gmv
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE status = 'POSTED' AND is_reversal = FALSE
  AND txn_date = '2026-07-13'
  AND bu_key = (SELECT bu_key FROM `zumiq-prod.core_layer.dim_business_unit`
                WHERE bu_code = 'RTL')
  AND channel_key IN (SELECT channel_key FROM `zumiq-prod.core_layer.dim_channel`
                      WHERE channel_type = 'DIGITAL');   -- → 9,815,300.00
```

Step 2 - prove they're the same data, different filters:

```sql
-- The gap = refunds/chargebacks + non-digital channels
SELECT
  COUNTIF(txn_type IN ('REFUND','CHARGEBACK')) AS refunds_chargebacks,
  ROUND(SUM(IF(txn_type IN ('REFUND','CHARGEBACK'), amount_usd, 0)), 2) AS adj_amount,
  COUNTIF(channel_type != 'DIGITAL') AS non_digital_txns,
  ROUND(SUM(IF(channel_type != 'DIGITAL', amount_usd, 0)), 2) AS non_digital_amount
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_channel` AS ch ON t.channel_key = ch.channel_key
WHERE txn_date = '2026-07-13' AND status = 'POSTED'
  AND bu_key = (SELECT bu_key FROM `zumiq-prod.core_layer.dim_business_unit`
                WHERE bu_code = 'RTL');
-- 12,412,900 − 9,815,300 = 2,597,600 → matches refunds + physical channels
```

## Root Cause
Two dashboards each defined GMV in their own SQL. Finance counted refunds in
GMV; Retail excluded refunds *and* physical channels. **There was no shared
semantic layer** - the platform had not yet certified the GMV definition.

## Dashboard
The "KPI Definition Audit" - new dashboard listing every dashboard, its metric
definition, and whether it matches the CERTIFIED glossary term. Discrepancies
flagged red.

## Business Impact
- 40+ minutes of exec time weekly arguing about a number.
- A "$2.6M gap" that did not exist - pure definition drift.
- Confidence in ALL numbers undermined (the trust death spiral).

## Recommendation
1. **Semantic layer first** (Q1 priority): GMV defined once in
   `v_executive_daily`; all dashboards must select from it (enforced by
   dashboard certification).
2. **Glossary certification gate**: no dashboard goes live with an
   uncertified metric formula.
3. **Automated consistency check** (DQ dimension CONSISTENCY): nightly diff of
   "dashboard total vs certified view total" → alert on any gap (see Q103).
4. Result: definition disputes dropped to zero within two quarters.
