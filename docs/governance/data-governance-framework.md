# ZUMIQ — Data Governance Framework

> The rules that make "trusted data" operational: ownership, classification,
> SLAs, certification, and accountability. Governance here is an **operating
> system**, not a policy PDF.

## 1. Operating Model — RACI

| Activity | Data Owner | Steward | Analytics Eng | Platform Team | Data Product Manager |
|---|---|---|---|---|---|
| Define business metric | A | R | C | C | C |
| Own data quality floor | C | R | C | I | C |
| Maintain glossary term | C | R | C | I | I |
| Certification of data product | C | C | R | C | A |
| SLA definition | A | R | C | C | C |
| Sensitive data handling | A | R | I | R | C |
| Pipeline fixes | I | I | C | R | I |

R=responsible, A=accountable, C=consulted, I=informed.

## 2. Classification & Access

| Class | Examples | Access rule |
|---|---|---|
| PUBLIC | dim_date, dim_region | Any employee |
| INTERNAL | most facts | On request |
| CONFIDENTIAL | P&L, GMV by BU | Approve + audit |
| RESTRICTED | PII, PAN, PHI | Minimal, masked at semantic layer |

- **IAM**: dataset-level roles; gold marts give `roles/bigquery.dataViewer`
  to analyst groups; admin rights are the platform team only.
- **DLP**: scans for PII patterns; mismatches → alert.
- **Row-level security**: applied on gold marts for CONFIDENTIAL products.

## 3. Data Product Lifecycle

```
 REQUEST → BUILD → VALIDATE (DQ floor) → CERTIFY → PUBLISH → OPERATE → DEPRECATE
                     ▲                                        │
                     └── fail DQ → fix → revalidate ──────────┘
```
- **Certification** requires: owner named, SLA set, DQ floor ≥ 95, glossary
  binding, lineage recorded, classification set.
- **Deprecation**: 2-sprint notice, consumers mapped via lineage, migration
  support from the platform team.

## 4. SLAs & SLOs (the commitments)

| SLO | Target | Monitored by |
|---|---|---|
| Freshness per certified product | meets `table_catalog.sla_hours` | freshness alert |
| Pipeline success (30d) | 99.9% | `ops.fct_pipeline_runs` |
| DQ score per product | ≥ floor (95–100) | DQ engine |
| Alert MTTR | < 4h (HIGH), < 24h (MED) | `ops.alert_history` |
| KPI definition conflicts | 0 (certified only) | glossary audit |

## 5. Incident Response (for data incidents)

1. **Detect** — DQ / freshness / cost / pipeline alerts (auto).
2. **Triage** — platform on-call; severity = business impact.
3. **Contain** — stop bad promotion; alert consumers via lineage.
4. **Investigate** — root-cause (see scenario playbooks in /scenarios).
5. **Remediate** — fix pipeline, reprocess partitions, add DQ rule.
6. **Learn** — write a new DQ rule + postmortem; exec summary if P1.

## 6. Certification Review Checklist

- [ ] Owner, steward, and support team assigned
- [ ] SLA + DQ floor defined and being met
- [ ] Metric definitions certified in glossary
- [ ] Lineage recorded for all columns
- [ ] Classification & sensitivity set
- [ ] Documentation current (auto-generated)
- [ ] Backup/restore + reprocessing tested
- [ ] Consumers notified on the platform

## 7. Audit & Compliance

`ops.fct_pipeline_runs` + `governance.dq_run_results` + `ops.alert_history`
form a complete, append-only audit trail. For SOX-relevant products (Finance
P&L) we can reconstruct: what was loaded, when, by which job, whether it
passed DQ, and what alerts fired — exactly what a regulator asks for.
