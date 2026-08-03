-- ============================================================================
-- ZUMIQ - Data Quality Engine · seed_rules.sql
-- The rule catalog that bootstraps the DQ engine for the certified tables.
-- Severity weights: ERROR=1.0, WARNING=0.5, INFO=0.1 (see dq_engine.py).
-- ============================================================================

TRUNCATE TABLE `zumiq-prod.governance.dq_rules`;

INSERT INTO `zumiq-prod.governance.dq_rules`
  (rule_id, rule_name, dimension, table_id, column_name, severity, threshold,
   rule_expression, is_active, owner, created_at)
VALUES
-- ---------- fct_transactions ----------
('DQ-TXN-001', 'txn_id uniqueness', 'UNIQUENESS', 'zumiq-prod.core_layer.fct_transactions', 'txn_id', 'ERROR', 0.0,
 'ROW_NUMBER PK check', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-TXN-002', 'customer_key completeness', 'COMPLETENESS', 'zumiq-prod.core_layer.fct_transactions', 'customer_key', 'ERROR', 0.001,
 'NULL check', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-TXN-003', 'txn_type validity', 'VALIDITY', 'zumiq-prod.core_layer.fct_transactions', 'txn_type', 'ERROR', 0.001,
 'allowed values', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-TXN-004', 'amount non-negative', 'VALIDITY', 'zumiq-prod.core_layer.fct_transactions', 'amount_usd', 'ERROR', 0.002,
 'amount_usd >= 0 except refunds', TRUE, 'Finance Data', CURRENT_TIMESTAMP()),
('DQ-TXN-005', 'FK to dim_customer', 'INTEGRITY', 'zumiq-prod.core_layer.fct_transactions', 'customer_key', 'ERROR', 0.0,
 'LEFT JOIN dim_customer', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-TXN-006', 'daily volume drift', 'VOLUME', 'zumiq-prod.core_layer.fct_transactions', NULL, 'WARNING', 0.5,
 'trailing 28d avg', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-TXN-007', 'partition freshness', 'FRESHNESS', 'zumiq-prod.core_layer.fct_transactions', NULL, 'ERROR', 24,
 'txn_date partition', TRUE, 'Platform Team', CURRENT_TIMESTAMP()),
('DQ-TXN-008', 'late-arriving rows', 'TIMELINESS', 'zumiq-prod.core_layer.fct_transactions', 'etl_loaded_at', 'WARNING', 0.02,
 'cutoff 12h', TRUE, 'Data Engineering', CURRENT_TIMESTAMP()),

-- ---------- fct_support_cases ----------
('DQ-CASE-001', 'case_number uniqueness', 'UNIQUENESS', 'zumiq-prod.core_layer.fct_support_cases', 'case_number', 'ERROR', 0.0,
 'ROW_NUMBER PK check', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),
('DQ-CASE-002', 'priority validity', 'VALIDITY', 'zumiq-prod.core_layer.fct_support_cases', 'priority', 'ERROR', 0.001,
 'P1-P4', TRUE, 'CX Analytics', CURRENT_TIMESTAMP()),
('DQ-CASE-003', 'FK to dim_customer', 'INTEGRITY', 'zumiq-prod.core_layer.fct_support_cases', 'customer_key', 'ERROR', 0.001,
 'LEFT JOIN dim_customer', TRUE, 'Data Quality Team', CURRENT_TIMESTAMP()),

-- ---------- dim_customer (SCD2) ----------
('DQ-DIM-001', 'customer_key uniqueness', 'UNIQUENESS', 'zumiq-prod.core_layer.dim_customer', 'customer_key', 'ERROR', 0.0,
 'ROW_NUMBER PK check', TRUE, 'Master Data', CURRENT_TIMESTAMP()),
('DQ-DIM-002', 'exactly one current version', 'UNIQUENESS', 'zumiq-prod.core_layer.dim_customer', 'customer_id', 'ERROR', 0.0,
 'is_current per customer', TRUE, 'Master Data', CURRENT_TIMESTAMP()),
('DQ-DIM-003', 'email completeness', 'COMPLETENESS', 'zumiq-prod.core_layer.dim_customer', 'email', 'WARNING', 0.05,
 'NULL check', TRUE, 'Master Data', CURRENT_TIMESTAMP()),

-- ---------- fct_operations_events ----------
('DQ-OPS-001', 'event_id uniqueness', 'UNIQUENESS', 'zumiq-prod.core_layer.fct_operations_events', 'event_id', 'ERROR', 0.0,
 'ROW_NUMBER PK check', TRUE, 'Platform Team', CURRENT_TIMESTAMP()),
('DQ-OPS-002', 'source_system validity', 'VALIDITY', 'zumiq-prod.core_layer.fct_operations_events', 'source_system', 'WARNING', 0.01,
 'known systems', TRUE, 'Platform Team', CURRENT_TIMESTAMP()),
('DQ-OPS-003', 'latency sanity', 'VALIDITY', 'zumiq-prod.core_layer.fct_operations_events', 'latency_ms', 'WARNING', 0.005,
 'latency_ms < 3600000', TRUE, 'Platform Team', CURRENT_TIMESTAMP()),

-- ---------- ops.fct_pipeline_runs ----------
('DQ-PIPE-001', 'pipeline run status', 'CONSISTENCY', 'zumiq-prod.ops.fct_pipeline_runs', 'status', 'ERROR', 0.0,
 'SUCCESS/FAILED only', TRUE, 'Platform Team', CURRENT_TIMESTAMP()),
('DQ-PIPE-002', 'target table tracked in catalog', 'INTEGRITY', 'zumiq-prod.ops.fct_pipeline_runs', 'target_table', 'ERROR', 0.0,
 'LEFT JOIN metadata.table_catalog', TRUE, 'Platform Team', CURRENT_TIMESTAMP());
