# Scenario 08 - Customer Service Degradation (SLA Breaches)

**Severity:** P1 · **Domain:** Customer Experience

## Problem
Customer service SLAs were silently degrading: P1 SLA attainment fell from
97% to 71% over two weeks. Execs found out from a customer complaint, not the
SLA board - the board had a data bug that made it look healthy.

## SQL Investigation
Step 1 - compute SLA attainment honestly by priority:

```sql
SELECT
  priority,
  COUNT(*) AS total,
  COUNTIF(status IN ('CLOSED','RESOLVED') AND resolved_at <= sla_due_at) AS met_sla,
  ROUND(100 * SAFE_DIVIDE(
    COUNTIF(status IN ('CLOSED','RESOLVED') AND resolved_at <= sla_due_at),
    COUNT(*)), 1) AS attainment_pct
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY 1 ORDER BY 1;
-- P1 attainment = 71% (target 98%)
```

Step 2 - why? Look at queue shape and aging:

```sql
SELECT
  CASE WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, DAY) < 1 THEN '0-1d'
       WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, DAY) < 3 THEN '1-3d'
       ELSE '3+d' END AS age_bucket,
  COUNT(*) AS open_cases
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE status IN ('OPEN','IN_PROGRESS')
GROUP BY 1 ORDER BY 1;
-- 41% of open P1s are > 3 days old → severe backlog
```

Step 3 - is the board buggy or is the data buggy? Compare to certified metric:

```sql
-- Board used "closed" status only, ignoring "resolved not yet closed":
SELECT ROUND(100 * SAFE_DIVIDE(
  COUNTIF(status = 'CLOSED' AND closed_at <= sla_due_at), COUNT(*)), 1) AS board_number
FROM `zumiq-prod.core_layer.fct_support_cases`
WHERE opened_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY);
-- 98% → board looked FINE because it only counted fully-closed cases
```

## Root Cause
**Two problems:** (1) a real staffing/priority inversion backlog, and (2) the
SLA board counted only `status = 'CLOSED'`, so slow-but-not-closed cases were
invisible. The dashboard's metric was never certified against the glossary -
exactly the semantic-drift failure the platform exists to kill.

## Dashboard
"Support SLA Board" (certified) - attainment by priority vs target, open-case
aging, escalation rate, CSAT. The uncertified board was retired.

## Business Impact
- Customer escalations doubled; one enterprise account at risk.
- Executive visibility gap: the board said 98%, reality was 71%.

## Recommendation
1. **Certify SLA Attainment** in the glossary (formula: `resolved ≤ sla_due`
   across CLOSED and RESOLVED); all boards must use it.
2. **Add a DQ CONSISTENCY check** comparing any dashboard total to the
   certified view total daily.
3. **Prioritization fix**: P1 reassignment policy + staffing review (ops action).
4. **Predictive alerting**: SLA breach forecaster (Q083) flags a priority
   heading toward violation before the week ends.
