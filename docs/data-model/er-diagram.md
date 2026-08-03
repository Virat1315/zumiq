# ZUMIQ - Entity Relationship Diagram (ERD)

> **Layer:** Core / Gold (conformed star schema) · **Engine:** BigQuery · **Fiscal calendar:** Feb 1 start
>
> Notation: `PK` primary key · `FK` foreign key · `*` NOT NULL · dims are SCD Type 2 where noted.

## 1. Canonical ERD - Core Layer

```
                            ┌──────────────────────────┐
                            │       dim_date          │
                            │ PK date_key             │
                            └───────────┬──────────────┘
                                        │
┌─────────────────┐      ┌──────────────┴───────────────┐
│   dim_region    │      │       dim_business_unit      │
│ PK region_key   │      │ PK bu_key                    │
└────────┬────────┘      └──────────────┬───────────────┘
         │                              │
┌────────┴────────┐      ┌──────────────┴───────────────┐
│ dim_customer ▲  │      │        dim_channel            │
│ PK customer_key │      │ PK channel_key                │
│ (SCD2)          │      └──────────────┬───────────────┘
└────────┬────────┘                     │
         │                              │
         ▼                              │
┌───────────────────────────────────────┴──────────────────────────────┐
│                     fct_transactions (fact)                          │
│ PK txn_key                                                           │
│ FK customer_key ──► dim_customer · FK account_key ──► dim_account    │
│ FK product_key  ──► dim_product  · FK channel_key ──► dim_channel    │
│ FK region_key   ──► dim_region   · FK bu_key  ──────► dim_business_unit│
│ FK txn_date     ──► dim_date                                        │
│ PARTITION BY txn_date · CLUSTER BY customer_key, region_key          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   dim_account   │   ┌──────────────────┐    ┌──────────────────┐
│ PK account_key  │──►│   dim_customer   │◄───│ FK customer_key  │
│ (SCD2)          │   │   (SCD2)         │    │   fct_support_cases │
└─────────────────┘   └──────────────────┘    └──────────────────┘

┌──────────────────────────────────┐    ┌───────────────────────────────┐
│   fct_operations_events (fact)   │    │   fct_support_cases (fact)    │
│ PK event_id                      │    │ PK case_id                    │
│ FK region_key · FK bu_key        │    │ FK customer_key · FK region_key│
│ PARTITION BY event_date          │    │ FK bu_key · FK assignee_employee_key
│ CLUSTER BY source_system,type    │    │ PARTITION BY opened_date       │
└──────────────────────────────────┘    └───────────────────────────────┘

┌────────────────────────────────────────────┐
│            dim_employee                    │
│ PK employee_key ──► manager_employee_key   │   (self-referencing hierarchy)
└────────────────────────────────────────────┘
```

## 2. Platform Telemetry (ops / cost / governance) ERD

```
┌──────────────────────────┐      ┌───────────────────────────────┐
│  ops.fct_pipeline_runs   │      │   cost.fct_query_cost          │
│ PK run_id                │      │ PK job_id                      │
│ FK target_table ──► metadata.table_catalog                       │
│ PARTITION BY run_date    │      │ PARTITION BY job_date          │
│ CLUSTER BY pipeline,status│     │ CLUSTER BY user_email, dataset │
└──────────────────────────┘      └───────────────────────────────┘

┌───────────────────────────────┐    ┌───────────────────────────────┐
│  metadata.table_catalog       │    │  metadata.column_catalog      │
│  PK table_id                  │───►│  PK (table_id, column_name)   │
│  1 : N columns                │    │  sensitivity / pii_flag / dq  │
└───────────────────────────────┘    └───────────────────────────────┘
        ▲
        │ 1:N target_table
┌───────┴─────────────┐     ┌────────────────────────────┐
│ metadata.lineage_edges │   │  metadata.business_glossary │
│ source ──► target      │   │  PK term_id · status CERTIFIED
└───────────────────────┘     └────────────────────────────┘

┌───────────────────────────────┐    ┌───────────────────────────────┐
│  governance.dq_rules          │    │  governance.dq_run_results    │
│  PK rule_id                   │───►│  PK (run_id, rule_id)         │
│  1 : N executions             │    │  PARTITION BY run_date        │
└───────────────────────────────┘    └───────────────────────────────┘
                                              │
                                              ▼
                                   ┌─────────────────────────────┐
                                   │ governance.dq_health_daily  │
                                   │ PK (score_date, table_id)   │
                                   │ PARTITION BY score_date     │
                                   └─────────────────────────────┘
```

## 3. Star vs Snowflake - Where Each Is Used

| Pattern | Used For | Tables | Why |
|---|---|---|---|
| **Star** | Executive & operational reporting | `fct_transactions` + dims | Denormalized dims → single-hop joins, fastest dashboards |
| **Star** | CX & support | `fct_support_cases` + dims | Same rationale |
| **Snowflake** (normalized) | Master data domain (rare, deliberate) | `dim_region` → `dim_business_unit` | Only where a dimension itself has real hierarchy; kept 2 levels max |
| **Snowflake** (dimension hierarchy) | Org analytics | `dim_employee` self-ref | Self-referencing management chain (query with recursive CTE) |

**Decision record:** The warehouse is star-first. Snowflake is used **only**
where a dimension genuinely needs its own conformed sub-dimension. Rationale:
every snowflake hop adds a join and a failure mode in the BI layer, and
modern BigQuery clustering makes wide dims cheap.

## 4. Grain Statements (the contract that prevents double counting)

| Table | Grain | Guard |
|---|---|---|
| `fct_transactions` | 1 row per posted transaction (txn_id unique) | Dedup key = txn_id + txn_date + customer_key |
| `fct_operations_events` | 1 row per operational event (event_id unique) | Event dedup window 15 min |
| `fct_support_cases` | 1 row per support case (case_number unique) | One case per case_number |
| `fct_employee_activity` | 1 row per platform interaction | activity_id unique |
| `ops.fct_pipeline_runs` | 1 row per pipeline execution | run_id unique |
| `cost.fct_query_cost` | 1 row per BigQuery job | job_id unique |

## 5. Foreign-Key Integrity Map (what the DQ engine checks)

```
fct_transactions.customer_key    → dim_customer.customer_key   (current version)
fct_transactions.account_key     → dim_account.account_key
fct_transactions.product_key     → dim_product.product_key
fct_transactions.channel_key     → dim_channel.channel_key
fct_transactions.region_key      → dim_region.region_key
fct_transactions.bu_key          → dim_business_unit.bu_key
fct_support_cases.customer_key   → dim_customer.customer_key
fct_support_cases.assignee_employee_key → dim_employee.employee_key
dim_account.customer_key         → dim_customer.customer_key
fct_employee_activity.employee_key → dim_employee.employee_key
```
