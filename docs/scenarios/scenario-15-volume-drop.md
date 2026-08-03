# Scenario 15 — Ops Event Volume Drop: Source Feed Down

**Severity:** P1 · **Domain:** Reliability

## Problem
The operations health dashboard showed an unusually *calm* day: event volume
was down 82%. The ops team almost enjoyed it — until they realized it meant
the streaming feed was dead, not that the systems were healthy.

## SQL Investigation
Step 1 — confirm the volume drop:

```sql
WITH vol AS (
  SELECT event_date, COUNT(*) AS events
  FROM `zumiq-prod.core_layer.fct_operations_events`
  GROUP BY 1
)
SELECT event_date, events,
       AVG(events) OVER (ORDER BY event_date ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING) AS baseline,
       ROUND(SAFE_DIVIDE(events, AVG(events) OVER (ORDER BY event_date
         ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)), 3) AS ratio
FROM vol
ORDER BY 1 DESC LIMIT 10;
-- Jul 14: 1.1M events → 198k (ratio 0.18)
```

Step 2 — is it all sources or one source?

```sql
SELECT source_system, COUNT(*) AS events
FROM `zumiq-prod.core_layer.fct_operations_events`
WHERE event_date IN ('2026-07-13','2026-07-14')
GROUP BY 1 ORDER BY 2 DESC;
-- GATEWAY events missing entirely on Jul 14 → that feed is down
```

Step 3 — correlate with pipeline runs (did the streaming sink fail?):

```sql
SELECT pipeline_name, status, run_date, error_message
FROM `zumiq-prod.ops.fct_pipeline_runs`
WHERE pipeline_name IN ('FCT_OPS_EVENTS_STREAM','OPS_SINK')
  AND run_date >= DATE '2026-07-13'
ORDER BY run_started_at;
-- OPS_SINK status = FAILED: 'Pub/Sub subscription has no pullers'
```

## Root Cause
The streaming worker (Dataflow) crashed during a deployment; the Pub/Sub
subscription had no active puller for ~5 hours, so messages were backlogged
(not lost, but 5h behind). Because *fewer events* looks like "a quiet day,"
the ops team didn't notice — no volume rule existed on the streaming table.

## Dashboard
"Event Volume Monitor" — per-source event counts vs trailing average with the
VOLUME drop flag (Q101/Q069). This incident turned it into a pager condition.

## Business Impact
- 5 hours of blind operations (real issues invisible because the feed was down).
- Near-miss: a production outage would have gone unnoticed.

## Recommendation
1. **VOLUME rule on streaming table**: < 60% of baseline → HIGH alert
   (pager). "Quiet" is now suspicious.
2. **Sink health check**: Dataflow worker liveness + Pub/Sub lag metrics feed
   the same alert (lag > 30 min → page).
3. **Backlog replay**: on recovery, replay Pub/Sub backlog automatically
   (events buffered, then backfilled to the same partitions).
4. **Deployment guard**: streaming deploys require a canary worker + volume
   check before scale-down.
