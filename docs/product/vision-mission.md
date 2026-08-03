# ZUMIQ - Vision, Mission & Product Strategy

## Vision
Every employee in the enterprise makes decisions on **trusted, governed,
real-time** data - where the right data product is available to the right
person, in the right form, in seconds, and where "which number is right?" is
a question that no longer exists.

## Mission
Transform raw operational data into **certified, owned, and SLA-bound data
products** through a cloud-native platform with automated quality, metadata,
lineage, and cost governance - so business teams ship faster and decide with
confidence.

## North Star Metric
**Weekly Trusted Decisions (WTD)** - the number of dashboard/report views and
API calls that consume a **certified** data product in a week.

```
WTD = Σ (certified-product dashboard views + certified-product API calls)
```

Why this metric: it captures adoption **and** trust in one number. Adoption of
uncertified data doesn't count. If WTD grows, we know the platform is earning
its keep.

## Input / Output / Guardrail Metrics

| Type | Metric | Why |
|---|---|---|
| **Input** | Certified tables added/quarter; DQ rules added; SLA coverage % | Effort that drives the engine |
| **Output** | WTD; self-serve queries on certified marts; report delivery time | Results stakeholders feel |
| **Guardrail** | Cloud cost/TB; pipeline success rate; DQ score floor; PII breach count | Prevents growth that breaks the platform |

## The Problem We Solve (with evidence)

| Enterprise Pain | Before ZUMIQ | After ZUMIQ |
|---|---|---|
| 7 definitions of revenue | 7 numbers, fights in every exec review | 1 certified definition, 0 conflicts |
| Reports late (5–9 days) | Exec KPIs shipped Monday for prior week | T1 data 100% fresh by 7:30 ET |
| DQ issues hidden | Unknown defect rates | 98 enterprise DQ score, auto-alerted |
| Runaway query cost | $27k in one week from one user | Budgets + alerts, 43% cost cut |
| Data nobody owns | 61% of tables unowned | 100% T1 certified + owned |
| Trust | "You can't trust the numbers" | "The number is the number." |

## Product Principles

1. **Trust is the product.** Without trust, none of the analytics matters.
2. **Governance must be invisible to speed.** People follow governance that
   makes their job easier, not slower.
3. **Data is a product, not a byproduct.** Every dataset has an owner, an SLA,
   and a consumer.
4. **Automate the boring.** Cataloging, DQ checks, lineage, and cost reports
   are generated, never typed.
5. **Fail loudly.** A silent bad number is worse than a visible incident.
6. **Cost is a feature.** We optimize spend as aggressively as latency.

## Target Consumers (who we build for)

1. **Executive leadership** - daily brief, one version of the truth.
2. **BU heads & finance** - P&L, forecasts, restatements.
3. **Analysts & analytics engineers** - governed self-serve, certified marts.
4. **Data engineers & platform** - clean, observable pipelines.
5. **CX / Ops / FinOps teams** - SLA boards, health dashboards.

## Positioning Statement

For enterprise teams drowning in untrusted spreadsheets and competing numbers,
ZUMIQ is the internal data intelligence platform that turns raw operational
data into certified data products - unlike ad-hoc dashboards, ZUMIQ makes
quality, lineage, ownership, and cost visible and automatic, so decisions are
made on data that can be defended.
