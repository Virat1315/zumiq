# Scenario 09 - Schema Drift Breaking Downstream Models

**Severity:** P1 · **Domain:** Schema / Lineage

## Problem
Overnight, the marketing attribution model started returning NULL conversion
values. The source team said "we just renamed a field." Nobody could find who
was affected until the marketing dashboard went blank.

## SQL Investigation
Step 1 - find columns in today's source that aren't in the catalog:

```sql
SELECT i.table_name, i.column_name, i.data_type
FROM `zumiq-prod`.INFORMATION_SCHEMA.COLUMNS AS i
LEFT JOIN `zumiq-prod.metadata.column_catalog` AS cc
  ON CONCAT(i.table_schema, '.', i.table_name) = cc.table_id
 AND i.column_name = cc.column_name
WHERE i.table_schema = 'raw_layer'
  AND cc.column_name IS NULL;
-- oms_orders_raw: 'conversion_attributed' → renamed to 'attributed_conversion'
```

Step 2 - use lineage to find every downstream consumer:

```sql
WITH RECURSIVE down AS (
  SELECT source_table, source_column, target_table, target_column, 0 AS depth
  FROM `zumiq-prod.metadata.lineage_edges`
  WHERE source_table = 'zumiq-prod.raw_layer.oms_orders_raw'
    AND source_column = 'conversion_attributed'
  UNION ALL
  SELECT e.source_table, e.source_column, e.target_table, e.target_column, d.depth+1
  FROM down AS d
  JOIN `zumiq-prod.metadata.lineage_edges` AS e
    ON e.source_table = d.target_table AND e.source_column = d.target_column
)
SELECT target_table, target_column, MAX(depth) AS depth
FROM down GROUP BY 1, 2;
-- attribution_model.feature_table and marketing_dashboard.bounce_view
```

Step 3 - confirm the pipeline failed on the missing column:

```sql
SELECT run_id, pipeline_name, status, error_message
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE target_table = 'staging_layer.stg_attribution'
ORDER BY run_started_at DESC LIMIT 3;
-- FAILED: 'Unrecognized name: conversion_attributed'
```

## Root Cause
The OMS team renamed a column with zero notification. No schema registry, no
drift detection, no lineage - downstream models failed one by one with no
early warning.

## Dashboard
"Schema Drift" - all columns in source not in catalog, plus affected
downstream (lineage walk). Green when 0 drift, red when a T1 is affected.

## Business Impact
- Marketing dashboard blank for a day → lost conversion visibility.
- Attribution model silently degraded → risk of misallocated spend.

## Recommendation
1. **Metadata agent drift scan** nightly (Q073): new/renamed columns →
   SCHEMA alert → page owners of affected consumers (from lineage).
2. **Schema registry + CI gate**: source schema changes must pass through a
   change-control step that runs impact analysis first.
3. **Alias preservation**: rename-aware ingestion (map old→new for 2 release
   cycles) to decouple consumers from source churn.
4. **Contract tests**: pipeline runs fail loudly (they did here), but now
   they also trigger the alert + notify all consumers from lineage.
