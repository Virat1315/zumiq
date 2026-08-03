#!/usr/bin/env bash
# ============================================================================
# ZUMIQ — Provisioning & bootstrap
# Creates datasets, tables, views, and bootstraps the platform.
# Usage: bash scripts/00_setup.sh
# Prereq: authenticated gcloud + BigQuery enabled on the project.
# ============================================================================
set -euo pipefail
PROJECT="${PROJECT:-zumiq-prod}"
BQ="bq --project_id=${PROJECT} --use_legacy_sql=false"

echo "==> Creating datasets"
for f in bigquery/ddl/00_datasets.sql; do ${BQ} query < "$f"; done

echo "==> Creating dimensions & facts"
for f in bigquery/ddl/01_dimensions.sql bigquery/ddl/02_facts.sql \
         bigquery/ddl/03_metadata_and_quality.sql; do
  ${BQ} query < "$f"
done

echo "==> Creating semantic views"
for f in bigquery/views/*.sql; do ${BQ} query < "$f"; done

echo "==> Creating materialized views"
for f in bigquery/materialized-views/*.sql; do ${BQ} query < "$f"; done

echo "==> Creating stored procedures"
for f in bigquery/stored-procedures/*.sql; do ${BQ} query < "$f"; done

echo "==> Seeding data quality rules"
${BQ} query < bigquery/quality/seed_rules.sql

echo "==> Seeding demo data"
python scripts/01_seed_data.py

echo "==> Loading SCD2 dimensions"
for f in bigquery/dml/*.sql; do ${BQ} query < "$f"; done

echo "==> Loading date dimension"
${BQ} query --use_legacy_sql=false \
  "CALL zumiq-prod.core_layer.sp_load_dim_date(DATE '2024-01-01', DATE '2027-12-31')"

echo "==> Running DQ engine"
python python/dq_engine/dq_engine.py --config python/dq_engine/dq_config.json

echo "==> Metadata scan"
python python/metadata_agent/metadata_agent.py

echo "ZUMIQ bootstrap complete."
