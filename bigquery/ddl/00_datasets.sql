-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- 00_datasets.sql
-- Creates the GCP project dataset topology.
-- BigQuery has no "CREATE DATABASE" — datasets are the top-level containers.
-- Environment: PROD (us-central1, regional location). Each layer is a dataset.
-- ============================================================================
--
-- LAYERING STRATEGY (medallion / multi-hop):
--   landing_zone  → raw dump of source files (schema-on-read, short-lived)
--   raw_layer     → immutable raw tables, partitioned by ingestion date
--   staging_layer → validated / deduplicated / standardized (the validation layer)
--   core_layer    → conformed dimensions (SCD2) + facts (the transformation layer)
--   gold_layer    → certified star-schema marts and aggregates (the business layer)
--   analytics_layer → semantic views + KPI tables (the analytics + semantic layer)
--   metadata      → catalog, ownership, glossary, lineage, classifications
--   governance    → DQ rules, DQ run results, DQ health scores
--   ops           → pipeline runs, alert history, orchestration metadata
--   cost          → BigQuery usage, slot telemetry, billing export

-- Create all datasets. Naming: lower_snake_case; each has labels for cost
-- management (very important for Billing Export attribution later).

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.landing_zone`
  OPTIONS (description = 'External system file dumps. Short-lived, schema-on-read.',
           labels = [("layer", "landing"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.raw_layer`
  OPTIONS (description = 'Immutable raw tables, append-only, partitioned by ingestion date.',
           labels = [("layer", "raw"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.staging_layer`
  OPTIONS (description = 'Validation layer: schema checks, dedup, standardization, DQ checkpoints.',
           labels = [("layer", "staging"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.core_layer`
  OPTIONS (description = 'Transformation layer: conformed SCD2 dimensions and fact tables.',
           labels = [("layer", "core"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.gold_layer`
  OPTIONS (description = 'Business layer: certified star-schema marts and pre-aggregates.',
           labels = [("layer", "gold"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.analytics_layer`
  OPTIONS (description = 'Analytics + semantic layer: certified KPI views, glossarized metrics.',
           labels = [("layer", "analytics"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.metadata`
  OPTIONS (description = 'Metadata platform: table/column catalog, ownership, glossary, lineage.',
           labels = [("layer", "metadata"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.governance`
  OPTIONS (description = 'Governance: data quality rules, run results, health scores, exceptions.',
           labels = [("layer", "governance"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.ops`
  OPTIONS (description = 'Operations: pipeline runs, dependencies, alert history.',
           labels = [("layer", "ops"), ("environment", "prod")]);

CREATE SCHEMA IF NOT EXISTS `zumiq-prod.cost`
  OPTIONS (description = 'Cost & usage: BigQuery job telemetry, billing export, slot usage.',
           labels = [("layer", "cost"), ("environment", "prod")]);
