# ZUMIQ - Personas, Stakeholders & Journey Maps

## 1. Primary Personas

### Persona 1 - "Elena", CFO / Executive
- **Bio**: CFO of a $12B global enterprise. Signs off on quarterly guidance.
- **Goals**: One defensible number. Spot risks early. Hold BUs accountable.
- **Pains**: 7 versions of revenue; KPIs arrive Monday for last week; "why is
  the number different?" meetings.
- **Job to be done**: "Give me the number I can take to the board."
- **ZUMIQ answer**: Executive Overview dashboard, certified KPIs, 7:30 AM T1
  freshness, DQ + cost + health guardrails on one screen.

### Persona 2 - "Priya", Senior Data Analyst (Retail BU)
- **Goals**: Answer BU questions fast, without re-requesting pipelines.
- **Pains**: No metadata; doesn't know which table is current; scared of using
  the wrong definition; her queries are slow and expensive.
- **Job to be done**: "Let me trust the table I'm about to query."
- **ZUMIQ answer**: Catalog + glossary + lineage; semantic views; cost
  guardrails so her queries stay under budget.

### Persona 3 - "Marcus", Analytics Engineer / Platform Engineer
- **Goals**: Ship pipelines that don't page him at night.
- **Pains**: Schema drift breaks downstream silently; DQ checks in random
  notebooks; no single observability view.
- **Job to be done**: "Make failures loud and fixes fast."
- **ZUMIQ answer**: DQ engine + alerts, lineage, pipeline observability table,
  one pane of glass.

### Persona 4 - "Rosa", Head of Customer Experience
- **Goals**: Keep SLA attainment >95%; reduce escalations.
- **Pains**: Case data is messy; SLA board always "looks fine" then execs see
  a different number.
- **Job to be done**: "Show me the real SLA number, and why it moved."
- **ZUMIQ answer**: Certified SLA Attainment metric + CX dashboard + drill-down.

### Persona 5 - "Dev", FinOps Manager
- **Goals**: Predictable cloud bill; nobody surprises finance.
- **Pains**: A query cost $27k with nobody noticing until the invoice.
- **Job to be done**: "Cap the blast radius of any single user."
- **ZUMIQ answer**: cost telemetry, budgets, anomaly alerts, dry-run CI gates.

## 2. Stakeholder Map

| Stakeholder | Role | Power | Interest | Strategy |
|---|---|---|---|---|
| CEO | Sponsor | High | High | Sponsor, weekly brief, one version of truth |
| CFO | Executive Sponsor | High | High | Certified P&L, cost governance champion |
| BU Heads | Consumers | High | Medium | SLA guarantees, BU-specific data products |
| Analytics Leaders | Champions | Medium | High | Self-serve enablement, semantics |
| Data Engineering | Builders | High | High | Platform quality of life |
| IT Security | Gatekeeper | High | Medium | Compliance early, DLP, IAM review |
| FinOps | Steward | Medium | High | Cost telemetry, budgets |
| CX Ops | Consumers | Low | High | SLA board, quality trust |
| Data Quality team | Operators | Medium | High | Rule catalog, RCA workflow |

## 3. Journey Maps

### Journey A - Analyst trying to answer "why did GMV drop?"
| Step | Emotions | Friction | ZUMIQ touchpoint |
|---|---|---|---|
| Notices drop in weekly report | Confused | Which dashboard is current? | Certified dashboards |
| Finds the number in Tableau | Uncertain | Which definition? | Glossary-linked metric |
| Investigates by BU/region | Frustrated | Queries take minutes, cost $ | Clustered facts + MV |
| Checks if data was late | Suspicious | No freshness info | Freshness + DQ badges |
| Looks for the cause | Anxious | Can't trace lineage | Lineage drill + scenario playbook |
| Reports to VP | Confident | - | One number everyone agrees on |

### Journey B - Platform engineer responding to a DQ alert
| Step | Emotions | Friction | ZUMIQ touchpoint |
|---|---|---|---|
| Pager fires (freshness breach) | Alert | Too many false positives | Precision-tuned alerts |
| Opens ops dashboard | Focused | No context | Alert links to table + lineage |
| Reads DQ run results | Clear | Needs sample failures | Failure samples stored |
| Checks source system | Efficient | Can't reproduce | Reproc procedure + as-of |
| Fixes + reprocesses | Relieved | Postmortem | Automated recommendation |

### Journey C - Executive morning brief
| Step | Emotions | Friction | ZUMIQ touchpoint |
|---|---|---|---|
| Opens brief at 7:30 | Neutral | Wants the truth | Fresh T1 data by 7:30 ET |
| Sees GMV vs plan | Focused | "Is this the right number?" | Certified metric, no ambiguity |
| Notices DQ flag on a region | Concerned | Why? | Drill to DQ RCA |
| Calls BU head | Decisive | Both see same number | One version of the truth |
