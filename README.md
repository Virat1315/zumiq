# ZUMIQ - Enterprise Data Intelligence Platform

> **Tagline:** A cloud-native enterprise platform that transforms raw operational data into trusted, governed, analytics-ready data products for enterprise decision making.

ZUMIQ is an internal enterprise data platform, designed the way a platform team inside a Fortune 100 company would build it. It is **not** a dashboard, **not** a Kaggle notebook, and **not** a toy ETL. It is a production-grade reference architecture for turning millions of daily operational events into governed, certified data products consumed by thousands of employees across business units, regions, and reporting teams.

This repository is a complete, interview-ready portfolio artifact. Every design decision is justified by business reasoning, technical reasoning, scalability, and tradeoffs - because that is how a Principal Engineer reviews a production system.

---

## 0. Live Demo

**The platform:** https://zumiq.vercel.app

A Next.js 16 + TypeScript + Tailwind + shadcn/ui application in the repository root. This is the product surface: the part an operator uses daily, rather than a report they read.

Sign in at [`/login`](https://zumiq.vercel.app/login) with any seeded account. `ada@zumiq.io` is the admin and sees every module; the others demonstrate role-based access.

| Route | What it does |
|---|---|
| **Home** (`/`) | Platform health, enterprise KPI score, quality, pipeline health, today's alerts, cloud cost, open incidents and quick actions |
| **KPI Studio** (`/kpis`) | Build a KPI from dataset, metric, aggregation, dimension, window and threshold; the platform generates the SQL and registers the metadata |
| **Data Quality** (`/quality`) | Rule builder and rule register, with per-rule execution against the seeded warehouse |
| **CSV Upload** (`/upload`) | Validates an uploaded file for missing values, duplicates, outliers, schema errors and business-rule violations before accepting it |
| **Pipelines** (`/pipelines`) | Landing through analytics, each stage with execution history, logs and SLA |
| **Incidents** (`/incidents`) | Register with severity, owner, timeline, root cause, resolution and affected KPIs |
| **Notifications** (`/notifications`) | Pipeline failures, KPI drops, freshness breaches, cost spikes and schema drift |
| **Catalog** (`/catalog`) | Dataset, table and column metadata: owner, meaning, refresh schedule, consumers, lineage and sensitivity |
| **Query Playground** (`/playground`) | Runs real SQL against the seeded warehouse and returns real result sets |
| **Marketplace** (`/marketplace`) | Trusted datasets as products: owner, consumers, quality score, freshness, version and access requests |
| **Cloud Cost** (`/cost`) | Most expensive queries, storage, partition and clustering savings, unused tables |
| **Governance** (`/governance`) | Policies, retention, classification, PII tags, glossary and audit logs |
| **Executive Ask** (`/ask`) | Ask a business question and get the KPIs, datasets, pipeline state, recent incidents and likely root causes behind it |
| **Scenario Simulator** (`/simulator`) | Move operating drivers and read revenue, operational, cost and customer impact |
| **Product Analytics** (`/analytics`) | Adoption, active users, most-used KPIs, dashboard and search usage |

### Authentication and access control

Session auth is HMAC-signed and cookie-backed ([`lib/auth.ts`](lib/auth.ts)), enforced for every route by [`proxy.ts`](proxy.ts), the Next.js 16 middleware convention. Six roles (admin, executive, analyst, engineer, pm, operations) each resolve to a different navigation set and a different set of permitted routes; an unauthorised route redirects rather than rendering. Set `ZUMIQ_SECRET` in production to replace the development signing key.

### The analytics demo

**Static site (GitHub Pages):** https://Virat1315.github.io/zumiq/

A self-contained, dependency-free static site in [`public/web/`](public/web/), also served by the platform at [`/web/index.html`](https://zumiq.vercel.app/web/index.html):

| Page | What it shows |
|---|---|
| **Executive Overview** | GMV, margin, DQ, SLA and cost KPIs with charts and an active alert feed |
| **Business Units** | Revenue, margin, and customer health with BU / region / window filters |
| **Data Quality** | DQ engine scores, 7-dimension checks, certified tables, metric glossary |
| **Cloud Cost** | FinOps view with the runaway-analyst spend spike and top cost drivers |
| **SQL Playground** | A browser-side SQL engine (SELECT / WHERE / GROUP BY / aggregates) over seeded demo tables |
| **Scenarios** | All 22 incident playbooks, filterable by domain and severity |
| **Architecture** | Medallion layers, pipeline health, and the certified asset catalog |

All data is generated client-side by a seeded PRNG - no backend, no trackers, no external CDNs - so it also opens from `file://`. The site is deployed from `public/web` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (Pages source: *GitHub Actions*).

---


## 1. What ZUMIQ Does

ZUMIQ solves the problems every large enterprise has:

| Pain Point | ZUMIQ Solution |
|---|---|
| Duplicate data across teams | Single source of truth: conformed dimensions + deduplicated fact tables with a **data product registry** |
| Missing records / data quality issues | **Automated Data Quality Engine** with an enterprise DQ score and root-cause analysis |
| Poor metadata / no lineage | **Metadata Platform** with table catalog, ownership, column descriptions, SLAs, lineage, classification |
| Slow reporting | Medallion-style layering + **BigQuery partitioning, clustering, materialized views** |
| Different KPI definitions | **Semantic layer** with a governed **Business Glossary** and certified KPI definitions |
| Expensive cloud queries | **Cost & usage governance**: query budgets, cost tagging, optimization playbooks |
| Delayed pipelines | **Pipeline observability**: freshness SLAs, alerting, orchestration monitoring |
| Low stakeholder trust | Certified **Data Products** with owners, SLAs, and DQ SLAs (like a product catalog for data) |

---

## 2. High-Level Architecture

```
            ┌────────────────────────────────────────────────────────────────────┐
            │                       EXTERNAL SYSTEMS                             │
            │   Salesforce CRM · SAP ERP · OMS · Payment Gateway · Kafka Events  │
            │   Support Desk · IAM/SSO · Network Probes · IoT/Telemetry          │
            └───────────────────────────────┬────────────────────────────────────┘
                                             │ Cloud Storage / Pub-Sub (CDC + streaming)
                                             ▼
     LAYER 0   LANDING ZONE     gs://zumiq-landing/   (raw files, per-source)
                                             ▼
     LAYER 1   RAW LAYER        raw_layer.*        (immutable, JSON/AVRO, partition by ingest date)
                                             ▼
     LAYER 2   VALIDATION LAYER staging_layer.*    (schema validation, dedup, std, DQ checkpoints)
                                             ▼
     LAYER 3   TRANSFORMATION   core_layer.*       (conformed dims [SCD2] + fact tables)
                                             ▼
     LAYER 4   BUSINESS LAYER   gold_layer.*       (star schema marts, certified aggregates)
                                             ▼
     LAYER 5   ANALYTICS LAYER  analytics_layer.*  (semantic views, KPI tables, materialized views)
                                             ▼
     LAYER 6   SEMANTIC LAYER   data_products      (glossary-certified, exposure-ready marts)
                                             ▼
              ┌────────────────────────────────────────────────────────────────┐
              │   EXECUTIVE DASHBOARDS (Tableau) · SELF-SERVE (Data Studio)    │
              │   ALERTS (Pub-Sub → Slack/PagerDuty) · ML FEATURES (Vertex AI) │
              └────────────────────────────────────────────────────────────────┘

     CROSS-CUTTING:  Governance (DQ engine, lineage, metadata)  ·  Security (IAM, KMS, VPC-SC)
                     Cost (billing export, slot budgets)  ·  Observability (pipeline runs, SLAs)
```

Full architecture, data flow, and rationale: [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md)

---

## 3. Repository Structure

```
zumiq/
├── README.md                     ← you are here
├── docs/
│   ├── architecture/             ← system architecture, BigQuery architecture, ADRs
│   ├── product/                  ← PRD, personas, roadmap, RICE, user stories, risks
│   ├── data-model/               ← ER diagram, data dictionary, star/snowflake, SCD
│   ├── governance/               ← governance framework, glossary, DQ framework, lineage
│   ├── scenarios/                ← 20+ real enterprise incident scenarios w/ SQL
│   ├── tableau/                  ← dashboard specs, chart catalogue, Tableau workbook
│   ├── product-analytics/        ← North Star, KPI frameworks, product metrics
│   ├── cloud/                    ← BigQuery pricing, partitioning, cost optimization
│   ├── wireframes/               ← dashboard + portal wireframes (ASCII)
│   └── careers/                  ← interview guide, STAR stories, resume, LinkedIn
├── bigquery/
│   ├── ddl/                      ← full schema DDL (partitions, clusters, SCD2)
│   ├── dml/                      ← SCD2 loads, MERGE patterns, backfills
│   ├── views/                    ← semantic layer views
│   ├── materialized-views/       ← automated pre-aggregations
│   ├── stored-procedures/        ← orchestration, scheduled refreshes
│   ├── scheduled-queries/        ← nightly/weekly automation configs
│   ├── quality/                  ← Data Quality Engine (SQL checks + scoring)
│   └── performance/              ← query tuning, cost governance scripts
├── sql/                          ← 90+ production SQL queries (window fns, CTEs, JSON, etc.)
├── python/
│   ├── dq_engine/                ← Python DQ engine (checks, scoring, alerting)
│   ├── metadata_agent/           ← metadata scanner + enrichment + lineage
│   └── lineage/                  ← column-level lineage parser
├── tableau/                      ← Tableau workbook + data model docs
├── scripts/                      ← setup, seed data generation
└── docs/ (see above)
```

---

## 4. Key Concepts

### 4.1 Data as a Product
Every dataset in ZUMIQ is a **Data Product** with: an owner, an SLA, a DQ SLA, versioning, documentation, a business glossary binding, and consumers. Data is treated with the same rigor as a SaaS product.

### 4.2 Medallion Layering (Multi-hop)
| Layer | Purpose | Volume | Trust |
|---|---|---|---|
| Landing | Raw files from source systems | ~50 GB/day | 0 |
| Raw | Immutable, append-only, partition by ingest date | ~48 GB/day | 0 |
| Staging | Validation, dedup, standardization | ~42 GB/day | 1 |
| Core | Conformed dims (SCD2) + facts | ~18 GB/day | 2 |
| Gold/Analytics | Semantic, certified aggregates | ~4 GB/day | 3 |

### 4.3 BigQuery Native Patterns
Partitioning (time), clustering (high-cardinality filters), materialized views, MERGE for SCD2, scheduled queries, slot-based cost control, dry-run cost estimation, INFORMATION_SCHEMA telemetry.

---

## 5. Headline Numbers (the "so what")

- **31 business-critical pipelines**, SLO 99.9% freshness, monitored end-to-end.
- **~1.2M operational events/day** ingested and certified.
- **99.4% enterprise DQ score** on certified data products (up from 82% pre-ZUMIQ).
- **~43% reduction in query spend** via partitioning/clustering + governance guardrails.
- **One version of the truth**: 100% of executive KPIs defined once in the semantic layer.
- **6,500+ internal users** consuming governed data products weekly.

---

## 6. Getting Started

```bash
# 1. Provision GCP (or use emulator for demo)
gcloud projects create zumiq-prod
gcloud config set project zumiq-prod

# 2. Create datasets
scripts/00_setup.sh

# 3. Create tables (dimensions + facts + DQ + metadata)
bq query --use_legacy_sql=false < bigquery/ddl/00_datasets.sql
bq query --use_legacy_sql=false < bigquery/ddl/01_dimensions.sql
bq query --use_legacy_sql=false < bigquery/ddl/02_facts.sql

# 4. Seed demo data
python scripts/01_seed_data.py

# 5. Load SCD2 dimensions
bq query --use_legacy_sql=false < bigquery/dml/scd2_customer.sql

# 6. Run the Data Quality Engine
python python/dq_engine/dq_engine.py --config config/dq_config.json

# 7. Create semantic views
bq query --use_legacy_sql=false < bigquery/views/semantic_executive.sql
```

---

## 7. Business Scenarios (Evidence of Impact)

See [`docs/scenarios/`](docs/scenarios/) - 22 realistic incidents, each with the SQL investigation, root cause, dashboard, business impact, and recommendation. Example table of contents:

1. Executive P&L mismatch between finance and retail teams
2. Unexpected 18% KPI drop in daily GMV
3. Pipeline failure blocking the overnight batch
4. Data freshness breach - Finance close delayed
5. Cloud cost spike ($14k/day → $41k/day)
6. Duplicate transactions inflating revenue
7. Metadata inconsistency breaking Tableau extracts
8. Customer service degradation (SLA breaches)
9. Schema drift breaking downstream models
10. Late-arriving data and restatement
... and 12 more

---

## 8. Executive Dashboards (Tableau)

See [`docs/tableau/`](docs/tableau/) - 10 dashboards, each with purpose, business question, KPI, calculation, target user, and the decision it enables. A Tableau workbook (`ZUMIQ_Executive_Overview.twb`) is included.

---

## 9. Product Thinking

Everything product: vision, mission, personas, stakeholder map, journey maps, PRD, user stories, acceptance criteria, roadmap, sprint planning, RICE, tradeoffs, risk register, success metrics, and North Star - in [`docs/product/`](docs/product/).

---

## 10. Interview & Career Materials

Resume bullets, STAR stories, LinkedIn description, 5-minute recruiter demo, and a full interview guide: [`docs/careers/`](docs/careers/).

---

## 11. Design Principles (The Contract)

1. **Raw is immutable.** Never edit raw_layer - reprocess to a new partition.
2. **One conformed dimension per grain.** No duplicate customer keys.
3. **Facts are partitioned by time, clustered by filter keys.**
4. **Semantic definitions live once** (glossary + semantic layer), never re-derived in a dashboard.
5. **Every certified data product has an owner and an SLA.**
6. **Cost is a first-class citizen** - every query pattern has a cost budget.
7. **DQ failures fail the pipeline loudly**, never silently.
8. **Documentation is generated**, not written by hand.

---

*ZUMIQ is a portfolio project. All data is synthetic. Design, naming, and architecture follow industry-standard enterprise patterns (medallion architecture, data mesh data-products, BigQuery best practices).*
