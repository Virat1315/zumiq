# ZUMIQ - Architecture Decision Records (ADRs)

> Decisions made, options considered, tradeoffs accepted. This is how a real
> platform team documents why the system looks the way it does.

## ADR-001 · Medallion (multi-hop) layering over single-zone staging

**Status:** Accepted
**Context:** Teams kept building point-to-point pipelines that duplicated work
and definitions; nobody trusted the "shared" tables.
**Decision:** Five explicit layers (landing → raw → staging → core → gold/analytics)
with a governance/metadata/cost cross-cutting plane.
**Options considered:** Single "all-in-one" staging; data mesh per-domain;
lakehouse (Iceberg) without curated layers.
**Tradeoffs:** Multi-hop costs ~4h of end-to-end latency and storage copies,
but buys re-runnability, certification boundaries, and one source of truth.
**Consequence:** Freshness SLAs are explicit per hop; ~2x storage for the
convenience of reprocessing (raw is the recovery point).

## ADR-002 · BigQuery as the single warehouse engine

**Status:** Accepted
**Context:** Existing stack had Redshift + Postgres + Snowflake ad-hoc use.
**Decision:** BigQuery for everything structured; Cloud Storage for files;
no other warehouse engine.
**Options:** Snowflake (stronger scaling story, higher $), Databricks (better
ML, heavier ops).
**Tradeoffs:** BigQuery won on cost-per-query at our volume, serverless ops,
native MVs/streaming, and multi-region. Tradeoff: flat-rate vs on-demand needs
active FinOps (addressed by ADR-006).
**Consequence:** Standardized on INFORMATION_SCHEMA telemetry, dry-run CI.

## ADR-003 · SCD Type 2 for customer/account/product, Type 1 for regions

**Status:** Accepted
**Context:** Finance needed point-in-time margin; CRM needed history; regions
were static.
**Decision:** Type 2 for entities whose attributes change and are audited;
Type 1 for pure corrections.
**Options:** Type 4 mini-dims (rejected: complexity > benefit at this scale).
**Tradeoff:** Type 2 grows storage (negligible here) and requires joins to
guard `is_current = TRUE` (enforced by DQ check).
**Consequence:** As-of joins available for restatements; every dashboard join
uses the current-version guard.

## ADR-004 · Facts partitioned by date, clustered by consumer filter keys

**Status:** Accepted
**Context:** Dashboard latency and cost were driven by full-table scans.
**Decision:** Every fact partitions on its always-filtered date column and
clusters on the next 2–3 most selective consumer keys.
**Options:** Integer-range partitions (rejected - adds complexity, no benefit
at daily grain); no clustering (rejected - cost).
**Consequence:** 43% spend reduction; must re-cluster after massive deletes
(rare; handled by repartition procedure).

## ADR-005 · Semantic views + materialized views as the certified surface

**Status:** Accepted
**Context:** 11 teams had 7 different definitions of "revenue."
**Decision:** All metrics defined once in `analytics_layer` views, bound to
CERTIFIED glossary terms; hot aggregates become auto-refreshing MVs.
**Options:** Direct-to-dashboard custom SQL (rejected); dbt model only (accepted
as the SQL CI layer, complements views).
**Consequence:** Dashboards cannot define KPIs - they select certified views.

## ADR-006 · Cost as a first-class citizen with labels + telemetry + budgets

**Status:** Accepted
**Context:** A single user's runaway query cost $27k in a week (scenario 05).
**Decision:** Labels on every object; `cost.fct_query_cost` telemetry; per-team
budgets; dry-run gates in CI; FinOps dashboard + anomaly alerts.
**Tradeoff:** Slight overhead (labels, dry-run step) vs preventable spend.
**Consequence:** Predictable monthly cloud bill; anomaly MTTR < 1h.

## ADR-007 · Automated DQ engine with a rule catalog, not scattered checks

**Status:** Accepted
**Context:** Quality checks lived in random notebooks and were ignored.
**Decision:** Centralized `governance.dq_rules` catalog + engine that renders
SQL, scores 9 dimensions, alerts, and blocks promotion on ERROR failures.
**Options:** Great Expectations (great, but heavier and less native to BQ);
custom-only (rejected - no standards).
**Consequence:** Every certified product has a DQ floor and a visible score.

## ADR-008 · Data product ownership model (data mesh philosophy, centralized platform)

**Status:** Accepted
**Context:** Nobody owned "the customer table"; incidents had no owner.
**Decision:** Every certified dataset has an owner team + data owner + steward,
SLA, DQ floor, classification - the data product registry.
**Options:** Full decentralized mesh (rejected - too early, platform risk);
fully centralized (rejected - too slow for BU teams).
**Tradeoff:** Central platform + domain ownership = accountable, but still
fast. The registry is the accountability contract.

## ADR-009 · Column-level lineage auto-parsed + registry-backed

**Status:** Accepted
**Context:** Schema changes broke dashboards silently.
**Decision:** Metadata agent + lineage parser maintain `metadata.lineage_edges`;
impact analysis uses recursive CTE walks.
**Consequence:** Change impact known before rollout; audit-ready lineage.

## ADR-010 · Tableau as the exec/BI front-end on certified views

**Status:** Accepted
**Context:** Execs wanted governed, mobile, high-trust dashboards.
**Decision:** Tableau connected to semantic views (no direct table access for
non-analysts), extract caching for latency, certified workbook governance.
**Options:** Looker (good; overlaps with BQ native); Power BI (licensing
complexity in this enterprise).
**Consequence:** One BI layer, governed data source, self-serve for analysts.
