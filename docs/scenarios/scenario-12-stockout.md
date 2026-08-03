# Scenario 12 - Stockout Eating Revenue (Inventory Receipts)

**Severity:** P2 · **Domain:** Operations

## Problem
Retail revenue for a top SKU dropped 22% despite healthy demand signals.
Purchasing blamed demand; the store blamed supply. The truth was in the
streaming inventory data nobody was watching.

## SQL Investigation
Step 1 - find the SKU and its daily sales trend:

```sql
SELECT t.txn_date, p.product_id,
       ROUND(SUM(t.amount_usd), 2) AS sales,
       COUNT(*) AS units
FROM `zumiq-prod.core_layer.fct_transactions` AS t
JOIN `zumiq-prod.core_layer.dim_product` AS p
  ON t.product_key = p.product_key AND p.is_current = TRUE
WHERE p.product_id = 'SKU-880231'
  AND t.txn_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-14'
  AND t.status = 'POSTED'
GROUP BY 1, 2 ORDER BY 1;
-- Sales collapsed from Jul 09 onwards
```

Step 2 - check inventory receipts (streaming table) for the same SKU:

```sql
SELECT received_date, warehouse_code,
       SUM(quantity) AS receipts,
       COUNTIF(quantity = 0) AS zero_receipts
FROM `zumiq-prod.raw_layer.inventory_receipts`
WHERE product_key = (SELECT product_key FROM `zumiq-prod.core_layer.dim_product`
                     WHERE product_id = 'SKU-880231' AND is_current = TRUE)
  AND received_date BETWEEN DATE '2026-07-01' AND DATE '2026-07-14'
GROUP BY 1, 2 ORDER BY 1;
-- Zero receipts after Jul 09 → the warehouse ran out of stock
```

Step 3 - was it a supply delay or a forecasting miss? (lead-time vs receipts)

```sql
SELECT
  warehouse_code,
  AVG(quantity) AS avg_receipt,
  MAX(received_date) AS last_receipt,
  DATE_DIFF(CURRENT_DATE(), MAX(received_date), DAY) AS days_since_last_receipt
FROM `zumiq-prod.raw_layer.inventory_receipts`
WHERE product_key = (SELECT product_key FROM `zumiq-prod.core_layer.dim_product`
                     WHERE product_id = 'SKU-880231' AND is_current = TRUE)
GROUP BY 1 ORDER BY 3 DESC;
```

## Root Cause
A logistics carrier missed three scheduled deliveries (their issue), the
warehouse hit zero stock, and nobody monitored `inventory_receipts` - the
receipt data existed but had no dashboard and no alert. Purchasing reordered
10 days late.

## Dashboard
"Inventory Receipts Monitor" - receipts vs forecast per SKU/warehouse with a
"days of cover" gauge; a SKU below 7 days of cover pages planning.

## Business Impact
- ~$1.4M lost revenue on one SKU over 5 days.
- Overnight shipping + expedite fees to recover.
- Demand/supply blame war in the BU - a data problem, not a people problem.

## Recommendation
1. **Receipt monitoring dashboard** (this table was dark data - now the
   warehouse team's home screen).
2. **"Days of cover" alert**: streaming receipts + dim_product → below
   threshold → pager.
3. **Receipt DQ rules**: volume drop on receipts = WARNING (it's an early
   indicator of supply failure, detected *before* the sales impact).
4. **Carrier SLA**: missed-delivery alerting + penalty review with logistics.
