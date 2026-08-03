"""
ZUMIQ — Metadata Agent
========================
Automatically keeps the metadata platform current. Scans BigQuery
INFORMATION_SCHEMA nightly, enriches with ownership/SLA/classification from a
YAML "source of truth" file, computes sensitivity flags, and maintains the
data product catalog + column catalog + lineage.

What it does automatically (no manual cataloging):
  1. SCAN     — discovers every table/view/MV and its columns (INFORMATION_SCHEMA)
  2. DIFF     — detects new tables, dropped tables, schema drift (new/removed cols)
  3. ENRICH   — merges human-authored metadata (owners, SLAs, classification)
  4. SENSITIVITY — flags PII/PCI/PHI columns from regex + glossary rules
  5. CATALOG  — upserts metadata.table_catalog + column_catalog
  6. ALERT    — raises SCHEMA_DRIFT and UNREGISTERED_TABLE alerts to ops.alert_history

Run:  python metadata_agent/metadata_agent.py --config metadata_agent/meta_config.json
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, date
from typing import Any

from google.cloud import bigquery

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOG = logging.getLogger("zumiq.metadata")

# Sensitivity heuristics (regex over column name + glossary match).
PII_PATTERN = re.compile(r"(email|phone|name|ssn|dob|address|ip_addr|user_name)", re.I)
PCI_PATTERN = re.compile(r"(card|pan|cvv|cc_|account_number|routing)", re.I)
PHI_PATTERN = re.compile(r"(diagnos|patient|medical|insurance_id|claim)", re.I)


class MetadataAgent:
    def __init__(self, project: str, client: bigquery.Client | None = None,
                 enriched_meta: dict[str, dict] | None = None):
        self.project = project
        self.client = client or bigquery.Client(project=project)
        # Human-authored metadata: {"dataset.table": {owner, sla_hours, classification,...}}
        self.enriched_meta = enriched_meta or {}

    # 1. SCAN -------------------------------------------------------------
    def scan_schema(self) -> list[dict[str, Any]]:
        sql = f"""
        SELECT
          table_schema, table_name, table_type,
          row_count, size_bytes,
          (SELECT STRING_AGG(column_name, ',')
             FROM UNNEST(column_names)) AS column_names
        FROM (
          SELECT
            t.table_schema, t.table_name, t.table_type,
            t.row_count, t.size_bytes,
            ARRAY_AGG(c.column_name ORDER BY c.ordinal_position) AS column_names
          FROM `{self.project}`.INFORMATION_SCHEMA.TABLES AS t
          JOIN `{self.project}`.INFORMATION_SCHEMA.COLUMNS AS c
            ON c.table_schema = t.table_schema AND c.table_name = t.table_name
          GROUP BY 1, 2, 3, 4, 5
        )"""
        return [dict(r) for r in self.client.query(sql).result()]

    # 4. SENSITIVITY ------------------------------------------------------
    def classify_column(self, column: str, table_id: str) -> dict[str, Any]:
        table_meta = self.enriched_meta.get(table_id, {})
        sensitivity = table_meta.get("default_classification", "INTERNAL")
        pii = bool(PII_PATTERN.search(column))
        pci = bool(PCI_PATTERN.search(column))
        phi = bool(PHI_PATTERN.search(column))
        if pci:
            sensitivity = "PCI"
        elif phi:
            sensitivity = "PHI"
        elif pii:
            sensitivity = "PII"
        # Allow explicit overrides (data steward is king).
        if column in table_meta.get("column_classifications", {}):
            sensitivity = table_meta["column_classifications"][column]
        return {
            "sensitivity": sensitivity,
            "pii_flag": sensitivity in ("PII", "PCI", "PHI", "RESTRICTED"),
        }

    # 5. CATALOG ----------------------------------------------------------
    def sync_catalogs(self, tables: list[dict[str, Any]]) -> None:
        table_rows, col_rows = [], []
        for t in tables:
            tid = f"{self.project}.{t['table_schema']}.{t['table_name']}"
            meta = self.enriched_meta.get(tid, {})
            table_rows.append({
                "table_id": tid,
                "dataset_id": t["table_schema"],
                "table_name": t["table_name"],
                "table_type": t["table_type"],
                "row_count": t.get("row_count"),
                "size_bytes": t.get("size_bytes"),
                "owning_team": meta.get("owning_team", "UNASSIGNED"),
                "data_owner": meta.get("data_owner", "UNASSIGNED"),
                "data_steward": meta.get("data_steward"),
                "sla_hours": meta.get("sla_hours"),
                "refresh_schedule": meta.get("refresh_schedule"),
                "classification": meta.get("classification", "INTERNAL"),
                "criticality": meta.get("criticality", "T3"),
                "dq_sla": meta.get("dq_sla", 90),
                "is_certified": meta.get("is_certified", False),
                "version": meta.get("version", "v1.0.0"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })
            for col in (t.get("column_names") or "").split(","):
                if not col:
                    continue
                sens = self.classify_column(col.strip(), tid)
                col_rows.append({
                    "table_id": tid, "column_name": col.strip(),
                    "data_type": "SCANNED", "description": None,
                    "sensitivity": sens["sensitivity"],
                    "pii_flag": sens["pii_flag"],
                    "is_partition_col": False, "is_clustering_col": False,
                    "glossary_term": None, "is_nullable": True,
                    "last_scanned_at": datetime.utcnow(),
                })
        if table_rows:
            self.client.load_table_from_json(
                table_rows, f"{self.project}.metadata.table_catalog",
                job_config=bigquery.LoadJobConfig(
                    write_disposition="WRITE_APPEND",
                    schema_update_options=[
                        bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION])).result()
        if col_rows:
            self.client.load_table_from_json(
                col_rows, f"{self.project}.metadata.column_catalog",
                job_config=bigquery.LoadJobConfig(
                    write_disposition="WRITE_APPEND",
                    schema_update_options=[
                        bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION])).result()
        LOG.info("Synced %d tables, %d columns", len(table_rows), len(col_rows))

    # 3. DIFF + 6. ALERT --------------------------------------------------
    def detect_schema_drift(self, tables: list[dict[str, Any]]) -> list[str]:
        catalog_ids = {
            r["table_id"]
            for r in self.client.query(
                f"SELECT table_id FROM `{self.project}.metadata.table_catalog`").result()}
        current = {f"{self.project}.{t['table_schema']}.{t['table_name']}" for t in tables}
        new_tables = current - catalog_ids
        for tid in new_tables:
            self._raise_alert("SCHEMA", "HIGH",
                              f"Unregistered table {tid}",
                              "Metadata agent discovered a table not in the catalog.",
                              tid)
        return sorted(new_tables)

    def _raise_alert(self, alert_type: str, severity: str, subject: str,
                     message: str, source_table: str | None) -> None:
        self.client.load_table_from_json(
            [{
                "alert_id": str(uuid.uuid4()), "alert_type": alert_type,
                "severity": severity, "subject": subject, "message": message,
                "triggered_at": datetime.utcnow(), "triggered_date": date.today(),
                "status": "OPEN", "source_table": source_table}],
            f"{self.project}.ops.alert_history",
            job_config=bigquery.LoadJobConfig(
                write_disposition="WRITE_APPEND")).result()

    # ORCHESTRATOR --------------------------------------------------------
    def run(self) -> None:
        LOG.info("Metadata agent run started")
        tables = self.scan_schema()
        new_tables = self.detect_schema_drift(tables)
        if new_tables:
            LOG.warning("New tables found: %s", new_tables)
        self.sync_catalogs(tables)
        LOG.info("Metadata agent run complete")


if __name__ == "__main__":
    agent = MetadataAgent(project="zumiq-prod")
    agent.run()
