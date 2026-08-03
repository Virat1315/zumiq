# ZUMIQ - Star Schema & SCD Design

## 1. Star Schema

The business layer (`gold`) and semantic layer (`analytics`) expose classic star
schemas. Design rules:

1. **Facts hold measures + FKs only** - no descriptive text on a fact.
2. **Dims hold attributes only** - no measures.
3. **Every dim has exactly one "current" version** for a fact join (SCD2 guard).
4. **Surrogate keys everywhere** - natural keys live in the dims.

```
          dim_date          dim_region        dim_business_unit
             │                  │                    │
             └──────┐           │                    │
                    ▼           ▼                    ▼
               fct_transactions ──► dim_customer (SCD2)
                    │             ──► dim_account  (SCD2)
                    │             ──► dim_product  (SCD2)
                    │             ──► dim_channel
                    └──────► all FK hops are single joins
```

### Fact sizing & estimate
`fct_transactions` at ~200k rows/day × 365 = ~73M rows/year, ~9 GB/year
(current) growing to ~200M rows in 3 years. Partitioning by `txn_date` gives
~200k rows per partition - ideal for dashboard date filters.

## 2. Slowly Changing Dimensions

### Type 2 - history preserved (`dim_customer`, `dim_account`, `dim_product`)
- Insert new row when any SCD attribute changes; expire the old row
  (`valid_to = now`, `is_current = FALSE`).
- Change detection via `record_hash` (MD5) - no full-row comparison.
- Consumers join facts to **current** version by default; Finance uses
  **point-in-time** joins (as-of) for restatements.

```sql
-- Point-in-time (as-of) join pattern (see Q057):
JOIN dim_product p
  ON  t.product_key = p.product_key
  AND t.txn_timestamp >= p.valid_from
  AND (p.valid_to IS NULL OR t.txn_timestamp < p.valid_to)
```

### Type 1 - overwrite (`dim_region`, `dim_date`)
Used only for attributes that are corrections (no historical value): timezone,
sales org reassignment, holiday flags.

### Why not Type 0/Type 3/Type 4?
- **Type 0**: insufficient - customer attributes genuinely change.
- **Type 3** (previous-value columns): only for a single tracked change
  (e.g., "previous tier"), not general purpose.
- **Type 4** (mini-dims): overkill at this scale; BigQuery makes Type 2 cheap.

### SCD2 volume math
dim_customer 40k customers, ~1.5% change rate/month → ~600 new versions/month.
Negligible storage; the partitioning by `valid_from` keeps point-in-time
queries efficient.

## 3. Partitioning & Clustering (why these columns)

| Table | Partition | Cluster | Rationale |
|---|---|---|---|
| fct_transactions | txn_date | customer_key, region_key, account_key | Dashboards always filter by date; CX filters by customer; finance by region |
| fct_operations_events | event_date | source_system, event_type, service_name | Ops filters by system+type |
| fct_support_cases | opened_date | customer_key, case_type, priority | CX + SLA views |
| fct_employee_activity | activity_date | app_name, employee_key | Adoption analytics |
| ops.fct_pipeline_runs | run_date | pipeline_name, status | Freshness dashboard |
| cost.fct_query_cost | job_date | user_email, dataset_id | FinOps filters |
| governance.dq_run_results | run_date | table_id, dimension | DQ views |

**Rule of thumb:** partition on the always-filtered time column; cluster on the
next 2–3 most-filtered, high-cardinality keys. Never cluster on low-cardinality
columns (e.g., `status`) first - clustering shines on selectivity.

## 4. Time Partitions, Hour Granularity & the Streaming Table

`fct_operations_events` uses **day** partitions with a `event_timestamp`
column (not integer-range) - simplest, most compatible with the DQ engine and
MV. For sub-day analysis we truncate `event_timestamp` to HOUR at query time.
The streaming sink buffers ~1 min; the MV auto-refresh window handles the rest.

## 5. Conformed Dimensions (single source of truth)

There is exactly **one** `dim_customer`, one `dim_product`, etc. - shared by all
facts. This is what makes a "customer" or a "product" mean the same thing to
Retail, Banking, and Finance. Any team that wants a different customer view
must build on top of the conformed dim (never a parallel table).
