# ZUMIQ — Product Requirements Document (PRD)

> Version 2.1 · Status: APPROVED · Owner: Data Product Manager
> Reviewers: Analytics Engineering, Data Engineering, Finance, CX Ops, FinOps.

## 1. Overview

ZUMIQ is the enterprise data intelligence platform that converts raw
operational data from 9+ source systems into certified, governed data products.
It replaces a broken status quo of duplicated pipelines, conflicting KPI
definitions, invisible data quality, and unmanaged cloud cost.

**Problem statement:** Business teams cannot trust, find, or afford the data
they need. Evidence: 7 conflicting revenue definitions; 61% of tables unowned;
average report age 5–9 days; $27k single-user weekly query cost; unknown DQ
defect rates.

**User/market need:** Every persona (executive, analyst, platform engineer,
CX ops, FinOps) needs data that is *trusted, findable, fresh, and cheap to use*.

## 2. Goals & Non-Goals

### Goals (this release)
1. Certified data products for the top 5 domains: P&L, Customer 360,
   Operations Health, Support SLA, Platform Health, Cost Governance.
2. Automated DQ engine with enterprise scorecard and alerting.
3. Metadata catalog + lineage + glossary (self-describing platform).
4. Cost governance with budgets and anomaly alerting.
5. Executive dashboards on certified semantics.

### Non-Goals (explicitly out)
- Real-time ML / fraud detection models.
- Customer-facing analytics (this is internal).
- Legacy migration of all 1,400 legacy tables (phased).
- Multi-cloud data federation (GCP only this cycle).

## 3. Users & Personas
(see personas-stakeholders-journeys.md) — 5 primary personas.

## 4. Functional Requirements

### FR-1 · Data Ingestion & Layering
- FR-1.1 Ingest 9+ source systems (CDC, batch, streaming) into landing → raw.
- FR-1.2 Raw layer immutable; reprocessing appends to new partitions only.
- FR-1.3 Validation layer deduplicates, standardizes, and DQ-checkpoints.

### FR-2 · Data Products
- FR-2.1 Every certified product has owner, SLA, DQ floor, classification.
- FR-2.2 Certification is a promotion gate (DQ must pass).
- FR-2.3 Versioning supports as-of/restatement.

### FR-3 · Data Quality Engine
- FR-3.1 9 dimensions (completeness … volume).
- FR-3.2 Rule catalog, append-only results, severity-weighted scoring.
- FR-3.3 Enterprise scorecard + automatic recommendations + alerts.

### FR-4 · Metadata & Lineage
- FR-4.1 Auto-catalog tables/columns; sensitivity flags (PII/PCI/PHI).
- FR-4.2 Column-level lineage; recursive impact analysis.
- FR-4.3 Certified business glossary; versioned definitions.

### FR-5 · Cost Governance
- FR-5.1 Per-job cost telemetry; team budgets via labels.
- FR-5.2 Anomaly detection; dry-run cost gate in CI.

### FR-6 · Executive & Self-Serve Analytics
- FR-6.1 Certified semantic views power Tableau dashboards.
- FR-6.2 Analysts query gold marts directly (self-serve) within budgets.

### FR-7 · Observability & Alerts
- FR-7.1 Pipeline runs, freshness, DQ, cost all in one alert queue.
- FR-7.2 MTTR tracked; severity-based escalation.

## 5. Non-Functional Requirements

| NFR | Requirement |
|---|---|
| Performance | Exec dashboard p95 < 3s; 30-day GMV query < 10s |
| Freshness | T1 data fresh by 07:30 ET; ops streaming < 1 min |
| Availability | 99.9% pipeline success; dashboards 24×7 |
| Scalability | 10× volume without redesign (partition/CLUSTER/MV) |
| Security | IAM least privilege; VPC-SC; CMEK; DLP; masking |
| Compliance | SOX audit trail: load + DQ + alert history append-only |
| Cost | Query spend ≤ budget; dry-run gate blocks >5 TB scans |
| Observability | Every job logged; every alert has MTTR |

## 6. User Stories & Acceptance Criteria (subset)

**US-01 — Analyst can find the right table**
> As a data analyst, I want to search the catalog by business term so that I
> use the certified table, not a stale copy.
- AC: catalog returns certified table for a glossary term; shows owner, SLA,
  DQ score; links lineage.

**US-02 — Executive sees one number**
> As an executive, I want one GMV number across all dashboards.
- AC: all dashboards read the certified view; glossary term is CERTIFIED;
  any difference raises a platform alert.

**US-03 — DQ failure is visible**
> As a platform engineer, I want a DQ failure to block promotion and page me.
- AC: ERROR-severity failure → status FAIL → promotion blocked → HIGH alert
  with table + sample rows.

**US-04 — Cost anomaly is caught**
> As FinOps, I want to be alerted when any user's daily cost spikes.
- AC: daily cost > $1k → alert; top-spender report ready by 9:00 ET.

**US-05 — Restatement is safe**
> As Finance, I want to recompute last quarter with correct product margins.
- AC: `sp_recompute_executive_kpis` recomputes window; version bumps; lineage
  shows affected dashboards.

**US-06 — Freshness SLA is enforced**
> As a BU head, I want my morning data to always be there.
- AC: T1 tables load by 07:30 ET or a HIGH alert fires with escalation.

## 7. Release Criteria (Definition of Done for v1)

- [ ] 6 certified data products live with owners + SLAs + DQ floors
- [ ] DQ engine running nightly with 100% T1 coverage and scorecard
- [ ] Metadata agent + lineage live; 0 unregistered T1 tables
- [ ] Cost telemetry + budgets + anomaly alerts live
- [ ] Exec dashboard p95 < 3s; one version of the truth verified
- [ ] 90-day soak with zero silent failures

## 8. Risks (see risk-register.md for full)
1. Adoption stalls if governance feels heavy → governance must be invisible.
2. Data owners don't want accountability → exec sponsorship + naming.
3. Cost of gold layer grows → MV + budgets + regular review.
4. Legacy teams keep parallel tables → certification gate + deprecation.

## 9. Open Questions
- Q1: Should self-serve go to Looker Studio for lightweight users?
- Q2: Do we expose RESTRICTED data to regulated BUs via API only?
- Q3: When do we move to flat-rate slot reservations permanently?

## 10. Success Metrics (see success-metrics.md)
North Star: Weekly Trusted Decisions. Guardrails: cost/TB, pipeline success,
DQ floor, PII breach count.
