-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- 02_facts.sql
-- Fact tables. Design rules:
--   * Facts are PARTITIONED by time and CLUSTERED by the highest-cardinality
--     filter keys (this drives 90% of query cost savings in BigQuery).
--   * Surrogate FKs reference conformed dimensions (dims: core_layer.*).
--   * Every fact carries etl_batch_id + etl_loaded_at for observability and
--     full/partial reprocessing (idempotent reloads).
--   * transaction `amount` stored in both local currency and standardized USD
--     (converted via fx_rate) to support global consolidation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fct_transactions — Grain: 1 row per posted transaction
-- Partition: txn_date | Cluster: customer_key, region_key, account_key
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.fct_transactions`
(
  txn_key            INT64   NOT NULL,          -- surrogate PK
  txn_id             STRING  NOT NULL,          -- natural transaction id
  txn_date           DATE    NOT NULL,          -- partition column
  txn_timestamp      TIMESTAMP NOT NULL,
  customer_key       INT64   NOT NULL,          -- FK dim_customer
  account_key        INT64   NOT NULL,          -- FK dim_account
  product_key        INT64   NOT NULL,          -- FK dim_product
  channel_key        INT64   NOT NULL,          -- FK dim_channel
  region_key         INT64   NOT NULL,          -- FK dim_region
  bu_key             INT64   NOT NULL,          -- FK dim_business_unit
  txn_type           STRING  NOT NULL,          -- DEPOSIT/WITHDRAWAL/PAYMENT/TRANSFER/FEE/REFUND/CHARGEBACK
  amount             NUMERIC(18,2) NOT NULL,    -- in local currency
  currency_code      STRING  NOT NULL,          -- ISO-4217
  fx_rate            NUMERIC(18,6) NOT NULL,    -- to USD at txn time
  amount_usd         NUMERIC(18,2) NOT NULL,    -- standardized
  status             STRING  NOT NULL,          -- POSTED/PENDING/REVERSED/FAILED
  is_reversal        BOOL    NOT NULL DEFAULT FALSE,
  reversal_of_txn_id STRING,                    -- if is_reversal, the original txn
  dedup_key          STRING  NOT NULL,          -- hash used by dedup step
  etl_batch_id       INT64   NOT NULL,
  etl_loaded_at      TIMESTAMP NOT NULL
)
PARTITION BY txn_date
CLUSTER BY customer_key, region_key, account_key
OPTIONS (description = 'Enterprise transaction fact — grain: 1 row per transaction. Partitioned by txn_date, clustered by customer/region/account.',
         labels = [("layer", "core"), ("criticality", "t1")]);

-- ----------------------------------------------------------------------------
-- fct_operations_events — Grain: 1 row per operational event (streaming sink)
-- Partition: event_date | Cluster: source_system, event_type
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.fct_operations_events`
(
  event_id         STRING   NOT NULL,          -- UUID from producer
  event_timestamp  TIMESTAMP NOT NULL,
  event_date       DATE     NOT NULL,          -- partition column
  event_type       STRING   NOT NULL,          -- LOGIN/ORDER_PLACED/PAYMENT_FAILED/LATENCY/ERROR/STOCKOUT/DELIVERY
  source_system    STRING   NOT NULL,          -- OMS/ERP/GATEWAY/IAM/BILLING/PROBE
  service_name     STRING   NOT NULL,          -- microservice / host
  status           STRING   NOT NULL,          -- SUCCESS/FAILURE/TIMEOUT
  latency_ms       INT64    NOT NULL,          -- latency in ms (0 for batch events)
  region_key       INT64    NOT NULL,
  bu_key           INT64    NOT NULL,
  customer_key     INT64,                      -- nullable — not all events have a customer
  payload          JSON,                       -- event payload (JSON functions used heavily)
  dedup_key        STRING   NOT NULL,
  etl_batch_id     INT64    NOT NULL,
  etl_loaded_at    TIMESTAMP NOT NULL
)
PARTITION BY event_date
CLUSTER BY source_system, event_type, service_name
OPTIONS (description = 'Operational event fact (streaming) — grain: 1 row per event. Partitioned daily, clustered by source/type/service.',
         labels = [("layer", "core"), ("criticality", "t1")]);

