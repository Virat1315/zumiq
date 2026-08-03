# Scenario 07 — Metadata Inconsistency Breaking Tableau Extracts

**Severity:** P2 · **Domain:** Metadata

## Problem
A Tableau dashboard suddenly showed **nulls** in the "Customer Segment"
column. The extract worked last week. No source change was announced. The
business team assumed a data bug.

## SQL Investigation
Step 1 — is the column still there, with data?

```sql
SELECT customer_segment, COUNT(*) AS n
FROM `zumiq-prod.core_layer.dim_customer`
WHERE is_current = TRUE
GROUP BY 1;
-- All segments present in BigQuery — data is fine
```

Step 2 — check the catalog & lineage: what does the dashboard actually read?

```sql
SELECT e.source_table, e.source_column, e.target_table, e.target_column
FROM `zumiq-prod.metadata.lineage_edges` AS e
WHERE e.target_table LIKE '%customer%'
ORDER BY 1;
-- Dashboard reads 'customer_segment' from a STALE COPY table
-- (analytics_layer.v_customer_segment_old), NOT from dim_customer.
```

Step 3 — confirm the stale view exists and when it was last changed:

```sql
SELECT table_name, ROW_COUNT, SIZE_BYTES
FROM `zumiq-prod`.INFORMATION_SCHEMA.TABLES
WHERE table_schema = 'analytics_layer'
  AND table_name LIKE '%customer%';
-- v_customer_segment_old present, last modified 14 months ago
```

## Root Cause
An analytics engineer had created a personal view (`v_customer_segment_old`)
last year. A dashboard was accidentally bound to it (legacy workbook). The
metadata agent had flagged the view as **unowned/unregistered** in the catalog,
but nothing enforced "dashboards must bind to certified tables." The column
semantics had drifted since.

## Dashboard
"Catalog Governance" — unowned tables, stale views, dashboards bound to
uncertified sources, all in one governance dashboard (red = violation).

## Business Impact
- Business team lost a day chasing a phantom data bug.
- A stale view silently answered production questions for a year.

## Recommendation
1. **Certified-source enforcement**: dashboard certification requires the
   data source to be a CERTIFIED table/view; dashboard builds are checked in CI.
2. **Unowned table policy**: tables without owner for > 30 days get quarantined
   (permission `dataViewer` removed) → this flushed 60+ stale views.
3. **Catalog search first**: Tableau data-source names must resolve to the
   catalog entry; the "old" view was flagged and removed.
4. **Lineage on dashboards**: every certified dashboard has its lineage
   recorded, so "which source feeds this chart?" is one query.
