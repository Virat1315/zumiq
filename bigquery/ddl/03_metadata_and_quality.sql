-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- 03_metadata_and_quality.sql
-- Cross-cutting tables: metadata catalog + data quality + governance + glossary.
-- These make the platform self-describing and audit-able, which is the
-- foundation of "data as a product" trust.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- metadata.table_catalog — the "data product catalog" (one row per table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.metadata.table_catalog`
(
  table_id            STRING NOT NULL,       -- fully qualified: project.dataset.table
  dataset_id          STRING NOT NULL,
  table_name          STRING NOT NULL,
  description         STRING,
  table_type          STRING NOT NULL,       -- TABLE/VIEW/MATERIALIZED_VIEW
  data_product_name   STRING,                -- certified data product it belongs to
  owning_team         STRING NOT NULL,
  data_owner          STRING NOT NULL,
  data_steward        STRING,
  refresh_schedule    STRING,                -- cron expression
  sla_hours           INT64,                 -- max allowed age of data
  last_loaded_at      TIMESTAMP,
  row_count           INT64,
  size_bytes          INT64,
  partition_column    STRING,
  clustering_columns  STRING,                -- comma-separated
  classification      STRING NOT NULL,       -- PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED
  criticality         STRING NOT NULL,       -- T1 (executive/business-critical)..T3
  dq_sla              INT64,                 -- minimum allowed DQ score (%)
  glossary_term       STRING,                -- linked business glossary term
  is_certified        BOOL NOT NULL DEFAULT FALSE,
  version             STRING NOT NULL DEFAULT 'v1.0.0',
  created_at          TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP NOT NULL
)
OPTIONS (description = 'Data product catalog: ownership, SLAs, classification, criticality.',
         labels = [("layer", "metadata")]);

-- ----------------------------------------------------------------------------
-- metadata.column_catalog — column descriptions + sensitivity (auto-scanned)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.metadata.column_catalog`
(
  table_id          STRING NOT NULL,
  column_name       STRING NOT NULL,
  data_type         STRING NOT NULL,
  description       STRING,
  sensitivity       STRING NOT NULL DEFAULT 'PUBLIC',  -- PUBLIC/INTERNAL/PII/PCI/PHI/RESTRICTED
  pii_flag          BOOL   NOT NULL DEFAULT FALSE,
  is_partition_col  BOOL   NOT NULL DEFAULT FALSE,
  is_clustering_col BOOL   NOT NULL DEFAULT FALSE,
  glossary_term     STRING,
  is_nullable       BOOL   NOT NULL,
  dq_coverage       NUMERIC(5,2),            -- % of DQ checks covering this column
  last_scanned_at   TIMESTAMP NOT NULL
)
OPTIONS (description = 'Column-level catalog with sensitivity classification and DQ coverage.',
         labels = [("layer", "metadata")]);

-- ----------------------------------------------------------------------------
-- metadata.lineage_edges — column-level lineage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.metadata.lineage_edges`
(
  edge_id            STRING NOT NULL,
  source_table       STRING NOT NULL,
  source_column      STRING,
  target_table       STRING NOT NULL,
  target_column      STRING,
  transformation     STRING,                 -- 'direct','rename','cast','join','aggregate','scd2'
  job_name           STRING,                 -- pipeline that produced it
  created_at         TIMESTAMP NOT NULL
)
OPTIONS (description = 'Column-level lineage graph edges.',
         labels = [("layer", "metadata")]);

-- ----------------------------------------------------------------------------
-- metadata.business_glossary — one definition per metric term (single source of truth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.metadata.business_glossary`
(
  term_id           STRING NOT NULL,
  term_name         STRING NOT NULL,         -- 'GMV','Net Revenue','Gross Margin','NPS',...
  definition        STRING NOT NULL,         -- authoritative business definition
  formula           STRING,                  -- canonical SQL / formula
  owner_team        STRING NOT NULL,
  steward           STRING,
  status            STRING NOT NULL,         -- 'DRAFT','CERTIFIED','DEPRECATED'
  version           INT64 NOT NULL DEFAULT 1,
  approved_by       STRING,
  approved_at       TIMESTAMP,
  linked_tables     STRING,                  -- tables that implement this term
  effective_from    TIMESTAMP NOT NULL,
  effective_to      TIMESTAMP
)
OPTIONS (description = 'Business glossary — certified metric definitions (the semantic contract).',
         labels = [("layer", "metadata")]);

-- ----------------------------------------------------------------------------
-- governance.dq_rules — rule catalog (the DQ engine's configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.governance.dq_rules`
(
  rule_id           STRING NOT NULL,
  rule_name         STRING NOT NULL,
  dimension         STRING NOT NULL,   -- COMPLETENESS/UNIQUENESS/TIMELINESS/VALIDITY/ACCURACY/CONSISTENCY/INTEGRITY/FRESHNESS/VOLUME
  table_id          STRING NOT NULL,
  column_name       STRING,
  severity          STRING NOT NULL,   -- ERROR/WARNING/INFO
  threshold         NUMERIC(6,4) NOT NULL,  -- e.g. max failure rate 0.02 (2%)
  rule_expression   STRING NOT NULL,   -- templated SQL expression
  is_active         BOOL NOT NULL DEFAULT TRUE,
  owner             STRING NOT NULL,
  created_at        TIMESTAMP NOT NULL
)
OPTIONS (description = 'Data quality rule catalog — the engine configuration.',
         labels = [("layer", "governance")]);

-- ----------------------------------------------------------------------------
-- governance.dq_run_results — every check execution
-- Partitioned by run_date, clustered by table_id.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.governance.dq_run_results`
(
  run_id            STRING NOT NULL,
  run_timestamp     TIMESTAMP NOT NULL,
  run_date          DATE NOT NULL,           -- partition
  rule_id           STRING NOT NULL,
  table_id          STRING NOT NULL,
  column_name       STRING,
  dimension         STRING NOT NULL,
  severity          STRING NOT NULL,
  status            STRING NOT NULL,         -- PASS/FAIL/ERROR/SKIPPED
  observed_value    NUMERIC,                 -- observed failure rate
  expected_value    NUMERIC,                 -- the threshold
  rows_checked      INT64 NOT NULL,
  rows_failed      INT64 NOT NULL,
  sample_of_failures JSON,                   -- sample rows for root-cause analysis
  remediation_owner STRING,
  check_query       STRING,                  -- the exact SQL executed (auditability)
  etl_loaded_at     TIMESTAMP NOT NULL
)
PARTITION BY run_date
CLUSTER BY table_id, dimension
OPTIONS (description = 'DQ engine run results — every check execution, audit-ready.',
         labels = [("layer", "governance")]);

-- ----------------------------------------------------------------------------
-- governance.dq_health_daily — daily enterprise / per-product health score
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.governance.dq_health_daily`
(
  score_date        DATE NOT NULL,           -- partition
  data_product_name STRING NOT NULL,         -- 'ENTERPRISE' = whole platform
  table_id          STRING NOT NULL,
  dq_score          NUMERIC(5,2) NOT NULL,   -- weighted enterprise score 0-100
  weighted_errors   NUMERIC(18,4),           -- error-severity weighted failures
  checks_run        INT64 NOT NULL,
  checks_passed     INT64 NOT NULL,
  checks_failed     INT64 NOT NULL,
  by_dimension      JSON,                    -- {"COMPLETENESS":99.2, ...}
  anomaly_flag      BOOL NOT NULL DEFAULT FALSE,
  computed_at       TIMESTAMP NOT NULL
)
PARTITION BY score_date
CLUSTER BY data_product_name
OPTIONS (description = 'Daily data quality health scores per data product.',
         labels = [("layer", "governance")]);

-- ----------------------------------------------------------------------------
-- ops.alert_history — all platform alerts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.ops.alert_history`
(
  alert_id          STRING NOT NULL,
  alert_type        STRING NOT NULL,   -- DQ/PIPELINE/COST/FRESHNESS/METADATA/SCHEMA
  severity          STRING NOT NULL,   -- CRITICAL/HIGH/MEDIUM/LOW
  subject           STRING NOT NULL,
  message           STRING,
  triggered_at      TIMESTAMP NOT NULL,
  triggered_date    DATE NOT NULL,
  acknowledged_by   STRING,
  acknowledged_at   TIMESTAMP,
  resolved_at       TIMESTAMP,
  status            STRING NOT NULL,   -- OPEN/ACKNOWLEDGED/RESOLVED
  source_table      STRING,
  run_id            STRING
)
PARTITION BY triggered_date
CLUSTER BY alert_type, status
OPTIONS (description = 'Platform alert history — DQ, pipeline, cost, freshness alerts.',
         labels = [("layer", "ops")]);

-- ----------------------------------------------------------------------------
-- raw_layer.inventory_receipts — streaming IoT/warehouse receipts (used for
-- streaming + window function examples; partitioned hourly)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.raw_layer.inventory_receipts`
(
  receipt_id         STRING NOT NULL,
  warehouse_code     STRING NOT NULL,
  product_key        INT64 NOT NULL,
  quantity           INT64 NOT NULL,
  received_timestamp TIMESTAMP NOT NULL,
  received_date      DATE NOT NULL,          -- partition
  received_hour      INT64 NOT NULL,         -- sub-partition granularity (0-23)
  received_day_part  STRING NOT NULL,        -- 'MORNING','AFTERNOON','EVENING','NIGHT'
  source_device      STRING,
  payload            JSON,
  etl_loaded_at      TIMESTAMP NOT NULL
)
PARTITION BY received_date
CLUSTER BY warehouse_code, product_key
OPTIONS (description = 'Streaming warehouse receipt events — supports hourly partition + JSON/window examples.',
         labels = [("layer", "raw")]);

-- ============================================================================
-- END 03_metadata_and_quality.sql
-- ============================================================================