-- ----------------------------------------------------------------------------
-- fct_support_cases — Grain: 1 row per support case
-- Partition: opened_date | Cluster: customer_key, case_type
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.fct_support_cases`
(
  case_id            INT64   NOT NULL,
  case_number        STRING  NOT NULL,
  opened_at          TIMESTAMP NOT NULL,
  opened_date        DATE    NOT NULL,         -- partition column
  customer_key       INT64   NOT NULL,
  case_type          STRING  NOT NULL,         -- BILLING/TECHNICAL/ACCOUNT/COMPLAINT/REQUEST
  priority           STRING  NOT NULL,         -- P1/P2/P3/P4
  status             STRING  NOT NULL,         -- OPEN/IN_PROGRESS/RESOLVED/CLOSED/REOPENED
  assignee_employee_key INT64,                 -- FK dim_employee
  sla_due_at         TIMESTAMP NOT NULL,
  first_response_at  TIMESTAMP,
  resolved_at        TIMESTAMP,
  closed_at          TIMESTAMP,
  satisfaction_score INT64,                    -- 1..5 (CSAT)
  is_escalated       BOOL    NOT NULL DEFAULT FALSE,
  reopen_count       INT64   NOT NULL DEFAULT 0,
  region_key         INT64   NOT NULL,
  bu_key             INT64   NOT NULL,
  etl_batch_id       INT64   NOT NULL,
  etl_loaded_at      TIMESTAMP NOT NULL
)
PARTITION BY opened_date
CLUSTER BY customer_key, case_type, priority
OPTIONS (description = 'Customer support case fact — grain: 1 case. Partitioned by opened_date, clustered by customer/case_type/priority.',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- fct_employee_activity — Grain: 1 row per platform interaction
-- Partition: activity_date | Cluster: app_name, activity_type
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.fct_employee_activity`
(
  activity_id       STRING   NOT NULL,
  activity_timestamp TIMESTAMP NOT NULL,
  activity_date     DATE     NOT NULL,         -- partition column
  employee_key      INT64    NOT NULL,         -- FK dim_employee
  activity_type     STRING   NOT NULL,         -- LOGIN/QUERY/DASHBOARD_VIEW/REPORT_DOWNLOAD/ALERT/API
  app_name          STRING   NOT NULL,         -- 'Tableau','Looker','ZUMIQ Portal','Data Studio','BI API'
  resource_name     STRING,                    -- dashboard/table/report name
  duration_sec      INT64    NOT NULL,
  session_id        STRING   NOT NULL,
  device_type       STRING,                    -- DESKTOP/MOBILE/API
  region_key        INT64    NOT NULL,
  etl_batch_id      INT64    NOT NULL,
  etl_loaded_at     TIMESTAMP NOT NULL
)
PARTITION BY activity_date
CLUSTER BY app_name, employee_key
OPTIONS (description = 'Employee platform activity fact — enables product analytics on ZUMIQ itself (adoption, queries, dashboards).',
         labels = [("layer", "core")]);

-- ============================================================================
-- OPS / COST facts (platform telemetry — stored in ops and cost datasets)
-- ============================================================================

-- fct_pipeline_runs — orchestration observability
CREATE TABLE IF NOT EXISTS `zumiq-prod.ops.fct_pipeline_runs`
(
  run_id            STRING   NOT NULL,
  pipeline_name     STRING   NOT NULL,
  source_system     STRING   NOT NULL,
  target_table      STRING   NOT NULL,
  run_started_at    TIMESTAMP NOT NULL,
  run_finished_at   TIMESTAMP,
  run_date          DATE     NOT NULL,         -- partition column
  status            STRING   NOT NULL,         -- SUCCESS/FAILED/SKIPPED/TIMEOUT
  rows_read         INT64,
  rows_written      INT64,
  row_count_delta   INT64,                     -- rows_written - expected (drift detection)
  dq_passed         BOOL,
  dq_score          NUMERIC(5,2),
  cost_bytes_billed INT64,
  error_message     STRING,
  retry_count       INT64    NOT NULL DEFAULT 0,
  etl_loaded_at     TIMESTAMP NOT NULL
)
PARTITION BY run_date
CLUSTER BY pipeline_name, status
OPTIONS (description = 'Pipeline run observability fact — freshness SLAs, failure detection, volume drift.',
         labels = [("layer", "ops"), ("criticality", "t1")]);

-- fct_query_cost — BigQuery job telemetry (source: INFORMATION_SCHEMA.JOBS_BY_PROJECT / billing export)
CREATE TABLE IF NOT EXISTS `zumiq-prod.cost.fct_query_cost`
(
  job_id           STRING   NOT NULL,
  query_id         STRING,                     -- user-facing label if set
  user_email       STRING   NOT NULL,
  project_id       STRING   NOT NULL,
  dataset_id       STRING   NOT NULL,
  job_time         TIMESTAMP NOT NULL,
  job_date         DATE     NOT NULL,          -- partition column
  job_type         STRING   NOT NULL,          -- QUERY/LOAD/EXPORT
  bytes_billed     INT64    NOT NULL,
  bytes_processed  INT64    NOT NULL,
  total_slot_ms    INT64    NOT NULL,
  cost_usd         NUMERIC(18,6) NOT NULL,
  table_reference  STRING,                     -- tables read (JSON list)
  cache_hit        BOOL     NOT NULL,
  query_labels     STRING,                     -- JSON labels (cost-center attribution)
  etl_loaded_at    TIMESTAMP NOT NULL
)
PARTITION BY job_date
CLUSTER BY user_email, dataset_id
OPTIONS (description = 'BigQuery query cost fact — cost governance, top-spender analysis, budget alerting.',
         labels = [("layer", "cost"), ("criticality", "t1")]);

-- ============================================================================
-- END 02_facts.sql
-- ============================================================================
