# ZUMIQ - System Architecture

> Full end-to-end architecture, from external systems to executive dashboards.
> This is the "principal engineer" view: every hop justified by business need,
> cost, and failure mode.

## 1. Context Diagram

```
                         ┌──────────────────────────────┐
                         │      ZUMIQ PLATFORM          │
                         │                              │
 ┌─────────────┐  CDC    │  ┌────────┐   ┌─────────┐    │  Tableau
 │ Salesforce  │────────►│  │Landing │──►│  Raw    │    │  Looker
 │ CRM         │         │  └────────┘   └─────────┘    │  ZUMIQ Portal
 └─────────────┘         │                              │  ML (Vertex)
 ┌─────────────┐  API    │  ┌────────┐   ┌─────────┐    │
 │ SAP ERP     │────────►│  │Staging │──►│  Core   │    │
 └─────────────┘         │  └────────┘   └─────────┘    │
 ┌─────────────┐  Kafka  │                              │
 │ OMS / Events│────────►│  ┌────────┐   ┌─────────┐    │
 └─────────────┘         │  │ Gold   │──►│Analytics│    │
 ┌─────────────┐  API    │  └────────┘   └─────────┘    │
 │ Support/ITSM│────────►│                              │
 └─────────────┘         │  Governance │ Metadata │ Cost │
 ┌─────────────┐  IAM    │                              │
 │ SSO / IAM   │────────►│  Alerts → Slack / PagerDuty  │
 └─────────────┘         └──────────────────────────────┘
```

## 2. Data Flow - Layer by Layer

| # | Layer | Dataset | Storage | Volume/Day | Transform | Consumers |
|---|---|---|---|---|---|---|
| 0 | Landing | `landing_zone` | Cloud Storage (raw files) | ~50 GB | none (schema-on-read) | - |
| 1 | Raw | `raw_layer` | BigQuery immutable, partition by ingest date | ~48 GB | append only, no update | platform only |
| 2 | Validation | `staging_layer` | BigQuery, DQ checkpointed | ~42 GB | schema validate, dedup, std | platform only |
| 3 | Transformation | `core_layer` | BigQuery SCD2 dims + facts | ~18 GB | conforming, SCD2, business logic | analytics teams |
| 4 | Business | `gold_layer` | BigQuery star marts + aggregates | ~4 GB | certified aggregates | BI consumers |
| 5 | Analytics+Semantic | `analytics_layer` | BigQuery views + MV + KPI tables | compute | glossarized metric definitions | dashboards, self-serve |
| - | Governance | `governance`, `metadata` | BigQuery | small | DQ engine, metadata agent, lineage | platform, auditors |
| - | Ops & Cost | `ops`, `cost` | BigQuery | small | pipeline observability, FinOps | SRE, FinOps, product |

**Design rationale (multi-hop):**
- The **raw → staging** hop makes validation explicit and re-runnable.
- The **staging → core** hop is where *meaning* is created (conforming, SCD2).
- The **core → gold/analytics** hop is where *certification* happens.
- Rebuilding any downstream hop never touches upstream data - the platform can
  reprocess a layer without affecting consumers until it's ready.

## 3. Ingestion Patterns

| Source | Pattern | Latency | Tooling |
|---|---|---|---|
| Salesforce CRM | CDC via Change Data Capture → landing | 15 min | Dataflow / Cloud Functions |
| SAP ERP | Batch file drop → landing → raw | 4h | Cloud Storage + transfers |
| OMS / payment events | Kafka → Pub/Sub → BigQuery (streaming) | <1 min | Dataflow streaming |
| Support cases | API poll → landing | 15 min | Cloud Scheduler + Functions |
| IAM/SSO activity | Batch log export | 1h | Cloud Logging → BQ sink |
| IoT/warehouse | MQTT → Pub/Sub → BigQuery | <1 min | IoT Core + streaming |

## 4. Transformation & Orchestration

- **Orchestration**: Cloud Composer (Airflow) DAGs; BigQuery scheduled queries
  for simple refreshes; Dataform for SQL CI/CD (dev → staging → prod).
- **State**: `ops.fct_pipeline_runs` is written by every job - one observability
  table for all pipelines (the "single pane of glass").
- **Idempotency**: every job uses partition-scoped DELETE+INSERT or MERGE.
- **Failures**: status FAILED → alert; DQ failure blocks promotion to certified.

## 5. Semantic Layer & Certification

- All metric formulas live in `analytics_layer` views + `business_glossary`.
- Dashboards reference views, never raw formulas → **one version of the truth**.
- `materialized views` auto-increment for hot aggregations (exec dashboard).
- Tableau connects to semantic views only (RESTRICTED fields masked).

## 6. Governance, Security & Cost (cross-cutting)

- **Security**: IAM on datasets (need-to-know), VPC-SC, CMEK encryption,
  DLP for PII, row-level security on gold marts.
- **Cost**: slot reservations, per-team budgets + labels, `cost.fct_query_cost`
  telemetry, anomaly alerts, dry-run cost estimates in CI.
- **Quality**: DQ engine (see DQ framework) - 9 dimensions, auto-alerting.
- **Audit**: `ops.alert_history` + DQ run results + pipeline runs = full
  audit trail for regulators (SOX for Finance data products).

## 7. Reliability & SLAs

- Freshness SLO per data product (see metadata catalog).
- Pipeline success SLO 99.9% (rolling 30d).
- DQ floor per product (95–100).
- Alert MTTR tracked and reported to execs monthly.

## 8. Failure Modes & Mitigations (what can break)

| Failure | Detection | Mitigation |
|---|---|---|
| Source schema change | Metadata agent drift scan | Schema registry + pager |
| Late source feed | Freshness alert | SLA escalation chain |
| Corrupt batch | DQ engine volume/validity | Fail the pipeline, alert |
| KPI definition conflict | Glossary governance | Certified terms only |
| Query cost spike | FinOps anomaly query | Budget alerts, dry-run in CI |
| Dashboard latency | MV staleness + perf views | Materialized views, extracts |
| PII leak | Sensitivity flags + DLP | Mask at semantic layer |
| Restatement need | Lineage impact analysis | As-of joins, versioned marts |
