#!/usr/bin/env python3
"""
ZUMIQ — Demo data seeder
========================
Generates realistic synthetic data for the core_layer schemas so that every
SQL query in /sql and every scenario in /docs/scenarios actually runs.

Volume profile (per day):
  - fct_transactions       ~200k rows
  - fct_operations_events  ~500k rows
  - fct_support_cases      ~4k rows
  - fct_employee_activity  ~15k rows
  - ops.fct_pipeline_runs  ~31 rows
  - cost.fct_query_cost    ~5k rows

Run:  python scripts/01_seed_data.py --days 90
"""

from __future__ import annotations

import argparse
import random
import uuid
from datetime import date, datetime, timedelta

from faker import Faker  # pip install faker
from google.cloud import bigquery

fake = Faker()
random.seed(42)

PROJECT = "zumiq-prod"
CURRENCIES = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27, "JPY": 0.0069,
              "CAD": 0.73, "AUD": 0.65, "INR": 0.012, "BRL": 0.18}
REGION_KEYS = list(range(1, 16))          # 15 regions
BU_KEYS = list(range(1, 7))               # 6 business units
CHANNEL_KEYS = list(range(1, 8))          # 7 channels
PRODUCT_KEYS = list(range(1, 301))        # 300 products
ACCOUNT_KEYS = list(range(1, 50001))      # 50k accounts
CUSTOMER_KEYS = list(range(1, 40001))     # 40k customers
EMPLOYEE_KEYS = list(range(1, 9001))      # 9k employees

TXN_TYPES = ["DEPOSIT", "WITHDRAWAL", "PAYMENT", "TRANSFER", "FEE",
             "REFUND", "CHARGEBACK"]
EVENT_TYPES = ["LOGIN", "ORDER_PLACED", "PAYMENT_FAILED", "LATENCY",
               "ERROR", "STOCKOUT", "DELIVERY", "API_CALL"]
SOURCES = ["OMS", "ERP", "GATEWAY", "IAM", "BILLING", "PROBE"]
CASE_TYPES = ["BILLING", "TECHNICAL", "ACCOUNT", "COMPLAINT", "REQUEST"]
PRIORITIES = ["P1", "P2", "P3", "P4"]
PIPELINES = [
    ("SCD2_CUSTOMER", "SALESFORCE", "core_layer.dim_customer"),
    ("SCD2_PRODUCT", "SAP", "core_layer.dim_product"),
    ("FCT_TRANSACTIONS_LOAD", "ERP", "core_layer.fct_transactions"),
    ("FCT_OPS_EVENTS_STREAM", "KAFKA", "core_layer.fct_operations_events"),
    ("FCT_SUPPORT_CASES_LOAD", "SERVICENOW", "core_layer.fct_support_cases"),
    ("EXEC_KPIS_RECOMPUTE", "BIGQUERY", "gold_layer.kpi_executive_daily"),
    ("COST_GOVERNANCE_SUMMARY", "BIGQUERY", "gold_layer.cost_daily_summary"),
    ("DQ_ENGINE_DAILY", "BIGQUERY", "governance.dq_health_daily"),
    ("METADATA_SCAN", "BIGQUERY", "metadata.table_catalog"),
]
DEPARTMENTS = ["Finance", "Operations", "Customer Service", "Engineering",
               "Marketing", "Sales", "HR", "Data Platform"]
ACTIVITY_TYPES = ["LOGIN", "QUERY", "DASHBOARD_VIEW", "REPORT_DOWNLOAD",
                  "ALERT", "API"]


def gen_transactions(client, d: date, rows: int) -> list[dict]:
    out = []
    for _ in range(rows):
        cur = random.choice(list(CURRENCIES))
        amount = round(random.lognormvariate(6.2, 1.1), 2)
        txn_type = random.choices(TXN_TYPES, weights=[30, 15, 20, 12, 8, 10, 5])[0]
        amount = -amount if txn_type in ("REFUND", "CHARGEBACK") else amount
        status = random.choices(["POSTED", "PENDING", "REVERSED", "FAILED"],
                                weights=[92, 4, 2, 2])[0]
        ts = datetime.combine(d, datetime.min.time()) + \
            timedelta(minutes=random.randint(0, 1439))
        txn_id = f"TXN-{d.strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}"
        out.append({
            "txn_key": random.randint(1, 10_000_000),
            "txn_id": txn_id, "txn_date": d, "txn_timestamp": ts,
            "customer_key": random.choice(CUSTOMER_KEYS),
            "account_key": random.choice(ACCOUNT_KEYS),
            "product_key": random.choice(PRODUCT_KEYS),
            "channel_key": random.choice(CHANNEL_KEYS),
            "region_key": random.choice(REGION_KEYS),
            "bu_key": random.choice(BU_KEYS),
            "txn_type": txn_type, "amount": amount, "currency_code": cur,
            "fx_rate": CURRENCIES[cur], "amount_usd": round(amount * CURRENCIES[cur], 2),
            "status": status, "is_reversal": txn_type == "REFUND",
            "reversal_of_txn_id": None, "dedup_key": txn_id,
            "etl_batch_id": random.randint(1, 5000),
            "etl_loaded_at": ts + timedelta(hours=random.randint(2, 30)),
        })
    return out


