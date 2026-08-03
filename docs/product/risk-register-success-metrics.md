# ZUMIQ - Risk Register & Success Metrics

## 1. Risk Register

| ID | Risk | Prob | Impact | Score | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R1 | Stakeholders trust old spreadsheets more than ZUMIQ | Med | High | High | Executive sponsorship, champion network, "one number" pledge, deprecation | Data PM | OPEN |
| R2 | Data owners don't accept accountability | Med | High | High | Exec sponsorship, owner named publicly, SLA review in exec cadence | Data PM | OPEN |
| R3 | Cloud cost grows faster than value | Med | High | High | Budgets, anomaly alerts, MV, dry-run CI, monthly FinOps review | FinOps | MITIGATING |
| R4 | DQ engine noise (false positives) kills adoption | Med | Med | Med | Severity model, threshold tuning, runbook, alert precision review | DQ team | MITIGATING |
| R5 | Legacy teams keep parallel tables | High | Med | Med | Certification gate, glossary audit, deprecation policy | Data PM | OPEN |
| R6 | Schema drift on critical source | Med | High | High | Metadata drift scan + paging + schema registry | Platform | MITIGATING |
| R7 | Restatement process is misused (double counting) | Low | High | Med | As-of SCD2 joins, versioned marts, DQ consistency check | Finance | MITIGATING |
| R8 | PII exposure via self-serve | Low | High | Med | Sensitivity flags, masking, DLP, row-level security | Security | MITIGATING |
| R9 | Talent: analytics engineers bottleneck | High | Med | Med | SQL CI/CD (Dataform), rule catalog = config, self-serve | Platform | OPEN |
| R10 | Regulator asks for proof of data integrity | Low | High | Med | Append-only audit trail (pipeline + DQ + alerts) | Platform | MITIGATING |

## 2. Success Metrics Framework

### North Star
**Weekly Trusted Decisions (WTD)** - certified-product dashboard views + API
calls per week. Target: 2× in 12 months.

### Guardrail Metrics (can't sacrifice)
| Guardrail | Threshold | Why |
|---|---|---|
| Cloud cost per TB processed | ≤ $6.0 | Platform must be affordable |
| Pipeline success rate | ≥ 99.9% | Availability promise |
| Enterprise DQ score | ≥ 95 floor | Trust non-negotiable |
| PII breach count | 0 | Security non-negotiable |
| Alert MTTR | < 4h HIGH | We must respond fast |

### Input Metrics (what we control)
- Certified tables added / quarter
- DQ rule catalog growth + coverage
- Metadata/lineage coverage %
- SLA coverage of T1 tables

### Output Metrics (what stakeholders feel)
- WTD (north star)
- Self-serve query count on certified marts
- Report delivery time (age of data in reports)
- Dashboards live & adopted
- Restatement error count

### Product Adoption Metrics
- Weekly active analysts
- Dashboards viewed / week (per dashboard)
- Stale dashboard detection (30-day no view)
- Certified coverage % (certified T1 / total T1)
- Query reuse (redundant query detection)
- DQ alert acknowledgment time

## 3. Measurement Cadence

| Metric | Cadence | Audience |
|---|---|---|
| WTD + adoption | Weekly | Data PM |
| DQ scorecard | Daily | DQ + platform |
| Cost & budgets | Daily / monthly | FinOps |
| SLA attainment | Daily | CX Ops |
| Exec KPIs | Daily | Exec |
| MTTR / incident | Weekly | Platform |
| Guardrail health | Daily | All (dashboard) |

## 4. Experiment Log (examples of product thinking in action)

| Experiment | Hypothesis | Result | Decision |
|---|---|---|---|
| Show DQ badge on every dashboard | Trust ↑ adoption ↑ | DQ badge → +22% views on certified dashboards | Ship: badge everywhere |
| Auto-alert redundant queries | Cost ↓ | 14% of queries redundant → MV candidates | Ship: MV for top 3 |
| Dry-run gate in CI | Cost ↓ | Blocked 11 PRs >5TB in 6 weeks | Ship: keep, tighten |
| Weekly "one number" email to execs | Trust ↑ | GMV disputes dropped to 0 | Ship: automate |
| Looker Studio pilot | Adoption ↑ | 30% of light users prefer it | Hold: Q4 |
