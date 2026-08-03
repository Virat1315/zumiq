# ZUMIQ — Data Quality Framework

> The automated DQ engine: 9 dimensions, enterprise scoring, root-cause
> analysis, and automatic recommendations. Code lives in `bigquery/quality/`
> and `python/dq_engine/`.

## 1. Why DQ is a Product, Not a Ticket

Data quality defects were costing the enterprise millions (duplicate payments,
restated P&L, stale dashboards) and destroying stakeholder trust. ZUMIQ made
quality **measurable, scored, and alertable** — visible to every data product
consumer like a service-health uptime page.

## 2. The 9 DQ Dimensions

| Dimension | Detects | Example rule | Severity |
|---|---|---|---|
| COMPLETENESS | Missing values / nulls | `customer_key IS NULL` rate | ERROR |
| UNIQUENESS | Duplicates / PK violations | txn_id appears >1 | ERROR |
| VALIDITY | Values outside domain / bad format | txn_type not in list | ERROR |
| TIMELINESS | Late-arriving data | posted after cutoff | WARNING |
| ACCURACY | Outliers / wrong values | >5σ transaction | WARNING |
| CONSISTENCY | Conflicting values across tables | fact vs aggregate mismatch | ERROR |
| INTEGRITY | FK violations / orphans | orphan customer_key | ERROR |
| FRESHNESS | Stale partitions vs SLA | newest partition age > SLA | ERROR |
| VOLUME | Row-count drops/surges | <50% of trailing avg | WARNING |

## 3. Engine Architecture

```
  governance.dq_rules ──► dq_engine.py ──► renders dimension SQL ──► BigQuery
        (config)               │                                          │
                               │                                  result rows
                               ▼                                          ▼
                        scoring (severity-weighted)          governance.dq_run_results
                               │                                          │
                               ▼                                          │
                   governance.dq_health_daily ◄───────────────────────────┘
                               │
                               ▼
            ops.alert_history  (score < floor → HIGH alert)
```

- **Rule catalog** = the config; adding a rule is a one-line insert, no code.
- **Every execution is append-only and auditable** (`dq_run_results` stores the
  exact SQL + observed vs expected + failure samples).
- **Scores are severity-weighted**: ERROR failures hurt the score 10× more than
  INFO, so the number reflects *business risk*, not raw pass counts.

## 4. Scoring Model

```
Per-table score  = 100 × (1 − Σ severity_w × failure_rate / Σ severity_w)
Enterprise score = rows-weighted average across certified tables

severity weights: ERROR=1.0, WARNING=0.5, INFO=0.1
```

## 5. Enterprise Scorecard (the executive number)

| Quarter | Enterprise DQ Score | T1 Tables ≥95 | Open DQ Alerts | Data-related support cases |
|---|---|---|---|---|
| Pre-ZUMIQ | 82 | 34% | (none tracked) | 1,180/mo |
| Q1 | 91 | 68% | 41 | 640/mo |
| Q2 | 96 | 92% | 12 | 310/mo |
| Q3 | 98 | 100% | 4 | 140/mo |

## 6. Root-Cause Analysis Workflow

When a check fails, the engine stores **failure samples** (up to 5 rows) and
the DQ analyst walks the standard RCA:

1. Is it **source** (bad data upstream)? → raise vendor/system ticket, quarantine.
2. Is it **pipeline** (lost/duplicated)? → fix ETL, reprocess partition.
3. Is it **schema drift** (column changed)? → metadata agent already alerted;
   update catalog + mapping.
4. Is it **semantic** (definition changed)? → glossary change control, version bump.

Each RCA ends with an **automatic recommendation** written to the alert:
add a check, tighten a threshold, or fix the mapping — tracked to closure.

## 7. Automatic Recommendations (examples)

| Finding | Recommended action |
|---|---|
| Duplicate txn_id from OMS feed | Add `dedup_key` window in staging; alert on rate >0 |
| Null spike in customer.email | Verify CRM sync; block RESTRICTED load until fixed |
| Freshness breach > SLA on fct_transactions | Page platform on-call; add SLA to `table_catalog` |
| Volume drop >50% | Check source feed; run reconciliation query |
| Fact-vs-aggregate mismatch | Recompute `kpi_executive_daily` (stored proc) |
| Orphan FKs rising | Quarantine load; fix surrogate mapping |

## 8. DQ as a Promotion Gate

A certified data product **cannot be updated** unless the DQ suite passes
(ERROR-level checks). This single rule eliminated "we knew it was wrong but
published anyway" — the failure mode that destroyed trust originally.

## 9. Key SQL & Code Artifacts

| Artifact | Purpose |
|---|---|
| `bigquery/quality/seed_rules.sql` | Bootstraps the rule catalog |
| `python/dq_engine/dq_engine.py` | Orchestrator: render → run → score → alert |
| `sql/09_data_quality_sql.sql` | The Q096–Q105 rule patterns, documented |
| `governance.dq_health_daily` | Daily scores per product + enterprise |
| `ops.alert_history` | Alert queue + MTTR |
