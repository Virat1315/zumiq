# ZUMIQ — Product Analytics Framework

> The north star and the metric hierarchy that turns the platform into a
> product. Everything here is measurable from `fct_employee_activity`,
> `cost.fct_query_cost`, `governance.dq_health_daily`, and the certified views.

## 1. North Star Metric

**Weekly Trusted Decisions (WTD)** — the number of dashboard/report views and
API calls that consume a **certified** data product in a week.

```
WTD = Σ (certified dashboard views + certified data-product API calls) / week
```

**Why this is the north star:**
- Captures **adoption** (people using it) and **trust** (certified only) at once.
- If WTD grows, the platform is earning its keep; if it stalls, we have a
  product problem (scenario 19 proved this).
- It's measurable daily, forward-looking, and correlates with the guardrails.

## 2. Metric Hierarchy

```
              Weekly Trusted Decisions (North Star)
                          │
        ┌─────────────────┼─────────────────────┐
        │                 │                     │
  Adoption            Trust                Value
  (input/output)      (guardrail)          (business)
        │                 │                     │
  · WAU (analysts)    · DQ score           · Report age
  · dashboards used   · freshness SLA      · time-to-answer
  · self-serve query  · cost/TB            · restatement count
  · certified coverage· pipeline success   · exec KPI disputes
```

## 3. KPI Tiers

### Executive KPIs (daily)
GMV, Net Revenue, Gross Margin, Active Customers, AOV, DQ Score, Freshness.

### Business KPIs (daily)
Per-BU: revenue, margin, refund/chargeback rate, SLA attainment, CSAT, error rate.

### Operational KPIs (real-time/hourly)
Event volume, error rate by service, p95 latency, pipeline success, queue depth.

### Platform KPIs (daily)
Pipeline success rate, DQ score, freshness compliance, MTTR, cost/TB, alert volume.

### Data Product KPIs (per product)
DQ score, SLA attainment, certified coverage, consumers count, WTD contribution.

## 4. Adoption Funnel (ZUMIQ's own)

```
Sign-up → First query → Weekly active → Daily active → Certified-only → Champion
  ↑         ↑             ↑               ↑                ↑              ↑
60%       45%           22%            12%              8%             3%
```
Bottleneck historically: **first query → weekly active** (scenario 19). We
attack it with onboarding, discoverability, and champions.

## 5. Dashboards We Run on Ourselves

| Dashboard | Question | Metric |
|---|---|---|
| Adoption | Are analysts coming back? | WAU, WTD trend |
| Mart Health | Which marts are used/stale? | views, last-viewed |
| Query Economy | Are we optimizing? | cache hit, redundant queries |
| Guardrails | Are we still trustworthy? | DQ, freshness, cost, MTTR |
| Certification | Is coverage growing? | certified T1 % |

## 6. Experimentation Loop (evidence-based PM)

1. **Observe** (dashboards) → 2. **Hypothesize** (product + analytics) →
3. **Experiment** (e.g., DQ badge) → 4. **Measure** (WTD, adoption) →
5. **Decide** (ship / kill / iterate).

Recorded experiments: see risk-register-success-metrics.md §4.

## 7. Guardrails (non-negotiable, even when north star grows)

| Guardrail | Threshold | Owner |
|---|---|---|
| Cost / TB processed | ≤ $6.0 | FinOps |
| Pipeline success (30d) | ≥ 99.9% | Platform |
| Enterprise DQ score | ≥ 95 | DQ |
| PII breach count | 0 | Security |
| Alert MTTR (HIGH) | < 4h | Platform |
