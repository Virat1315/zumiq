# ZUMIQ - User Stories & Acceptance Criteria

> The backlog that turned the vision into shippable work. Each story is sized,
> prioritized, and has a measurable definition of done. Format:
> *As a [persona], I want [capability] so that [value].*

## Backlog (PRIORITIZED - highest value first)

### P0 - Trust & Correctness
| ID | Story | Acceptance Criteria | Points |
|---|---|---|---|
| US-001 | As an executive, I want one certified number for GMV across all dashboards so that I stop arguing about which number is right. | All dashboards read the certified view; glossary term CERTIFIED; any mismatch raises a platform alert | 5 |
| US-002 | As a data owner, I want DQ failures to block promotion so that bad data never reaches certified products. | ERROR-severity failure → status FAIL → promotion blocked → HIGH alert with table + samples | 8 |
| US-003 | As an analyst, I want to see the DQ score on any table before I use it so that I only build on trustworthy data. | DQ badge on dashboard; drill to dimension scores + RCA | 3 |
| US-004 | As Finance, I want restatements to use point-in-time margins so that my numbers are defensible. | As-of joins in finance views; version bump triggers consumer notification | 8 |

### P1 - Findability & Ownership
| ID | Story | Acceptance Criteria | Points |
|---|---|---|---|
| US-005 | As an analyst, I want to search the catalog by business term so that I use the certified table, not a stale copy. | Search returns certified table for glossary term; shows owner/SLA/DQ; links lineage | 5 |
| US-006 | As a steward, I want every T1 table to have an owner and SLA so that incidents get resolved fast. | 100% T1 ownership; SLA in catalog; freshness alert wired | 5 |
| US-007 | As a platform engineer, I want column-level lineage so that I know who breaks when a source changes. | Impact analysis returns downstream tables/dashboards for any column | 8 |

### P2 - Cost & Performance
| ID | Story | Acceptance Criteria | Points |
|---|---|---|---|
| US-008 | As FinOps, I want an alert when any user's daily cost spikes so that spend surprises end. | >$1k/day/user → MEDIUM; >$5k → HIGH; top-spender report by 09:00 ET | 3 |
| US-009 | As an analyst, I want my dashboard to load in seconds so that I actually use it. | Exec dashboard p95 < 3s; scans < 100 GB per dashboard | 5 |
| US-010 | As the platform team, I want repeated queries served by materialized views so that cost and latency drop together. | Top repeated aggregates on MVs; refresh auto; staleness ≤ 3h | 5 |

### P3 - Experience
| ID | Story | Acceptance Criteria | Points |
|---|---|---|---|
| US-011 | As a new analyst, I want to run my first certified query in 5 minutes so that I adopt the platform. | Onboarding flow; example queries on every mart | 3 |
| US-012 | As a Data PM, I want adoption metrics so that I see regressions in days, not months. | WTD dashboard weekly; stale-dashboard detection | 5 |

## Definition of Done (every story)
- [ ] Feature built against a certified source (or certification in scope)
- [ ] DQ rule added for the data involved (or justified why not)
- [ ] Metadata catalog + lineage updated (auto where possible)
- [ ] Alert wired (or documented reason not)
- [ ] Dashboard/self-serve surface updated
- [ ] Docs regenerated (metadata agent) + scenario/playbook if applicable
- [ ] Acceptance criteria demonstrably met in review

## Prioritization Rules
1. Scores against north star (WTD) or a guardrail (DQ, cost, freshness, MTTR).
2. RICE score gates the backlog (see rice-tradeoffs.md).
3. P0 = ship gate; P1 = next; P2 = optimization; P3 = adoption.
4. Any story that fails DoD on a T1 table is not "done."
