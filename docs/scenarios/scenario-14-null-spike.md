# Scenario 14 - Null Spike in the Customer Dimension

**Severity:** P2 · **Domain:** DQ / Completeness

## Problem
A "lapsed customer" campaign selected thousands of customers with NULL email -
so the CRM batch job crashed and the campaign silently lost its audience. The
dimension had a completeness problem nobody had measured.

## SQL Investigation
Step 1 - measure the null rate over time (spike vs baseline):

```sql
WITH daily AS (
  SELECT
    DATE(etl_loaded_at) AS load_date,
    ROUND(100 * SAFE_DIVIDE(COUNTIF(email IS NULL), COUNT(*)), 2) AS null_pct
  FROM `zumiq-prod.core_layer.dim_customer`
  GROUP BY 1
)
SELECT load_date, null_pct,
       AVG(null_pct) OVER (ORDER BY load_date ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING) AS baseline
FROM daily
ORDER BY 1 DESC LIMIT 20;
-- null_pct jumped from 0.8% baseline to 22% on one load
```

Step 2 - which segment/source produced the nulls?

```sql
SELECT customer_segment, country_code, COUNTIF(email IS NULL) AS null_emails, COUNT(*) AS n
FROM `zumiq-prod.core_layer.dim_customer`
WHERE is_current = TRUE
GROUP BY 1, 2
HAVING COUNTIF(email IS NULL) > 0
ORDER BY 3 DESC LIMIT 10;
-- Mid-Market / EMEA: the CRM sync mapped the wrong field (EU GDPR opt-in)
```

## Root Cause
A CRM field remapping (`contact.email → contact.opt_in_email`) ran ahead of the
ingestion mapping. EMEA GDPR consent rows came through with NULL email. No
completeness rule existed on the dimension, so the platform loaded it silently.

## Dashboard
"DQ Completeness" - per-column null rates vs trailing baseline with NULL_SPIKE
flag (Q104). Red flag on the customer dimension.

## Business Impact
- Campaign lost ~40% of its target audience → revenue impact + CRM batch crash.
- EMEA compliance concern: consent metadata mishandled.

## Recommendation
1. **Completeness rule** on `dim_customer.email` (ERROR severity, threshold
   0.5%): NULL spike → FAIL → load blocked, alert with failure samples.
2. **Field mapping change control**: ingestion mappings are versioned and
   validated against the column catalog before deploy (schema drift check).
3. **Null-spike detector** (Q104) runs for all PII columns nightly.
4. **Campaign guardrail**: CRM jobs check "NULL email rate" before running.