def gen_ops_events(client, d: date, rows: int) -> list[dict]:
    out = []
    for _ in range(rows):
        ts = datetime.combine(d, datetime.min.time()) + \
            timedelta(seconds=random.randint(0, 86399))
        ev_type = random.choice(EVENT_TYPES)
        status = "FAILURE" if ev_type in ("PAYMENT_FAILED", "ERROR") else \
                 random.choices(["SUCCESS", "FAILURE", "TIMEOUT"],
                                weights=[94, 4, 2])[0]
        out.append({
            "event_id": str(uuid.uuid4()),
            "event_timestamp": ts, "event_date": d,
            "event_type": ev_type, "source_system": random.choice(SOURCES),
            "service_name": f"svc-{random.choice(['orders','pay','auth','inv','ship'])}-{random.randint(1,8)}",
            "status": status, "latency_ms": random.randint(20, 20000),
            "region_key": random.choice(REGION_KEYS), "bu_key": random.choice(BU_KEYS),
            "customer_key": random.choice([None] + CUSTOMER_KEYS),
            "payload": None, "dedup_key": str(uuid.uuid4()),
            "etl_batch_id": random.randint(1, 5000), "etl_loaded_at": ts,
        })
    return out


def gen_support(client, d: date, rows: int) -> list[dict]:
    out = []
    for _ in range(rows):
        opened = datetime.combine(d, datetime.min.time()) + \
            timedelta(minutes=random.randint(0, 1439))
        resolved = opened + timedelta(hours=random.randint(1, 120))
        case_type = random.choice(CASE_TYPES)
        priority = random.choices(PRIORITIES, weights=[8, 25, 45, 22])[0]
        csat = random.choices([1, 2, 3, 4, 5], weights=[3, 7, 20, 45, 25])[0]
        out.append({
            "case_id": random.randint(1, 2_000_000),
            "case_number": f"CASE-{d.strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
            "opened_at": opened, "opened_date": d,
            "customer_key": random.choice(CUSTOMER_KEYS),
            "case_type": case_type, "priority": priority,
            "status": random.choices(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
                                     weights=[15, 15, 20, 50])[0],
            "assignee_employee_key": random.choice(EMPLOYEE_KEYS),
            "sla_due_at": opened + timedelta(
                hours={"P1": 4, "P2": 8, "P3": 24, "P4": 72}[priority]),
            "first_response_at": opened + timedelta(minutes=random.randint(5, 240)),
            "resolved_at": resolved, "closed_at": resolved,
            "satisfaction_score": csat,
            "is_escalated": priority == "P1" and random.random() < 0.4,
            "reopen_count": random.randint(0, 2),
            "region_key": random.choice(REGION_KEYS), "bu_key": random.choice(BU_KEYS),
            "etl_batch_id": random.randint(1, 5000), "etl_loaded_at": datetime.utcnow(),
        })
    return out


def gen_activity(client, d: date, rows: int) -> list[dict]:
    out = []
    for _ in range(rows):
        ts = datetime.combine(d, datetime.min.time()) + \
            timedelta(minutes=random.randint(0, 1439))
        app = random.choices(["Tableau", "Looker", "ZUMIQ Portal", "Data Studio"],
                             weights=[45, 20, 30, 5])[0]
        out.append({
            "activity_id": str(uuid.uuid4()), "activity_timestamp": ts,
            "activity_date": d, "employee_key": random.choice(EMPLOYEE_KEYS),
            "activity_type": random.choice(ACTIVITY_TYPES), "app_name": app,
            "resource_name": random.choice(
                ["Exec Overview", "Ops Health", "DQ Dashboard", "Cost Report",
                 "CX SLA Board", "BU P&L", None]),
            "duration_sec": random.randint(5, 3600),
            "session_id": str(uuid.uuid4()),
            "device_type": random.choices(["DESKTOP", "MOBILE", "API"],
                                          weights=[70, 15, 15])[0],
            "region_key": random.choice(REGION_KEYS),
            "etl_batch_id": random.randint(1, 5000), "etl_loaded_at": ts,
        })
    return out


