# Scenario 18 — Stale Tableau Extracts Causing Report Mismatch

**Severity:** P2 · **Domain:** BI

## Problem
The weekly BU review showed June revenue that didn't match the finance
dashboard from the same morning. Both "should" be the same number. The gap:
one used a Tableau extract that was 3 days old.

## SQL Investigation
Step 1 — check extract freshness vs the certified view:

```sql
SELECT resource_name,
       MAX(activity_date) AS last_viewed,
       COUNTIF(activity_type = 'DASHBOARD_VIEW') AS views
FROM `zumiq-prod.core_layer.fct_employee_activity`
WHERE app_name = 'Tableau' AND resource_name LIKE '%BU Review%'
GROUP BY 1;
-- BU Review viewed daily (people trust it), so it LOOKS current
```

Step 2 — check the underlying table's last load vs extract refresh:

```sql
SELECT target_table, MAX(run_finished_at) AS last_load
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE status = 'SUCCESS'
  AND target_table IN ('gold_layer.kpi_executive_daily','analytics_layer.v_executive_daily')
GROUP BY 1;
-- Gold KPIs refreshed 07:00 daily. But the BU workbook's extract schedule is
-- WEEKLY (Mon) → Tue–Sun the extract is stale.
```

Step 3 — confirm the mismatch numerically:

```sql
SELECT metric_date,
       (SELECT SUM(gmv_usd) FROM `zumiq-prod.gold_layer.kpi_executive_daily`
        WHERE metric_date = d.metric_date AND bu_code='RTL') AS certified,
       -- extract total read from the workbook (would come from refresh log)
       9_815_300 AS extract_total
FROM (SELECT DATE '2026-06-30' AS metric_date) d;
-- certified = 12.4M · extract = 9.8M → stale extract explains the gap
```

## Root Cause
Tableau workbooks were published with **extract** (full refresh) on a weekly
schedule, but the source data refreshes daily. "Certified dashboard" status
didn't enforce extract refresh cadence. A dashboard that *looks* fresh can
serve stale data.

## Dashboard
"BI Freshness & Adoption" — per-workbook: extract refresh time, source last
load, staleness gap, and viewer count. Red = extract older than source SLA.

## Business Impact
- Execs compared two "June revenue" numbers for a day before someone asked.
- Same trust erosion class as scenario 01 — a governance gap, not a math bug.

## Recommendation
1. **Extract policy**: certified workbooks must refresh ≥ source cadence
   (daily sources → daily extracts at 07:15).
2. **Certified-source enforcement** (from scenario 07): workbook builds in CI
   check data source + refresh cadence before publish.
3. **Staleness badge**: any dashboard whose extract is older than its source
   SLA shows a red "STALE" badge automatically.
4. **BI freshness alert**: weekly scan of workbook freshness → owners paged
   for stale certified workbooks.
