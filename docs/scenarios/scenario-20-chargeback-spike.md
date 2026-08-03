# Scenario 20 — Chargeback Rate Spike

**Severity:** P1 · **Domain:** Risk / Revenue

## Problem
Chargebacks jumped from 0.9% to 4.1% of GMV in a week — a classic fraud or
billing-issue signal. The risk team had no aggregated view; they were
downloading raw extracts.

## SQL Investigation
Step 1 — confirm and quantify the spike:

```sql
SELECT txn_date,
       COUNTIF(txn_type = 'CHARGEBACK') AS chargebacks,
       COUNTIF(txn_type = 'POSTED' OR txn_type = 'PAYMENT') AS sales,
       ROUND(100 * SAFE_DIVIDE(COUNTIF(txn_type='CHARGEBACK'),
             COUNTIF(txn_type IN ('POSTED','PAYMENT'))), 2) AS chargeback_rate
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-14'
GROUP BY 1 ORDER BY 1;
-- Rate: 0.9% → 4.1% on Jul 11
```

Step 2 — cluster by product / region / merchant:

```sql
SELECT p.product_category, r.region_name, ch.channel_code,
       COUNTIF(t.txn_type='CHARGEBACK') AS cbs,
       ROUND(SUM(IF(t.txn_type='CHARGEBACK', t.amount_usd, 0)),2) AS cb_amount
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_product` AS p  ON t.product_key = p.product_key AND p.is_current = TRUE
JOIN `zumiq-prod.core_layer.dim_region` AS r   ON t.region_key = r.region_key
JOIN `zumiq-prod.core_layer.dim_channel` AS ch ON t.channel_key = ch.channel_key
WHERE t.txn_date BETWEEN DATE '2026-07-11' AND DATE '2026-07-14'
GROUP BY 1, 2, 3
HAVING cbs > 50 ORDER BY 4 DESC LIMIT 10;
-- Consumer Electronics via API channel in APAC = 92% of chargebacks
```

Step 3 — correlate with ops events (was it payment-related?):

```sql
SELECT event_date, event_type, COUNT(*) AS n
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_type = 'PAYMENT_FAILED'
  AND event_date BETWEEN DATE '2026-07-10' AND DATE '2026-07-14'
GROUP BY 1 ORDER BY 1;
-- PAYMENT_FAILED on the API channel tripled on Jul 10-11
```

## Root Cause
A new API integration partner (reseller channel) launched with a **misconfigured
billing token**: customers were charged twice, then filed chargebacks when they
saw double charges. The risk was in the new channel — hidden because risk
analysts weren't looking at aggregated chargeback views (they had no dashboard).

## Dashboard
"Chargeback & Risk" — chargeback rate by channel/product/region with trend,
alerts at 2× baseline. Risk team now watches this daily.

## Business Impact
- 4.1% chargeback rate → ~$3.2M at risk + card-processor fees + possible
  merchant-account penalties.
- Brand damage from double-charging customers.

## Recommendation
1. **Chargeback monitor** with rate-by-channel and automatic alert at 2×
   baseline (DQ-style anomaly on a business KPI).
2. **Channel launch guardrail**: new partners run in "shadow mode" (mirror
   transactions, no real charges) for 2 weeks.
3. **Refund orchestration**: double-charge detection at the gateway before
   customers file disputes (dedup by order+amount+time, Q060 pattern).
4. **Cross-domain correlation** (scenario 11 lesson): payment failures + cases
   + chargebacks on one timeline → the reseller launch was visible 3 days early.
