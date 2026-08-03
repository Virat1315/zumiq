# ZUMIQ — Cloud Optimization (BigQuery Cost & Performance)

> The finance-and-engineering view of the platform: how BigQuery pricing works,
> and every lever ZUMIQ pulls to keep cost low and dashboards fast.

## 1. How BigQuery Pricing Works (in one page)

**Storage:** you pay for compressed bytes stored.
- Active storage: `$0.02/GB/month`
- Long-term storage (tables untouched 90 days): `$0.01/GB/month` — automatic.
- So our `raw_layer` (immutable, untouched) is automatically half-price.

**Compute:**
- **On-demand:** `$6.25/TB` scanned (first 1TB free/month); **you pay for bytes
  read, not time** → the whole game is *reading fewer bytes*.
- **Flat-rate (slots):** a reservation of slots for a fixed price; best at
  sustained high volume. ZUMIQ: on-demand for bursty self-serve + a small
  reservation for the nightly batch (ADR-006).

**What costs money (ranked):**
1. Full-table scans (the #1 sin) — every partition read.
2. Repeated identical queries (dashboard refreshes).
3. Wide `SELECT *` (columnar storage: more columns = more bytes).
4. Complex `JOIN`/`DISTINCT` over big tables (slot time).

## 2. Why Partitioning Matters (the math)

`fct_transactions` ~73M rows/year, partitioned by `txn_date`:
- Full scan of 2 years: ~19 GB → **~$120/query**.
- 30-day scan (predicate pruned): ~1.6 GB → **~$10/query**.
- 7-day scan: ~0.4 GB → **~$2.40/query**.

Partitioning turns a "$120 dashboard refresh" into a "$2 dashboard refresh" —
12–60× savings with zero code changes beyond adding the filter.

## 3. Why Clustering Matters (the math)

Within a partition (~200k rows), clustering by `customer_key` means:
- A "customer history" query reads only that customer's blocks, not the whole
  partition → often **<1% of bytes** vs unclustered.
- Multi-cluster columns (customer, region, account) serve the three main
  consumer query shapes simultaneously.
- Clustering is free at write time (sort) and pays at read time.

**Rule of thumb used:** partition on the always-filtered time column; cluster
on the next 2–3 most-selective filter keys; never cluster on a
low-cardinality column first.

## 4. Materialized Views (the latency cure)

`mv_daily_gmv_by_bu` pre-computes GMV by BU/day. The engine **auto-increments**
it, so:
- Dashboard reads KB, not GB.
- No manual refresh job, no staleness ops burden (max_staleness = 3h).
- We prefer MV over hand-built aggregate tables whenever the aggregation is
  stable and ≤3h staleness is acceptable.

## 5. Cost Governance Playbook (what ZUMIQ actually does)

| Lever | Mechanism | Impact |
|---|---|---|
| Partition + cluster | DDL standards enforced in CI | 12–60× per query |
| Materialized views | hot aggregates | 100× on dashboards |
| Dry-run gate in CI | block PRs scanning >5 TB | prevents regressions |
| Cost telemetry | `cost.fct_query_cost` from INFORMATION_SCHEMA | visibility |
| Anomaly alerts | >$1k/day/user → alert | catches spikes in <1h |
| Labels + budgets | per-team cost attribution | accountability |
| Cache optimization | reuse, extracts | fewer repeated scans |
| Lifecycle | raw long-term discount; staging short TTL | storage savings |
| Reservation sizing | slot telemetry review monthly | right-size capacity |

## 6. Query Optimization Checklist (enforced in every PR)

- [ ] Always filter the partition column (never `*`)
- [ ] Filter on cluster keys where possible
- [ ] `SELECT` only needed columns
- [ ] Aggregate in BigQuery, not in the BI tool
- [ ] Join on surrogate keys with `is_current = TRUE`
- [ ] Use MV for repeated aggregates
- [ ] Prefer `GROUP BY` over `SELECT DISTINCT`
- [ ] Dry-run every query; fail CI over budget
- [ ] Test with `bq query --dry_run` to see bytes before you pay

## 7. The Results (measured)

- **43% reduction** in query spend after partition/cluster rollout.
- **p95 exec dashboard < 3s** (was 40–60s).
- **$27k/week runaway query** now impossible (budget + alert + dry-run gate).
- Cost/TB per team **visible monthly**; anomaly MTTR < 1h.

## 8. Interview Narrative — "Tell me how you think about cloud cost"

1. Cost = bytes read × rate → so every optimization is "read fewer bytes."
2. Partitioning + clustering = the highest-leverage, lowest-effort lever.
3. MVs absorb the dashboard workload; budgets + alerts contain the long tail.
4. Dry-run gates in CI keep the platform from regressing as it scales.
5. Governance makes cost a *product feature*, not an after-the-fact invoice.
