# ZUMIQ — Data Dictionary

> Canonical definitions for every table and key column. This is the contract
> between the platform and its consumers. Definitions here are authoritative;
> anything else is stale. Managed automatically by the metadata agent plus
> human review for T1 tables.

## Core Layer — Dimensions

### dim_date
| Column | Type | Notes |
|---|---|---|
| date_key | DATE | PK; also partition/join key |
| day_of_week | INT64 | 0=Sunday … 6=Saturday |
| day_name | STRING | 'Monday' … |
| week_start_date | DATE | Monday anchor |
| is_weekend | BOOL | Sat/Sun |
| is_holiday | BOOL | Company calendar |
| fiscal_year / fiscal_quarter / fiscal_period | INT64/INT64/STRING | FY starts Feb 1; period 'FY2026-P01' |

### dim_region
Grain: country. `region_key` FK everywhere. Includes sales org + timezone + currency.

### dim_business_unit
| bu_code | bu_name | Segment |
|---|---|---|
| RTL | Retail | B2C |
| BNK | Banking | B2B |
| TEL | Telecom | B2C |
| INS | Insurance | B2B |
| MNF | Manufacturing | B2B |
| LOG | Logistics | B2B |

Each BU has a `pnl_owner` (exec), `data_product_owner`, `sla_hours`, `classification`.

### dim_customer (SCD Type 2)
| Column | Type | Notes |
|---|---|---|
| customer_key | INT64 | Surrogate PK (stable across versions) |
| customer_id | STRING | Natural key from CRM |
| customer_segment | STRING | Enterprise / Mid-Market / SMB |
| tier | STRING | Platinum / Gold / Silver / Bronze |
| annual_revenue | NUMERIC | Standardized USD |
| valid_from / valid_to | TIMESTAMP | Version window; NULL valid_to = current |
| is_current | BOOL | Exactly one TRUE per customer_id (DQ-checked) |
| record_hash | STRING | MD5 of SCD attributes → change detection |

### dim_account (SCD Type 2)
Account types: Checking, Savings, Loan, CreditCard, Trade, Deposit. FK to customer.

### dim_product (SCD Type 2)
product_category, product_subcategory, brand, list_price, cost_price, margin_pct.
Status: ACTIVE / DISCONTINUED / SEASONAL.

### dim_employee
Self-referencing manager hierarchy via `manager_employee_key`. department, role_title, cost_center.

### dim_channel
WEB / MOBILE / CALL / BRANCH / POS / API / PARTNER.

---

## Core Layer — Facts

### fct_transactions
**Grain:** 1 row per transaction · **Partition:** txn_date · **Cluster:** customer_key, region_key, account_key

| Column | Type | Notes |
|---|---|---|
| txn_key | INT64 | Surrogate PK |
| txn_id | STRING | Natural id (UNIQUE — DQ check) |
| txn_type | STRING | DEPOSIT/WITHDRAWAL/PAYMENT/TRANSFER/FEE/REFUND/CHARGEBACK |
| amount | NUMERIC | Local currency |
| amount_usd | NUMERIC | amount × fx_rate — standardized for global consolidation |
| status | STRING | POSTED/PENDING/REVERSED/FAILED |
| is_reversal | BOOL | True when this txn reverses another |
| dedup_key | STRING | Dedup guard |

### fct_operations_events
**Grain:** 1 event · **Partition:** event_date · **Cluster:** source_system, event_type
Streaming sink (~1.2M/day). `payload` JSON carries system-specific fields.

### fct_support_cases
**Grain:** 1 case · **Partition:** opened_date · **Cluster:** customer_key, case_type, priority
SLA timestamps: `sla_due_at`, `first_response_at`, `resolved_at`. CSAT 1–5.

### fct_employee_activity
**Grain:** 1 platform interaction · **Partition:** activity_date · **Cluster:** app_name, employee_key
Enables product analytics on ZUMIQ itself (adoption of dashboards/reports).

---

## Platform Telemetry

### ops.fct_pipeline_runs
Pipeline name, source system, target table, status (SUCCESS/FAILED/SKIPPED/TIMEOUT),
rows_read/written, row_count_delta (drift), dq_passed, dq_score, cost_bytes_billed.
**Partition:** run_date · **Cluster:** pipeline_name, status.

### cost.fct_query_cost
One row per BigQuery job: user, dataset, bytes_billed, total_slot_ms, cost_usd, table_reference, cache_hit, query_labels.
**Partition:** job_date · **Cluster:** user_email, dataset_id. Source: INFORMATION_SCHEMA.JOBS_BY_PROJECT + Billing Export.

### metadata.table_catalog
The data product registry: ownership, SLA hours, classification, criticality, dq_sla, is_certified, version.

### metadata.column_catalog
Column descriptions + sensitivity (PUBLIC/INTERNAL/PII/PCI/PHI/RESTRICTED) + DQ coverage.

### metadata.lineage_edges
Column-level graph: source → target, transformation type, producing job.

### metadata.business_glossary
Certified metric definitions. `status = CERTIFIED` means dashboards must use the stored formula.

### governance.dq_rules
Rule catalog: dimension, severity, threshold, SQL template, owner.

### governance.dq_run_results
Append-only execution log: status PASS/FAIL, observed vs expected, rows checked/failed, failure samples.

### governance.dq_health_daily
Daily scores per data product + enterprise: dq_score, weighted_errors, checks, by_dimension.

### ops.alert_history
All alerts: DQ / PIPELINE / COST / FRESHNESS / METADATA / SCHEMA, severity, MTTR timestamps.

---

## Data Product Registry (Certified Sets)

| Data Product | Core Tables | Owner Team | SLA | DQ Floor |
|---|---|---|---|---|
| Enterprise P&L | fct_transactions + dim_product | Finance Data | 7:30 ET | 95 |
| Customer 360 | fct_transactions + fct_support_cases + dim_customer | CX Analytics | 8:00 ET | 95 |
| Operations Health | fct_operations_events | Platform | 15 min | 92 |
| Support SLA Board | fct_support_cases | CX Ops | 8:00 ET | 95 |
| Platform Health | ops.fct_pipeline_runs + governance.dq_health_daily | Platform | 30 min | 98 |
| Cost Governance | cost.fct_query_cost | FinOps | 9:00 ET | 95 |
| Data Quality | governance.* | Data Quality | 6:00 ET | 100 |

*The registry above is also the `data_product_name` used in `governance.dq_health_daily`.*
