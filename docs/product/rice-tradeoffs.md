# ZUMIQ - RICE Prioritization & Tradeoffs

## 1. RICE Scores for the Backlog (top candidates)

**RICE = (Reach × Impact × Confidence) / Effort**

| Feature | Reach | Impact | Conf | Effort | RICE | Decision |
|---|---|---|---|---|---|---|
| Semantic views + glossary | 600 users | 3.0 | 1.0 | 6 | **300** | Q2 ✅ |
| DQ engine (9 dims) | 5k users | 3.0 | 0.9 | 9 | **150** | Q1 ✅ |
| Cost telemetry + budgets | 30 teams | 2.0 | 1.0 | 5 | **120** | Q2 ✅ |
| Materialized views | 400 users | 3.0 | 0.8 | 3 | **320** | Q2 ✅ |
| Metadata + lineage | 5k users | 2.0 | 0.8 | 8 | **100** | Q1 ✅ |
| Customer 360 + RFM | 200 users | 2.0 | 0.7 | 6 | **47** | Q3 ✅ |
| Scenario runbooks | 30 engs | 2.0 | 0.6 | 4 | **90** | Q3 ✅ |
| Streaming anomaly detection | 3 teams | 3.0 | 0.5 | 10 | **45** | Q4 |
| Looker Studio self-serve | 800 users | 1.5 | 0.6 | 5 | **144** | Q4 |
| Natural-language query assistant | 5k users | 2.0 | 0.3 | 8 | **37** | Revisit |
| Real-time fraud ML | 2 teams | 3.0 | 0.3 | 14 | **13** | Defer |

## 2. Why These Chose Themselves

- **Materialized views scored highest (320)** → shipped first in Q2; it moved
  latency and cost simultaneously.
- **Semantic views (300)** → the highest-leverage trust fix; directly attacks
  the 7-definitions problem.
- **NL query assistant (37)** → fun, low confidence on value at this stage →
  explicitly deferred. Shows discipline.

## 3. Key Tradeoffs (documented decisions)

### Tradeoff A - Central platform vs full data mesh
**Chose:** centralized platform + domain ownership.
**Cost:** BU teams can't fully control their own pipelines.
**Win:** consistent governance, cost control, faster enterprise-wide value.
**Revisit:** when domain teams are mature enough to self-govern.

### Tradeoff B - Tableau vs Looker vs Power BI
**Chose:** Tableau for certified exec/BI; Looker Studio later for light users.
**Cost:** two tools to support (small).
**Win:** Tableau's certified-workbook governance + mobile for execs; Looker
Studio free self-serve.
**Revisit:** consolidate if Looker Studio adoption crosses 40% of queries.

### Tradeoff C - Batch (hourly) vs true streaming
**Chose:** batch for facts (nightly), streaming for ops events only.
**Cost:** exec KPIs aren't real-time.
**Win:** cost discipline, simpler SCD2, DQ checkpoint model.
**Revisit:** streaming anomaly detection in Q4.

### Tradeoff D - On-demand vs flat-rate BigQuery
**Chose:** on-demand + reservations for steady load.
**Cost:** manual FinOps review.
**Win:** no idle capacity spend; anomaly alerts catch spikes.
**Revisit:** when steady TB/month crosses the flat-rate breakeven.

### Tradeoff E - Automated DQ vs human-reviewed metadata
**Chose:** automated catalog + human review for T1 only.
**Cost:** occasional wrong auto-classification (caught by DLP/audits).
**Win:** 100% coverage at near-zero effort; humans only on what matters.

## 4. What We Said No To (and why)

| Idea | Rejected because |
|---|---|
| Real-time fraud ML this cycle | High effort, low confidence, different business owner |
| Rebuilding 1,400 legacy tables | Phased migration; certification gate protects the new world |
| Multi-cloud federation | GCP-only delivers 95% of value at 30% of cost |
| Replacing Tableau with Looker | Certification governance of Tableau workbooks is a feature we need |
| Building our own orchestration | Composer/Dataform already solve it; build on, not re-build |

## 5. The Decision Record Habit
Every tradeoff above lives in the ADRs (`docs/architecture/adr.md`) so the
*why* survives the people who made it.