def gen_pipelines(client, d: date) -> list[dict]:
    out = []
    for name, src, target in PIPELINES:
        started = datetime.combine(d, datetime.min.time()) + \
            timedelta(minutes=random.randint(60, 420))
        status = "FAILED" if random.random() < 0.04 else "SUCCESS"
        finished = started + timedelta(minutes=random.randint(5, 75))
        rows_written = random.randint(20000, 600000)
        out.append({
            "run_id": str(uuid.uuid4()), "pipeline_name": name,
            "source_system": src, "target_table": target,
            "run_started_at": started, "run_finished_at": finished,
            "run_date": d, "status": status,
            "rows_read": rows_written + random.randint(-2000, 2000),
            "rows_written": rows_written,
            "row_count_delta": random.randint(-500, 500),
            "dq_passed": status == "SUCCESS", "dq_score": round(random.uniform(94, 99.9), 2),
            "cost_bytes_billed": random.randint(1_000_000, 500_000_000),
            "error_message": "partition mismatch" if status == "FAILED" else None,
            "retry_count": random.randint(0, 2), "etl_loaded_at": datetime.utcnow(),
        })
    return out


def gen_query_cost(client, d: date, rows: int) -> list[dict]:
    users = [f"{fake.first_name().lower()}.{fake.last_name().lower()}@zumiq.io"
             for _ in range(120)]
    datasets = ["raw_layer", "staging_layer", "core_layer", "analytics_layer",
                "metadata", "governance", "ops", "cost"]
    out = []
    for _ in range(rows):
        gb = random.lognormvariate(0.5, 1.4)  # GB processed
        cost = gb * 0.0005                     # on-demand ~ $5/TB
        out.append({
            "job_id": f"zumiq-prod:US.{uuid.uuid4().hex[:12]}",
            "query_id": random.choice([None, "exec_dash", "ops_dash", "dq_run",
                                       "ad_hoc", "extract", None]),
            "user_email": random.choice(users),
            "project_id": PROJECT, "dataset_id": random.choice(datasets),
            "job_time": datetime.combine(d, datetime.min.time()) +
                        timedelta(minutes=random.randint(0, 1439)),
            "job_date": d, "job_type": "QUERY",
            "bytes_billed": int(gb * 1e9), "bytes_processed": int(gb * 1e9),
            "total_slot_ms": random.randint(100_000, 50_000_000),
            "cost_usd": round(cost, 6),
            "table_reference": f"zumiq-prod.{random.choice(datasets)}.*",
            "cache_hit": random.random() < 0.25,
            "query_labels": '{"team":"analytics","cost_center":"CC-1142"}',
            "etl_loaded_at": datetime.utcnow(),
        })
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--start", type=lambda s: date.fromisoformat(s),
                    default=date(2026, 4, 16))
    args = ap.parse_args()
    client = bigquery.Client(project=PROJECT)

    for i in range(args.days):
        d = args.start + timedelta(days=i)
        print(f"Seeding {d}")
        client.load_table_from_json(
            gen_transactions(client, d, 200_000),
            f"{PROJECT}.core_layer.fct_transactions",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
        client.load_table_from_json(
            gen_ops_events(client, d, 500_000),
            f"{PROJECT}.core_layer.fct_operations_events",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
        client.load_table_from_json(
            gen_support(client, d, 4_000),
            f"{PROJECT}.core_layer.fct_support_cases",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
        client.load_table_from_json(
            gen_activity(client, d, 15_000),
            f"{PROJECT}.core_layer.fct_employee_activity",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
        client.load_table_from_json(
            gen_pipelines(client, d),
            f"{PROJECT}.ops.fct_pipeline_runs",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()
        client.load_table_from_json(
            gen_query_cost(client, d, 5_000),
            f"{PROJECT}.cost.fct_query_cost",
            job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")).result()

    print("Seeding complete.")


if __name__ == "__main__":
    main()
