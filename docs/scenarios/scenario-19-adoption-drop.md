# Scenario 19 — ZUMIQ Self-Serve Adoption Drop

**Severity:** P2 · **Domain:** Product Analytics

## Problem
The platform is technically healthy (DQ 98, dashboards fast) — but analysts'
weekly self-serve queries fell 38% over a month. The Data PM had a "healthy
system, dying product" warning. Why did people stop using it?

## SQL Investigation
Step 1 — confirm the adoption drop by activity type:

```sql
SELECT DATE_TRUNC(activity_date, WEEK(MONDAY)) AS week_start,
       COUNT(DISTINCT employee_key) AS active_users,
       COUNTIF(activity_type = 'QUERY') AS queries,
       COUNTIF(activity_type = 'DASHBOARD_VIEW') AS views
FROM `zumiq-prod.core_layer.fct_employee_activity`
WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK)
GROUP BY 1 ORDER BY 1;
-- Queries down 38%; views flat; active users down 22%
```

Step 2 — which dashboards/tables got abandoned (staleness)?

```sql
SELECT resource_name,
       COUNT(DISTINCT employee_key) AS viewers,
       MAX(activity_date) AS last_viewed,
       IF(MAX(activity_date) < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY),
          'STALE', 'ACTIVE') AS status
FROM `zumiq-prod.core_layer.fct_employee_activity`
WHERE app_name = 'Tableau'
GROUP BY 1 ORDER BY 3 DESC;
-- Three "self-serve" marts never queried in 30 days
```

Step 3 — is the drop driven by specific teams (segmentation)?

```sql
SELECT e.department, COUNT(DISTINCT a.employee_key) AS users,
       COUNTIF(a.activity_type = 'QUERY') AS queries
FROM `zumiq-prod.core_layer.fct_employee_activity` AS a
JOIN `zumiq-prod.core_layer.dim_employee` AS e
  ON a.employee_key = e.employee_key
WHERE a.activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 4 WEEK)
GROUP BY 1 ORDER BY 3 DESC;
-- Marketing analysts dropped 80% → they reverted to spreadsheets
```

## Root Cause
The platform shipped *technical* features (DQ, cost) but the **self-serve
experience** stalled: catalog search was slow, three marts were undocumented,
and the certification badge was confusing. Interviews (yes, we talked to users)
revealed analysts didn't trust/didn't know how to use the new self-serve flow
and went back to their spreadsheets. Adoption is a product problem, not a
technology problem.

## Dashboard
"Product Adoption" — weekly active users, queries, dashboard views, stale
dashboards, by team. This is the platform's own north-star tracker (WTD).

## Business Impact
- 38% fewer queries → analysts slower, answers inconsistent again.
- Platform ROI questioned even though KPIs were green.

## Recommendation
1. **Talk to users**: 12 analyst interviews → found the friction (search,
   docs, trust). This is the product move: adoption data pointed, interviews
   confirmed.
2. **Fix discoverability**: catalog search on business terms; every certified
   mart links its glossary + lineage + example queries.
3. **Onboarding**: "first query in 5 minutes" for new analysts; champions in
   each BU.
4. **WTD metric now tracked weekly** — the north star makes adoption regressions
   visible in days, not months.
