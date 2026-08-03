# Scenario 21 — FX Conversion Error in Global Consolidation

**Severity:** P1 · **Domain:** Finance

## Problem
The global P&L consolidation showed EMEA revenue 14% lower than local BU
reports. The company operates in 8 currencies — Finance needed to know if it
was a real business decline or a conversion error.

## SQL Investigation
Step 1 — reproduce the consolidated number vs local numbers:

```sql
SELECT
  r.currency_code,
  COUNT(*) AS txns,
  ROUND(SUM(t.amount), 2) AS local_amount,
  ROUND(SUM(t.amount_usd), 2) AS consolidated_usd,
  ROUND(SUM(t.amount_usd) / NULLIF(SUM(t.amount), 0), 6) AS implied_rate
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_region` AS r ON t.region_key = r.region_key
WHERE t.txn_date BETWEEN DATE '2026-06-01' AND DATE '2026-06-30'
  AND t.status = 'POSTED'
GROUP BY 1 ORDER BY 2 DESC;
-- EUR: implied_rate = 0.93 but actual EUR/USD mid-rate ≈ 1.08 → WRONG
```

Step 2 — find the bad FX rates at transaction time:

```sql
SELECT txn_date, currency_code,
       MIN(fx_rate) AS min_rate, MAX(fx_rate) AS max_rate,
       COUNT(DISTINCT fx_rate) AS distinct_rates
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE '2026-06-01' AND DATE '2026-06-30'
  AND currency_code = 'EUR'
GROUP BY 1, 2 ORDER BY 1;
-- Multiple days had fx_rate = 1.0 (EUR treated as USD) → conversion skipped
```

Step 3 — quantify the impact:

```sql
SELECT ROUND(SUM(amount_usd), 2) AS reported_usd,
       ROUND(SUM(amount * 1.08), 2) AS corrected_usd,
       ROUND(SUM(amount * 1.08) - SUM(amount_usd), 2) AS gap
FROM `zumiq-prod.core_layer.fct_transactions`
WHERE txn_date BETWEEN DATE '2026-06-01' AND DATE '2026-06-30'
  AND currency_code = 'EUR' AND status = 'POSTED';
-- gap = $18.4M (EMEA revenue understated by 14%)
```

## Root Cause
The FX rate lookup service failed for 6 days and the ingestion fallback wrote
`fx_rate = 1.0` (treating every currency as USD) **silently**. The DQ engine
had no validity rule on fx_rate, and Finance's consolidation dashboard used the
pre-converted `amount_usd` without a sanity check.

## Dashboard
"FX & Currency Health" — implied vs expected rates per currency, days with
fx_rate anomalies, and currency-impact on consolidated revenue.

## Business Impact
- $18.4M EMEA revenue understatement → guidance risk for two quarters.
- A near-miss on an SEC-adjacent disclosure error.

## Recommendation
1. **DQ VALIDITY rule on fx_rate**: currency-specific expected range (EUR
   0.9–1.3, JPY 0.005–0.01, etc.) → out of range = FAIL, load blocked.
2. **Fallback hardening**: no silent `1.0` fallback — missing rates fail the
   pipeline loudly (never fabricate conversion).
3. **Reconciliation check** (Q103 pattern): consolidated USD vs local ×
   published rate per day must match; mismatch → alert.
4. **Implicit-rate monitor**: `SUM(amount_usd)/SUM(amount)` per currency vs
   expected mid-rate — a dashboard that would have caught this in minutes.
