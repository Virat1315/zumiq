# Scenario 11 - Support Case Spike from a Billing Bug

**Severity:** P2 · **Domain:** CX / Product

## Problem
Support case volume jumped 3.4× in 48 hours. The CX team was overwhelmed and
didn't know if it was a product bug, a billing error, or a service issue.
Executives asked if this was a "customer experience crisis."

## SQL Investigation
Step 1 - confirm the spike and isolate by case type:

```sql
SELECT opened_date, case_type, COUNT(*) AS cases
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date BETWEEN DATE '2026-07-10' AND DATE '2026-07-13'
GROUP BY 1, 2 ORDER BY 1, 3 DESC;
-- 07-11 → 07-12: BILLING cases 1,100 → 4,020
```

Step 2 - correlate with operational events (what happened on 07-11?):

```sql
SELECT event_date, event_type, source_system, COUNT(*) AS n
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_date BETWEEN DATE '2026-07-10' AND DATE '2026-07-12'
GROUP BY 1, 2, 3
HAVING COUNT(*) > 500
ORDER BY 1, 4 DESC;
-- 07-11: PAYMENT_FAILED exploded on GATEWAY svc-pay-3 (11k → 89k)
```

Step 3 - link them: are billing cases following payment failures?

```sql
SELECT s.opened_date,
       COUNT(DISTINCT s.customer_key) AS affected_customers,
       ROUND(100.0 * COUNTIF(s.case_type='BILLING') / COUNT(*),1) AS billing_share
FROM `zumiq-prod.core_layer.fct_support_cases` AS s
WHERE s.opened_date BETWEEN DATE '2026-07-11' AND DATE '2026-07-12'
GROUP BY 1;
-- 87% of the spike is billing cases from customers whose payments failed
```

## Root Cause
A payment-gateway release (svc-pay-3) had a regression that rejected valid
cards; each failure generated a "double charge" notice to customers, who
opened billing cases. The product team didn't see the payment-failure
dashboard trend because CX and platform dashboards were disconnected.

## Dashboard
"Cross-Domain Spike Correlation" - overlays ops events (payment failures,
latency) with support cases and GMV on one timeline, so a CX spike is linked
to its technical cause in one screen.

## Business Impact
- CX team flooded (4,000+ cases) → SLA attainment dipped.
- Customer trust hit: false double-charge notices.
- Estimated brand+handling cost: ~$180k.

## Recommendation
1. **Unified incident view**: ops + CX + revenue on one timeline (this
   dashboard is now the first stop for any volume anomaly).
2. **Automated correlation**: a weekly query flags "support spike following
   payment failures" before it becomes a crisis.
3. **Gateway release gating**: new payment release requires 24h canary + error
   rate alert before full rollout.
4. **Customer comms playbook**: when a known billing bug is detected, proactive
   notification goes out *before* the case flood.
