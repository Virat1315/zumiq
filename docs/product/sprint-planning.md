# ZUMIQ — Sprint Planning & Execution (working as a PM)

## Sprint Cadence
2-week sprints · 4-person squad (Data PM, 2 Analytics/Data Engineers, Data
Quality analyst) · ceremonies: planning, daily standup, review, retro.

## Example Sprint — S7 "Certify the Customer 360 Data Product"

### Sprint Goal
Ship Customer 360 as a **certified** data product with RFM segmentation and a
documented DQ floor — so CX Analytics can retire their manual Excel workbook.

### Backlog → Commitment (what we pulled & why)
| Story | Points | Acceptance criteria |
|---|---|---|
| Build `v_customer_360` semantic view | 5 | Grain: customer; fields per spec; uses current dims |
| Add RFM segmentation (NTILE quartiles) | 3 | Decile/quartile columns; documented formula |
| Register product in catalog (owner, SLA, DQ floor 95) | 2 | registry row + alert wiring |
| Add DQ rules for customer_360 source tables | 5 | completeness/uniqueness/integrity pass |
| CX adoption dashboard (views/users per week) | 3 | Tableau on certified view |
| Deprecate Excel workbook (notify consumers) | 2 | lineage-driven notification list |

### Sprint Commitments vs Reality
| Metric | Plan | Actual | Note |
|---|---|---|---|
| Story points committed | 20 | 20 | pulled exactly |
| Stories done | 6 | 6 | no carry-over |
| DQ floor met | 95 | 98.2 | exceeded |
| New alerts introduced | 3 | 3 | 0 false positives in first week |
| WTD change | +5% | +9% | on track |

### What shipped to users (demo day)
- CX team now sees one Customer 360 view instead of maintaining Excel.
- RFM segmentation automatically recomputed nightly.
- DQ score visible on the dashboard; any drop pages CX Analytics.

### Retro outcomes → next sprint actions
1. **"Customer keys drifted between CRM and ERP"** → root cause = source system
   mismatch; add cross-system reconciliation check (new DQ rule).
2. **"Test data took too long to generate"** → seed more realistic volume data.
3. **"Adoption dashboards duplicated across teams"** → consolidate to platform.

## Velocity & Forecasting
- Average velocity: 18–22 points/sprint.
- Epic "Customer 360" (28 pts) forecast 2 sprints → delivered in 2.
- Used velocity to negotiate Q3 scope with stakeholders (cut NL-query,
  kept runbooks).

## How I Run Planning (the method)
1. Refresh roadmap → pick epics that move north star/guardrails.
2. Score with RICE; drop anything scoring below the cut line.
3. Break epics into stories with acceptance criteria; size together.
4. Pull stories up to velocity; leave 15% slack for incidents.
5. Define the sprint goal as an **outcome**, not a feature list.
6. Daily: unblock, protect the goal, watch DQ/incidents.
7. Review: demo to stakeholders with the outcome metric front and center.
8. Retro: one thing to keep, one thing to change → next sprint action.

## Scrum Board Discipline
- **To do / In progress / Review / Done** with WIP limits (3 per dev).
- Story = definition of done includes: DQ rule added, catalog updated,
  lineage recorded, alert wired, dashboard updated, docs regenerated.
- Definition of done is why platform quality didn't decay as we shipped fast.
