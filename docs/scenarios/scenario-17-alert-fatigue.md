# Scenario 17 - DQ Alert Fatigue: False Positives

**Severity:** P2 · **Domain:** DQ / Ops

## Problem
The DQ engine raised 40+ alerts in one week - engineers started ignoring them.
Then a *real* failure happened and nobody noticed for 36 hours. The trust the
DQ engine was built to create was being destroyed by its own noise.

## SQL Investigation
Step 1 - measure the noise: which rules fail but are false positives?

```sql
SELECT rule_id, table_id, COUNT(*) AS failures
FROM `zumiq-prod.governance.dq_run_results`
WHERE status = 'FAIL'
  AND run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15;
```

Step 2 - dig into the worst offender (what "failed" really means):

```sql
SELECT run_date, observed_value, expected_value, rows_checked, rows_failed,
       sample_of_failures
FROM `zumiq-prod.governance.dq_run_results`
WHERE rule_id = 'DQ-TXN-007'   -- freshness rule
  AND run_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY run_date;
-- Freshness rule threshold was wrong: 24h was too tight for a weekly table
```

Step 3 - analyze alert acknowledgment rate (are they being actioned?):

```sql
SELECT alert_type, COUNT(*) AS alerts,
       COUNTIF(acknowledged_at IS NOT NULL) AS acked,
       ROUND(100 * SAFE_DIVIDE(COUNTIF(acknowledged_at IS NOT NULL), COUNT(*)),0) AS ack_pct
FROM `zumiq-prod.ops.alert_history`
WHERE triggered_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1 ORDER BY 2 DESC;
-- ack_pct = 38% → engineers stopped reading them
```

## Root Cause
Rules shipped with default thresholds that didn't match reality (weekly tables
with daily freshness SLAs; WARNING thresholds too tight). The severity model
wasn't applied: 60% of alerts were MEDIUM/LOW noise. Alert fatigue is an
operations tax - real failures get drowned.

## Dashboard
"DQ Alert Precision" - alert volume by severity/rule, acknowledgment rate,
false-positive rate, and MTTR. The goal: < 10 alerts/week with > 90% actioned.

## Business Impact
- 36-hour blind window on a real DQ failure (fraud-adjacent anomaly unseen).
- Engineer time burned on noise (~15h/week).
- Trust in the platform's alarms eroded.

## Recommendation
1. **Threshold tuning pass**: every rule's threshold reviewed against 30 days
   of history; SLAs set per table (weekly table ≠ 24h freshness).
2. **Severity discipline**: only ERROR → page. WARNING → dashboard only.
   INFO → log only. Cut noise by 70%.
3. **Acknowledgement SLA**: unacked HIGH alerts escalate after 30 min.
4. **Precision metric tracked**: false-positive rate per rule; rules > 50% FP
   are quarantined and re-tuned.
