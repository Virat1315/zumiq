# Scenario 02 - Unexpected 18% Drop in Daily GMV

**Severity:** P1 · **Domain:** Revenue

## Problem
Daily GMV fell 18% in one day with no apparent business cause. No holiday, no
outage, no promo change. Execs needed an answer before noon.

## SQL Investigation
Step 1 - confirm it's real and isolate it by dimension (drill down):

```sql
WITH daily AS (
  SELECT txn_date, ROUND(SUM(amount_usd), 2) AS gmv_usd
  FROM `zumiq-prod.core_layer.fct_transactions`
  WHERE status='POSTED' AND is_reversal = FALSE
  GROUP BY 1
)
SELECT txn_date, gmv_usd,
       LAG(gmv_usd) OVER (ORDER BY txn_date) AS prev_day,
       ROUND(SAFE_DIVIDE(gmv_usd - LAG(gmv_usd) OVER (ORDER BY txn_date),
                         LAG(gmv_usd) OVER (ORDER BY txn_date)), 4) AS pct_change
FROM daily ORDER BY txn_date DESC LIMIT 5;
-- Jul 12 → 14.2M ; Jul 13 → 11.6M (−18.3%)

-- Step 2 - which BU / region / channel drove it?
SELECT
  bu.bu_code, r.region_name, ch.channel_code,
  ROUND(SUM(t.amount_usd), 2) AS gmv,
  ROUND(100 * SAFE_DIVIDE(SUM(t.amount_usd), SUM(SUM(t.amount_usd)) OVER ()), 2) AS share
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_business_unit` AS bu ON t.bu_key = bu.bu_key
JOIN `zumiq-prod.core_layer.dim_region`      AS r  ON t.region_key = r.region_key
JOIN `zumiq-prod.core_layer.dim_channel`     AS ch ON t.channel_key = ch.channel_key
WHERE t.txn_date = '2026-07-13' AND t.status='POSTED' AND t.is_reversal = FALSE
GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 10;

-- Step 3 - is it a volume drop or a value drop? Check transaction counts.
SELECT
  COUNT(*) AS txn_count,
  COUNT(DISTINCT customer_key) AS customers,
  ROUND(AVG(amount_usd), 2) AS avg_txn
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date = '2026-07-13';
-- txn_count fell 19% → it's a VOLUME drop, not a pricing change
```

## Root Cause
The payment gateway's batch feed failed silently at 03:00; the OMS kept
generating transactions but the ERP settlement feed didn't arrive until 11:00.
The overnight load ran with a **partial source** and published anyway - a
classic silent-failure pattern. The DQ engine had no volume rule yet.

## Dashboard
"GMV Anomaly" - daily GMV vs 28-day trailing average with the VOLUME and
FRESHNESS flags on the executive overview. Red flag + drill path.

## Business Impact
- An 18% "crash" that was really a 7-hour data gap.
- Two hours of executive investigation time; a false alarm that erodes trust.
- If uncaught, a restated number next month (compounded trust loss).

## Recommendation
1. **Add DQ VOLUME rule** (Q096/Q101): any day below 50% of trailing average
   → WARNING → alert. Ship before next incident.
2. **Pipeline completeness check**: `rows_written` must be ≥ 95% of source
   count or the load FAILS loudly (no silent partial publishes).
3. **Freshness SLA**: settlement feed must arrive by 06:00 or page on-call.
4. **Runbook automation**: "GMV drop" playbook now auto-ranks BU/region/channel
   so investigation takes minutes, not hours.
