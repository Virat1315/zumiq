# ZUMIQ — Interview Guide (How to Present This Project)

> A playbook for walking interviewers through ZUMIQ in 5, 15, or 45 minutes.
> Structured by role target: Product Manager, Analytics Engineer, Data
> Engineer, Data Analyst, Data Product Manager.

## 1. The 60-Second Elevator Pitch

"ZUMIQ is an internal enterprise data platform I designed and built end-to-end
that turns raw operational data from nine source systems into certified,
governed data products — the way a Fortune 100 platform team would build it.
It solved five real problems we all see: seven conflicting definitions of
revenue, invisible data quality, no metadata or lineage, runaway BigQuery
costs, and dashboards nobody trusts. On BigQuery, I built a medallion data
architecture with SCD2 dimensions, an automated data-quality engine scoring
nine dimensions, a metadata and lineage platform, cost governance with a 43%
spend reduction, and ten certified Tableau dashboards bound to a semantic
layer. The north star is weekly trusted decisions, and the guardrails are DQ
score, freshness, and cost per terabyte. I'll show you the architecture, the
SQL, and the business playbooks."

## 2. The 5-Minute Demo Arc (recruiter / non-technical)

1. **Problem (30s):** the enterprise status quo — duplicated data, no trust.
2. **Product (60s):** data as a product — owners, SLAs, DQ floors.
3. **Architecture (60s):** one slide of the 8-layer medallion + governance.
4. **Proof (90s):** three before/after numbers (43% cost cut, 98 DQ score,
   1 definition of revenue, 22 incident playbooks).
5. **Your role (30s):** product manager + analytics engineer — you defined
   metrics, ran the roadmap, wrote the SQL, shipped the dashboards.

## 3. The 15-Minute Technical Walkthrough

| Time | Topic | What to show |
|---|---|---|
| 0–2 | The problem & north star | vision-mission.md, north-star-metrics.md |
| 2–5 | Architecture | system-architecture.md, adr.md |
| 5–8 | Data model | ERD, DDL, SCD2 MERGE, partitioning/clustering |
| 8–11 | Data quality engine | dq_engine.py, seed_rules.sql, scorecard |
| 11–13 | Cost optimization | bigquery-architecture.md, scenario 05 |
| 13–15 | One full incident | scenario 02 (GMV drop) end-to-end |

## 4. The 45-Minute Deep Dive (behavioral + technical)

- Walk an incident playbook end to end (pick scenario 02 or 05).
- Open the SQL library: explain Q013 QUALIFY, Q057 as-of join, Q069 volume
  drift, Q103 consistency check.
- Explain the SCD2 MERGE and why `record_hash` matters.
- Explain cost governance with real numbers.
- Show product thinking: RICE, roadmap, persona → feature decisions.
- Be ready to defend ADRs (docs/architecture/adr.md).

## 5. Role-Specific Focus

### For Product Manager / Data Product Manager
Lead with: vision → personas → PRD → roadmap → RICE → north star → tradeoffs
→ metrics. Prove you made *decisions* with reasoning (ADR-005 semantics;
ADR-008 ownership model; RICE table).

### For Analytics Engineer
Lead with: semantic layer, glossary, dbt/Dataform CI, SCD2, partition/cluster,
MV, DQ as promotion gate. Prove you enforce "one definition of a metric."

### For Data Engineer
Lead with: medallion architecture, BigQuery DDL, MERGE patterns, streaming
sink, pipeline observability, cost telemetry, `sp_reprocess_partition`.

### For Data Analyst / Business Analyst
Lead with: KPIs, the 22 scenarios (your "real projects"), Tableau chart specs,
the funnel/adoption dashboards, "how I'd answer 'why did GMV drop?'" in 4 SQL
steps.

## 6. Common Questions & One-Liners

| Question | Answer anchor |
|---|---|
| "Why not just one table?" | Medallion layering = reprocessing safety + certification boundary (ADR-001). |
| "How do you stop people defining their own revenue?" | Semantic views + glossary certification + consistency DQ check (scenario 01). |
| "How do you control cloud cost?" | Bytes-read-is-money; partition+cluster; MVs; dry-run CI; budgets + anomaly alerts (scenario 05). |
| "How do you handle duplicate data?" | dedup_key ROW_NUMBER in staging + UNIQUENESS ERROR rule (scenario 06). |
| "How do you keep DQ meaningful, not noise?" | Severity-weighted scoring, ERROR-pages-only, precision metric (scenario 17). |
| "What would you do differently?" | Ship adoption instrumentation earlier; involve users before building (scenario 19). |
| "How does this scale to 10× volume?" | Same patterns; partition/CLUSTER keys bound per-query scan; MVs absorb dashboard load; flat-rate review. |

## 7. The "Tell Me a Time When…" Bank (see star-stories.md)

1. You had conflicting stakeholders → scenario 01 (definitions war).
2. You caught something before it shipped → scenario 06 (duplicates).
3. You reduced cost → scenario 05 (cost spike).
4. You fixed a process, not just a bug → scenario 17 (alert fatigue).
5. You launched something and it flopped → scenario 19 (adoption drop).

## 8. Signals You Want to Leave

- **Decision quality:** every choice has a documented tradeoff.
- **Enterprise literacy:** SLAs, RACI, SOX, promotion gates, one-version-of-truth.
- **Hands-on depth:** you wrote the DDL, the DQ engine, and the SQL.
- **Product instinct:** north star, guardrails, adoption funnels, runbooks.
- **Impact:** numbers — 43% cost, 98 DQ, 0 definition conflicts, 22 runbooks.
