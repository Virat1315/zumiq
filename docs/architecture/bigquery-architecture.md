# ZUMIQ - BigQuery Architecture & Optimization

> Why the warehouse is built the way it is, and how every decision maps to
> cost, performance, and governance. This document is the "how I think about
> BigQuery" reference for interviews and reviews.

## 1. BigQuery Mental Model (as we use it)

BigQuery is a **serverless, columnar, massively parallel warehouse**:
- You pay for **storage** (long-term, compressed) + **compute** (on-demand
  $/TB scanned, or flat-rate slot reservations).
- **Query cost ≈ bytes read × rate** → the entire optimization playbook is
  "read fewer bytes" via partitioning, clustering, MVs, and view discipline.
- Storage for tables older than 90 days is automatically **50% cheaper**
  (long-term storage) - relevant when deciding data lifecycle.

## 2. Where We Spend (and how we cut it)

| Pattern | % of spend | Fix |
|---|---|---|
| Dashboard queries scanning whole tables | ~40% | Partitioning, clustering, MVs |
| Ad-hoc full scans by analysts | ~25% | Cost budgets + dry-run in BI + guardrails |
| Repetitive identical queries | ~15% | Materialized views, Tableau extracts |
| Streaming inserts | ~10% | Batching, sink tuning |
| Export/ETL | ~10% | Partition-scoped EL only |

Real result: **43% reduction** in query spend after partitioning+clustering
across the certified facts (scenario 05 in /scenarios).

## 3. Partitioning - Why It Matters

A daily partition of `fct_transactions` is ~200k rows (~25 MB). A dashboard
filtering `last 30 days` reads **30 partitions, not the whole table**.
- **Query cost** drops ~12× for a 30-day view vs full scan.
- **Predicate pruning** at the storage layer happens *before* scanning.
- **MERGE/delete** on a partition is cheap and metadata-only-ish.

**Rule:** partition on the column that every query filters on (always a date).

## 4. Clustering - Why It Matters

Clustering sorts rows on disk by the cluster columns so that *within* a
partition, filters on cluster keys skip blocks:
- `CLUSTER BY customer_key` → "give me this customer's history" reads a
  fraction of the partition.
- Works best on **high-cardinality** filter keys (customer, product, user).
- Multiple cluster columns are ordered: lead with the most selective.

**Anti-pattern to call out:** clustering on `status` (2 distinct values) buys
almost nothing. Our `fct_pipeline_runs` clusters by `pipeline_name, status`
only because pipeline_name is selective.

## 5. Materialized Views - The Latency Cure

`mv_daily_gmv_by_bu` pre-aggregates GMV by BU/day and the engine **auto-
increments it** as base partitions land. Dashboard reads KB instead of GB,
with a bounded staleness (3h). We choose MV over manual aggregate tables when:
- The aggregation is stable (same group-by/measures for weeks).
- Staleness ≤ 3–4h is acceptable.
- Base table is partitioned (required for incremental MV).

## 6. Cost Governance Tooling

1. **Labels everywhere** (dataset, table, query) → billing attribution by team.
2. **`cost.fct_query_cost`** from `INFORMATION_SCHEMA.JOBS_BY_PROJECT` - the
   single source for FinOps dashboards and anomaly alerts.
3. **Dry-run** (`--dry_run`) in CI blocks PRs that scan > X TB.
4. **On-demand → flat-rate** decision: at >$X/month steady load, a reservation
   with auto-scaling is cheaper (our ~$14k/day case in scenario 05).
5. **Slot usage telemetry** right-sizes reservations (peak vs idle).

## 7. Query Optimization Checklist (used in every PR)

- [ ] Date filter on the partition column - never `*`
- [ ] Filter on cluster keys where possible
- [ ] `SELECT` only needed columns (columnar! fewer bytes)
- [ ] Aggregations pushed to BigQuery (no client-side loops)
- [ ] Joins on surrogate keys, dims filtered to `is_current = TRUE`
- [ ] Use MVs for repeated aggregates
- [ ] Avoid `SELECT DISTINCT` over big scans; use GROUP BY
- [ ] Prefer `INNER JOIN` over `LEFT` where semantics allow
- [ ] Use `QUALIFY` over nested subquery for top-N
- [ ] Dry-run every query in CI; alert on > threshold

## 8. The Data Lifecycle

| Layer | Retention | Policy |
|---|---|---|
| Landing | 7 days | delete files after staging success |
| Raw | 2 years | immutable; long-term storage discount applies |
| Staging | 14 days | scrub after core load |
| Core facts | 7 years | compliance/restatement; partition-scoped |
| Gold/analytics | 7 years | certified marts, as-of joins |
| Telemetry (ops/cost/dq) | 13 months | FinOps + audit |

## 9. Common Interview Questions This Answers

- "Why partition and cluster?" → bytes read = money + latency.
- "Why materialized views over aggregate tables?" → auto-maintenance, freshness.
- "How do you control cloud cost?" → labels, budgets, dry-run CI, anomaly alerts.
- "How do you handle restatements?" → as-of SCD2 joins + versioned marts.
- "How would you scale this to 10× volume?" → same patterns, more slots;
  partition/CLUSTER keys still bound per-query scan; MVs absorb dashboard load.
