# Scenario 16 - Wrong Product Margin in a Restatement

**Severity:** P1 · **Domain:** Accuracy

## Problem
During quarter-end, Finance recomputed gross margin and got a **negative margin
rate** for a profitable product line. The restatement was about to ship with
wrong numbers.

## SQL Investigation
Step 1 - find the bad margin:

```sql
SELECT p.product_id, p.list_price, p.cost_price,
       ROUND(SAFE_DIVIDE(p.list_price - p.cost_price, p.list_price), 4) AS margin_pct
FROM `zumiq-prod.core_layer.dim_product` AS p
WHERE p.is_current = TRUE
  AND p.product_category = 'Consumer Electronics'
  AND p.list_price < p.cost_price;
-- SKU-771204: cost $490 vs list $325 → margin = −50.8%
```

Step 2 - did the restatement use the right version of the product? (SCD2 as-of)

```sql
-- The restatement joined the CURRENT product version, not the version at sale time:
SELECT t.txn_date,
       p.list_price AS price_used,
       p.margin_pct AS margin_used,
       p.valid_from, p.valid_to
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key AND p.is_current = TRUE
WHERE t.txn_date BETWEEN DATE '2026-04-01' AND DATE '2026-06-30'
  AND t.product_key = (SELECT product_key FROM `zumiq-prod.core_layer.dim_product`
                       WHERE product_id = 'SKU-771204' AND is_current = TRUE)
LIMIT 5;
-- The product was re-priced in May (cost rose). Transactions before May used the
-- OLD price, but the current-version join applied the NEW (bad) price.
```

## Root Cause
The restatement used a **current-version join** instead of a **point-in-time
(as-of) join**. For any product whose price/cost changed mid-period, the
restated margin was wrong. This is the classic SCD2 misuse.

## Dashboard
"Margin Accuracy" - margin by product with version-change flags; any product
whose price changed mid-quarter is flagged for as-of review.

## Business Impact
- A restatement shipped with a −51% margin for a profitable line.
- Would have triggered a *second* restatement (and an audit finding).

## Recommendation
1. **As-of joins for all finance queries** (Q057): restatements must use
   `txn_timestamp BETWEEN valid_from AND valid_to`.
2. **DQ ACCURACY/CONSISTENCY check**: restated margin vs certified margin per
   product must match within tolerance.
3. **Glossary rule**: "Gross Margin uses point-in-time product margin" -
   certified + enforced in the semantic view `v_executive_daily` (already uses
   `is_current`; finance marts now use as-of).
4. **Engineering guard**: the restatement stored procedure logs which version
   it used; a version bump mid-period triggers a review flag.
