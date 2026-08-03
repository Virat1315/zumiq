/**
 * Seeded implementation of DataAdapter.
 *
 * The incidents below are the same 22 scenarios documented in docs/scenarios/
 * and surfaced by the static demo in web/, promoted into full incident records
 * with an owner, an audit trail and a quantified impact.
 *
 * Everything here is deterministic. No Date.now(), no Math.random(): the demo
 * has a fixed "as of" date (2026-07-14, matching the warehouse seed in
 * scripts/01_seed_data.py), and identical output on server and client is what
 * keeps React from throwing a hydration mismatch.
 */

import type {
  ActivityEntry, DataAdapter, ImpactModel, Incident, PlatformHealth,
} from "./types";

/** The demo's frozen "today". Everything relative is computed from this. */
export const AS_OF = "2026-07-14";

/* -------------------------------------------------------------------------- */
/* Incidents                                                                  */
/* -------------------------------------------------------------------------- */

const INCIDENTS: Incident[] = [
  {
    id: "S01",
    title: "Executive P&L mismatch: Finance vs Retail",
    domain: "Governance", severity: "P1", status: "Resolved",
    owner: { name: "Priya Raghavan", team: "Data Governance" },
    openedAt: "2026-06-02T09:14:00Z", resolvedAt: "2026-06-09T16:40:00Z",
    detectedBy: "Human - Finance controller during month-end review",
    summary: "Two teams reported different GMV for the same day - $12.4M vs $9.8M.",
    rootCause:
      "There was no single definition of GMV. Finance excluded intra-group transfers and " +
      "cancelled orders; Retail counted gross bookings including both. Each team had built its " +
      "own SQL against the raw fact table, so both numbers were internally consistent and " +
      "mutually irreconcilable.",
    resolution:
      "Published a certified semantic view (analytics_layer.semantic_executive) as the only " +
      "sanctioned source for GMV, with the definition recorded in the business glossary and an " +
      "owner attached. Both teams' dashboards were repointed at it.",
    affectedKpis: ["GMV", "Net Revenue", "Gross Margin"],
    affectedDatasets: ["core_layer.fct_transactions", "analytics_layer.semantic_executive"],
    businessImpactUsd: null,
    doc: "scenario-01-pnl-mismatch.md",
    timeline: [
      { at: "2026-06-02T09:14:00Z", actor: "M. Fernandes (Finance)", kind: "detected", note: "Raised that the board pack GMV did not match the Retail weekly." },
      { at: "2026-06-02T14:30:00Z", actor: "Priya Raghavan", kind: "triaged", note: "Confirmed both figures reproduce. Not a pipeline defect - a definition conflict." },
      { at: "2026-06-04T11:00:00Z", actor: "Analytics Engineering", kind: "investigated", note: "Diffed both queries: intra-group transfers and cancelled orders treated differently." },
      { at: "2026-06-06T15:20:00Z", actor: "Data Governance Council", kind: "mitigated", note: "Ratified a single GMV definition; drafted the certified view." },
      { at: "2026-06-09T16:40:00Z", actor: "Priya Raghavan", kind: "resolved", note: "semantic_executive published and certified. Both dashboards repointed." },
    ],
  },
  {
    id: "S02",
    title: "Unexpected 18% KPI drop in daily GMV",
    domain: "Revenue", severity: "P1", status: "Resolved",
    owner: { name: "Daniel Okafor", team: "Data Engineering" },
    openedAt: "2026-07-13T08:05:00Z", resolvedAt: "2026-07-13T19:30:00Z",
    detectedBy: "Volume DQ rule - dq_rule_txn_daily_volume",
    summary: "A 7-hour silent source gap presented as an 18% crash in daily GMV.",
    rootCause:
      "The upstream order service stopped emitting to the ingestion topic at 01:12 UTC after a " +
      "failed broker failover. No error surfaced: the consumer read an empty partition happily, " +
      "so the load 'succeeded' with a fraction of the usual rows.",
    resolution:
      "Backfilled the missing window from the source system's replay API. Added a volume rule " +
      "that compares each hour against a 28-day same-hour median and fails the load rather than " +
      "publishing a partial day.",
    affectedKpis: ["GMV", "Active Customers", "Avg Order Value"],
    affectedDatasets: ["landing.raw_orders", "core_layer.fct_transactions"],
    businessImpactUsd: null,
    doc: "scenario-02-gmv-drop.md",
    timeline: [
      { at: "2026-07-13T08:05:00Z", actor: "dq_rule_txn_daily_volume", kind: "detected", note: "Row count 18.2% below the 28-day same-hour median. Rule fired P1." },
      { at: "2026-07-13T08:40:00Z", actor: "Daniel Okafor", kind: "triaged", note: "Ruled out a genuine demand drop - order service metrics showed normal traffic." },
      { at: "2026-07-13T10:15:00Z", actor: "Platform SRE", kind: "investigated", note: "Broker failover at 01:12 UTC; consumer never rebalanced onto the new leader." },
      { at: "2026-07-13T15:00:00Z", actor: "Daniel Okafor", kind: "mitigated", note: "Replayed 01:12–08:05 from the source API; partition rebuilt." },
      { at: "2026-07-13T19:30:00Z", actor: "Daniel Okafor", kind: "resolved", note: "Volume rule promoted to blocking - a partial day can no longer publish." },
    ],
  },
  {
    id: "S03",
    title: "Pipeline failure blocking the overnight batch",
    domain: "Reliability", severity: "P1", status: "Resolved",
    owner: { name: "Daniel Okafor", team: "Data Engineering" },
    openedAt: "2026-07-13T02:40:00Z", resolvedAt: "2026-07-14T07:10:00Z",
    detectedBy: "Pipeline monitor - FCT_TRANSACTIONS_LOAD",
    summary: "A retry file containing duplicates failed the whole load, silently, for 6 hours.",
    rootCause:
      "A vendor re-sent a file already processed. The MERGE had no deduplication on the natural " +
      "key, so it violated a uniqueness constraint and aborted. The orchestrator logged the " +
      "failure but had no alert route, so nobody was paged.",
    resolution:
      "Made the MERGE idempotent by deduplicating on (source_system, external_txn_id) before the " +
      "merge step, and wired pipeline failures to the on-call rotation instead of a log file.",
    affectedKpis: ["GMV", "Pipeline Success Rate", "Data Freshness"],
    affectedDatasets: ["core_layer.fct_transactions", "metadata.pipeline_runs"],
    businessImpactUsd: null,
    doc: "scenario-03-pipeline-failure.md",
    timeline: [
      { at: "2026-07-13T02:40:00Z", actor: "Orchestrator", kind: "detected", note: "FCT_TRANSACTIONS_LOAD failed on a uniqueness violation. No page raised." },
      { at: "2026-07-13T08:55:00Z", actor: "Daniel Okafor", kind: "triaged", note: "Discovered during standup - six hours after the failure." },
      { at: "2026-07-13T12:00:00Z", actor: "Data Engineering", kind: "investigated", note: "Vendor file 20260712_02.csv had already been ingested on the 12th." },
      { at: "2026-07-13T18:20:00Z", actor: "Daniel Okafor", kind: "mitigated", note: "Dedup step added ahead of the MERGE; load re-run cleanly." },
      { at: "2026-07-14T07:10:00Z", actor: "Platform SRE", kind: "resolved", note: "Pipeline failures now page on-call directly." },
    ],
  },
  {
    id: "S04",
    title: "Data freshness breach delaying the Finance close",
    domain: "Freshness", severity: "P1", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-07-14T06:30:00Z", resolvedAt: "2026-07-14T13:45:00Z",
    detectedBy: "Human - Finance close checklist",
    summary: "A vendor failed to deliver the daily extract and no freshness alert existed.",
    rootCause:
      "Freshness was monitored on the pipeline's *run* status, not on the data's max event " +
      "timestamp. The job ran, found nothing to load, and reported success - so the table was a " +
      "day stale while every dashboard showed green.",
    resolution:
      "Freshness SLOs now assert on MAX(event_timestamp) per table rather than job exit status, " +
      "and the metadata catalogue records an expected-delivery window per feed.",
    affectedKpis: ["Data Freshness", "Net Revenue"],
    affectedDatasets: ["landing.raw_settlements", "core_layer.fct_settlements"],
    businessImpactUsd: null,
    doc: "scenario-04-freshness-breach.md",
    timeline: [
      { at: "2026-07-14T06:30:00Z", actor: "R. Bhatt (Finance)", kind: "detected", note: "Close checklist showed yesterday's settlements missing." },
      { at: "2026-07-14T07:05:00Z", actor: "Sara Lindqvist", kind: "triaged", note: "Job green, table stale. Monitoring measured the wrong thing." },
      { at: "2026-07-14T09:30:00Z", actor: "Analytics Engineering", kind: "investigated", note: "Vendor SFTP drop never arrived; no delivery-window assertion existed." },
      { at: "2026-07-14T13:45:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "Freshness SLO rewritten against MAX(event_timestamp)." },
    ],
  },
  {
    id: "S05",
    title: "Cloud cost spike: $14k/day to $41k/day",
    domain: "Cost", severity: "P1", status: "Mitigated",
    owner: { name: "Tomás Herrera", team: "Platform / FinOps" },
    openedAt: "2026-07-08T11:00:00Z", resolvedAt: null,
    detectedBy: "Cost anomaly rule - daily spend > 2× 14-day median",
    summary: "One analyst's Tableau extract scanned the full transaction table every 30 minutes.",
    rootCause:
      "A dashboard was built on a live connection to the raw fact table with no partition filter. " +
      "Each refresh scanned 4.2 TB, and the refresh schedule was set to every 30 minutes - about " +
      "200 TB/day of avoidable scan.",
    resolution:
      "Extract repointed at a partitioned, clustered aggregate; refresh moved to hourly. A " +
      "per-user daily bytes-billed quota is in review but not yet enforced, so this stays open.",
    affectedKpis: ["Cloud Cost", "Cost per TB"],
    affectedDatasets: ["core_layer.fct_transactions", "analytics_layer.agg_daily_revenue"],
    businessImpactUsd: 27000,
    doc: "scenario-05-cost-spike.md",
    timeline: [
      { at: "2026-07-08T11:00:00Z", actor: "cost_anomaly_rule", kind: "detected", note: "Daily spend $41.2k against a $14.1k median. P1 raised." },
      { at: "2026-07-08T13:20:00Z", actor: "Tomás Herrera", kind: "investigated", note: "INFORMATION_SCHEMA.JOBS traced 96% of scan to one service account." },
      { at: "2026-07-09T10:00:00Z", actor: "Tomás Herrera", kind: "mitigated", note: "Extract repointed at agg_daily_revenue; scan per refresh down from 4.2 TB to 11 GB." },
      { at: "2026-07-12T09:00:00Z", actor: "FinOps", kind: "note", note: "Per-user bytes quota drafted; needs governance sign-off before enforcement." },
    ],
  },
  {
    id: "S06",
    title: "Duplicate transactions inflating revenue",
    domain: "DQ", severity: "P1", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-06-18T04:12:00Z", resolvedAt: "2026-06-19T22:05:00Z",
    detectedBy: "Uniqueness DQ rule - dq_rule_txn_natural_key",
    summary: "A non-idempotent retry doubled 201k transactions, inflating revenue by $2.3M.",
    rootCause:
      "The ingestion job retried on a network timeout after the write had already committed. " +
      "Because the load appended rather than merged, the retry inserted a second copy of every " +
      "row in the batch.",
    resolution:
      "Converted the append to a MERGE on the natural key, making retries idempotent. The " +
      "uniqueness rule that caught it now runs pre-publish rather than post-load.",
    affectedKpis: ["GMV", "Net Revenue", "Transaction Count"],
    affectedDatasets: ["core_layer.fct_transactions"],
    businessImpactUsd: 2300000,
    doc: "scenario-06-duplicate-transactions.md",
    timeline: [
      { at: "2026-06-18T04:12:00Z", actor: "dq_rule_txn_natural_key", kind: "detected", note: "201,447 duplicate natural keys found post-load." },
      { at: "2026-06-18T08:00:00Z", actor: "Sara Lindqvist", kind: "triaged", note: "Caught before month-end close - no external reporting affected." },
      { at: "2026-06-18T16:30:00Z", actor: "Data Engineering", kind: "investigated", note: "Retry-after-commit confirmed in the ingestion logs." },
      { at: "2026-06-19T11:00:00Z", actor: "Sara Lindqvist", kind: "mitigated", note: "Duplicates removed; append replaced with an idempotent MERGE." },
      { at: "2026-06-19T22:05:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "Uniqueness rule moved pre-publish." },
    ],
  },
  {
    id: "S07",
    title: "Metadata inconsistency breaking Tableau extracts",
    domain: "Metadata", severity: "P2", status: "Resolved",
    owner: { name: "Priya Raghavan", team: "Data Governance" },
    openedAt: "2026-05-21T10:00:00Z", resolvedAt: "2026-05-27T15:00:00Z",
    detectedBy: "Human - BI analyst",
    summary: "A dashboard was bound to a 14-month-old stale view instead of the certified table.",
    rootCause:
      "A deprecated view was never dropped, and nothing in the catalogue marked it deprecated. " +
      "A new analyst found it by name search and built on it in good faith.",
    resolution:
      "Deprecated objects are now tagged in the metadata catalogue and hidden from search by " +
      "default; the view was dropped after a 30-day notice.",
    affectedKpis: ["Dashboard Accuracy"],
    affectedDatasets: ["analytics_layer.v_revenue_legacy", "analytics_layer.semantic_executive"],
    businessImpactUsd: null,
    doc: "scenario-07-metadata-inconsistency.md",
    timeline: [
      { at: "2026-05-21T10:00:00Z", actor: "J. Whitfield (BI)", kind: "detected", note: "Numbers on a new dashboard did not match the certified report." },
      { at: "2026-05-22T09:30:00Z", actor: "Priya Raghavan", kind: "investigated", note: "Source was v_revenue_legacy, last updated 14 months ago." },
      { at: "2026-05-27T15:00:00Z", actor: "Priya Raghavan", kind: "resolved", note: "Deprecation tags added to the catalogue; legacy view scheduled for drop." },
    ],
  },
  {
    id: "S08",
    title: "Customer service degradation hidden by SLA maths",
    domain: "CX", severity: "P1", status: "Resolved",
    owner: { name: "Amara Nwosu", team: "Operations Analytics" },
    openedAt: "2026-07-01T09:00:00Z", resolvedAt: "2026-07-10T17:20:00Z",
    detectedBy: "Human - Operations manager",
    summary: "The SLA board counted only closed cases, hiding a 97% → 71% collapse.",
    rootCause:
      "SLA attainment was computed over closed cases only. When a backlog built up, the worst " +
      "cases stayed open and were therefore excluded from the denominator - so the metric " +
      "improved precisely as service got worse.",
    resolution:
      "Redefined SLA attainment over all cases due in the period, whether closed or not, and " +
      "added a separate open-backlog-age metric.",
    affectedKpis: ["SLA Attainment", "Customer Satisfaction"],
    affectedDatasets: ["core_layer.fct_support_cases"],
    businessImpactUsd: null,
    doc: "scenario-08-sla-degradation.md",
    timeline: [
      { at: "2026-07-01T09:00:00Z", actor: "K. Mensah (Ops)", kind: "detected", note: "Board showed 97% SLA while the floor was visibly underwater." },
      { at: "2026-07-03T14:00:00Z", actor: "Amara Nwosu", kind: "investigated", note: "Denominator excluded open cases - survivorship bias in the metric." },
      { at: "2026-07-08T11:30:00Z", actor: "Amara Nwosu", kind: "mitigated", note: "Metric redefined over cases due in period. True figure: 71.4%." },
      { at: "2026-07-10T17:20:00Z", actor: "Data Governance Council", kind: "resolved", note: "Definition certified and added to the glossary." },
    ],
  },
  {
    id: "S09",
    title: "Schema drift breaking downstream models",
    domain: "Schema", severity: "P1", status: "Resolved",
    owner: { name: "Daniel Okafor", team: "Data Engineering" },
    openedAt: "2026-06-25T07:45:00Z", resolvedAt: "2026-06-26T14:00:00Z",
    detectedBy: "Schema drift check - landing.raw_web_events",
    summary: "A renamed source column broke the attribution model with no early warning.",
    rootCause:
      "An upstream team renamed utm_source to source_utm in a routine release. The landing table " +
      "used schema autodetect, so the new column was added silently and the old one filled with " +
      "NULLs - the model kept running and produced zeroes.",
    resolution:
      "Landing schemas are now explicitly declared and drift fails the load. Column-level lineage " +
      "shows which models consume each field, so the blast radius is known before a rename ships.",
    affectedKpis: ["Marketing Attribution", "Channel Mix"],
    affectedDatasets: ["landing.raw_web_events", "analytics_layer.attribution_daily"],
    businessImpactUsd: null,
    doc: "scenario-09-schema-drift.md",
    timeline: [
      { at: "2026-06-25T07:45:00Z", actor: "schema_drift_check", kind: "detected", note: "Unexpected column source_utm; utm_source 100% NULL." },
      { at: "2026-06-25T10:20:00Z", actor: "Daniel Okafor", kind: "investigated", note: "Traced to an upstream release the previous evening." },
      { at: "2026-06-26T14:00:00Z", actor: "Daniel Okafor", kind: "resolved", note: "Explicit schemas enforced; column lineage published." },
    ],
  },
  {
    id: "S10",
    title: "Late-arriving data forcing a restatement",
    domain: "Timeliness", severity: "P1", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-05-30T12:00:00Z", resolvedAt: "2026-06-11T16:00:00Z",
    detectedBy: "Reconciliation job - settlements vs transactions",
    summary: "1.4% of transactions arrived 3–9 days late; reports had no as-of semantics.",
    rootCause:
      "Reports aggregated by event date but were generated once and never revised. Late arrivals " +
      "landed in already-published partitions, so historical numbers changed under readers with " +
      "no indication that they had.",
    resolution:
      "Introduced as-of reporting: every published figure records the partition watermark it was " +
      "computed at, and restatements are versioned rather than silently overwriting.",
    affectedKpis: ["GMV", "Net Revenue"],
    affectedDatasets: ["core_layer.fct_transactions", "analytics_layer.agg_daily_revenue"],
    businessImpactUsd: null,
    doc: "scenario-10-late-data-restatement.md",
    timeline: [
      { at: "2026-05-30T12:00:00Z", actor: "recon_settlements", kind: "detected", note: "Settlement totals exceeded booked transactions for three prior days." },
      { at: "2026-06-03T09:00:00Z", actor: "Sara Lindqvist", kind: "investigated", note: "1.4% of rows arriving 3–9 days after event date." },
      { at: "2026-06-11T16:00:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "As-of watermarks added; restatements now versioned." },
    ],
  },
  {
    id: "S11",
    title: "Support case spike from a billing bug",
    domain: "CX", severity: "P2", status: "Resolved",
    owner: { name: "Amara Nwosu", team: "Operations Analytics" },
    openedAt: "2026-07-11T09:30:00Z", resolvedAt: "2026-07-12T20:00:00Z",
    detectedBy: "Anomaly rule - support case volume by category",
    summary: "A payment gateway regression caused 4,000+ billing cases in 48 hours.",
    rootCause:
      "A gateway release double-authorised a subset of card payments. Customers saw two pending " +
      "charges and called in. The data platform did not cause it, but it was the first place the " +
      "pattern became visible.",
    resolution:
      "Gateway change rolled back. The case-category anomaly rule now routes billing spikes " +
      "straight to the payments on-call, cutting detection-to-notification to minutes.",
    affectedKpis: ["Support Case Volume", "Customer Satisfaction"],
    affectedDatasets: ["core_layer.fct_support_cases"],
    businessImpactUsd: null,
    doc: "scenario-11-support-spike.md",
    timeline: [
      { at: "2026-07-11T09:30:00Z", actor: "case_volume_anomaly", kind: "detected", note: "Billing category running 3.2× the 30-day mean." },
      { at: "2026-07-11T11:00:00Z", actor: "Amara Nwosu", kind: "triaged", note: "Correlated with a gateway release the prior night." },
      { at: "2026-07-12T20:00:00Z", actor: "Payments Engineering", kind: "resolved", note: "Release rolled back; duplicate authorisations voided." },
    ],
  },
  {
    id: "S12",
    title: "Stockout eating revenue on a top SKU",
    domain: "Operations", severity: "P2", status: "Resolved",
    owner: { name: "Amara Nwosu", team: "Operations Analytics" },
    openedAt: "2026-06-14T08:00:00Z", resolvedAt: "2026-06-20T12:00:00Z",
    detectedBy: "Human - category manager",
    summary: "Zero inventory receipts for a top SKU went unnoticed for days.",
    rootCause:
      "Inventory receipts were monitored for anomalous values but not for absence. A supplier " +
      "stopped shipping and the feed simply contained no rows for that SKU - which no rule tested.",
    resolution:
      "Added expected-entity checks: for the top 500 SKUs by revenue, an absent daily receipt is " +
      "itself an alert.",
    affectedKpis: ["GMV", "Inventory Turns"],
    affectedDatasets: ["core_layer.fct_inventory_receipts"],
    businessImpactUsd: 1400000,
    doc: "scenario-12-stockout.md",
    timeline: [
      { at: "2026-06-14T08:00:00Z", actor: "L. Duarte (Category)", kind: "detected", note: "Top SKU showing available-to-promise of zero." },
      { at: "2026-06-16T10:00:00Z", actor: "Amara Nwosu", kind: "investigated", note: "No receipts for 9 days; absence never triggered a rule." },
      { at: "2026-06-20T12:00:00Z", actor: "Amara Nwosu", kind: "resolved", note: "Expected-entity checks live for the top 500 SKUs." },
    ],
  },
  {
    id: "S13",
    title: "Dashboard latency from full-table scans",
    domain: "Performance", severity: "P2", status: "Resolved",
    owner: { name: "Tomás Herrera", team: "Platform / FinOps" },
    openedAt: "2026-05-12T09:00:00Z", resolvedAt: "2026-05-23T17:00:00Z",
    detectedBy: "Product analytics - dashboard load time p95",
    summary: "The executive dashboard took 40–60s to load, so executives stopped opening it.",
    rootCause:
      "Every tile queried the raw fact table directly with no partition pruning or pre-aggregation. " +
      "Load time scaled with total history rather than with the window on screen.",
    resolution:
      "Built partitioned, clustered daily aggregates and a materialised view behind the executive " +
      "page. p95 load fell from 47s to 1.9s.",
    affectedKpis: ["Dashboard Adoption", "Cloud Cost"],
    affectedDatasets: ["core_layer.fct_transactions", "analytics_layer.mv_executive_daily"],
    businessImpactUsd: null,
    doc: "scenario-13-dashboard-latency.md",
    timeline: [
      { at: "2026-05-12T09:00:00Z", actor: "product_analytics", kind: "detected", note: "p95 dashboard load 47s; weekly actives down 31%." },
      { at: "2026-05-15T14:00:00Z", actor: "Tomás Herrera", kind: "investigated", note: "No tile used a partition filter." },
      { at: "2026-05-23T17:00:00Z", actor: "Tomás Herrera", kind: "resolved", note: "Materialised view live; p95 now 1.9s." },
    ],
  },
  {
    id: "S14",
    title: "Null spike in the customer dimension",
    domain: "DQ", severity: "P2", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-07-13T06:00:00Z", resolvedAt: "2026-07-15T11:00:00Z",
    detectedBy: "Completeness DQ rule - dim_customer.email",
    summary: "A CRM field remap sent NULL emails for EMEA; a campaign lost its audience.",
    rootCause:
      "A CRM migration moved the email field to a new API path. The connector kept reading the old " +
      "path, which now returned null for EMEA records only - the region migrated first.",
    resolution:
      "Connector updated to the new field path and backfilled. Completeness rules are now " +
      "evaluated per region, so a partial-population failure cannot hide inside a global average.",
    affectedKpis: ["Customer 360 DQ Score", "Campaign Reach"],
    affectedDatasets: ["core_layer.dim_customer"],
    businessImpactUsd: null,
    doc: "scenario-14-null-spike.md",
    timeline: [
      { at: "2026-07-13T06:00:00Z", actor: "dq_rule_customer_email_complete", kind: "detected", note: "Email completeness fell to 71% overall, 4% in EMEA." },
      { at: "2026-07-13T13:00:00Z", actor: "Sara Lindqvist", kind: "investigated", note: "CRM migration moved the field; connector unchanged." },
      { at: "2026-07-15T11:00:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "Connector repointed, records backfilled, rules now per-region." },
    ],
  },
  {
    id: "S15",
    title: "Ops event volume drop from a dead streaming worker",
    domain: "Reliability", severity: "P1", status: "Resolved",
    owner: { name: "Daniel Okafor", team: "Data Engineering" },
    openedAt: "2026-07-09T05:20:00Z", resolvedAt: "2026-07-09T14:00:00Z",
    detectedBy: "Volume rule - ops events per hour",
    summary: "A dead streaming worker looked like a quiet day - five hours of blind operations.",
    rootCause:
      "A streaming worker OOM-killed and did not restart. Its consumer group stalled, but because " +
      "other workers kept processing their partitions, total volume dropped rather than stopping - " +
      "which read as low traffic instead of an outage.",
    resolution:
      "Per-partition lag alerting added, so a single stalled consumer is visible even when the " +
      "aggregate still moves. Worker memory limits raised and restart policy fixed.",
    affectedKpis: ["Service Error Rate", "Pipeline Success Rate"],
    affectedDatasets: ["landing.raw_ops_events", "core_layer.fct_ops_events"],
    businessImpactUsd: null,
    doc: "scenario-15-volume-drop.md",
    timeline: [
      { at: "2026-07-09T05:20:00Z", actor: "ops_volume_rule", kind: "detected", note: "Hourly ops events 43% below the same-hour median." },
      { at: "2026-07-09T08:10:00Z", actor: "Platform SRE", kind: "investigated", note: "One consumer OOM-killed at 00:47 and never restarted." },
      { at: "2026-07-09T14:00:00Z", actor: "Daniel Okafor", kind: "resolved", note: "Per-partition lag alerts live; memory limits raised." },
    ],
  },
  {
    id: "S16",
    title: "Wrong product margin in a restatement",
    domain: "Accuracy", severity: "P1", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-06-28T10:00:00Z", resolvedAt: "2026-07-04T18:00:00Z",
    detectedBy: "Human - Finance analyst reviewing margin by category",
    summary: "A current-version join applied today's price to old transactions, producing negative margin.",
    rootCause:
      "The margin model joined fct_transactions to dim_product on product_id alone. dim_product is " +
      "SCD2, so the join matched every historical version - and in practice picked the current row, " +
      "applying a repriced cost to transactions that predated it.",
    resolution:
      "Join now qualifies on the SCD2 validity window (txn_date BETWEEN valid_from AND valid_to), " +
      "so each transaction is costed at the price that was in force when it happened.",
    affectedKpis: ["Gross Margin", "Net Revenue"],
    affectedDatasets: ["core_layer.fct_transactions", "core_layer.dim_product"],
    businessImpactUsd: null,
    doc: "scenario-16-wrong-margin.md",
    timeline: [
      { at: "2026-06-28T10:00:00Z", actor: "D. Sørensen (Finance)", kind: "detected", note: "Negative margin on a category that has never been loss-making." },
      { at: "2026-06-30T15:00:00Z", actor: "Sara Lindqvist", kind: "investigated", note: "SCD2 validity window missing from the join predicate." },
      { at: "2026-07-04T18:00:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "Point-in-time join applied; margin restated." },
    ],
  },
  {
    id: "S17",
    title: "DQ alert fatigue from false positives",
    domain: "DQ", severity: "P2", status: "Resolved",
    owner: { name: "Priya Raghavan", team: "Data Governance" },
    openedAt: "2026-06-05T09:00:00Z", resolvedAt: "2026-06-22T16:00:00Z",
    detectedBy: "Human - data engineering retro",
    summary: "More than 40 noisy alerts a week hid a real failure for 36 hours.",
    rootCause:
      "Rules were written with fixed thresholds that had never been tuned. Normal weekend " +
      "seasonality tripped them every week, so the team learned to ignore the channel - and " +
      "ignored a genuine failure with it.",
    resolution:
      "Thresholds moved to seasonal baselines, rules given explicit severities, and anything below " +
      "P2 routed to a digest instead of the alert channel. Weekly alert volume fell from 41 to 6.",
    affectedKpis: ["Mean Time to Detect", "Alert Precision"],
    affectedDatasets: ["metadata.dq_rules", "metadata.dq_results"],
    businessImpactUsd: null,
    doc: "scenario-17-alert-fatigue.md",
    timeline: [
      { at: "2026-06-05T09:00:00Z", actor: "Data Engineering", kind: "detected", note: "Retro raised that a real failure sat unread for 36 hours." },
      { at: "2026-06-12T11:00:00Z", actor: "Priya Raghavan", kind: "investigated", note: "38 of 41 weekly alerts were weekend seasonality." },
      { at: "2026-06-22T16:00:00Z", actor: "Priya Raghavan", kind: "resolved", note: "Seasonal baselines and severity routing live. 41 → 6 alerts/week." },
    ],
  },
  {
    id: "S18",
    title: "Stale Tableau extracts causing report mismatch",
    domain: "BI", severity: "P2", status: "Resolved",
    owner: { name: "Tomás Herrera", team: "Platform / FinOps" },
    openedAt: "2026-05-04T10:00:00Z", resolvedAt: "2026-05-09T13:00:00Z",
    detectedBy: "Human - regional sales lead",
    summary: "A weekly extract served three-day-old data while the dashboard looked current.",
    rootCause:
      "The extract refreshed weekly but the dashboard displayed the query time, not the extract " +
      "time. Readers had no way to tell how old the underlying data was.",
    resolution:
      "Every dashboard now renders the extract watermark, and extract schedules are declared in " +
      "the metadata catalogue alongside the table's freshness SLO.",
    affectedKpis: ["Dashboard Accuracy", "Data Freshness"],
    affectedDatasets: ["analytics_layer.agg_daily_revenue"],
    businessImpactUsd: null,
    doc: "scenario-18-stale-extracts.md",
    timeline: [
      { at: "2026-05-04T10:00:00Z", actor: "P. Almeida (Sales)", kind: "detected", note: "Regional numbers did not match the live report." },
      { at: "2026-05-06T09:00:00Z", actor: "Tomás Herrera", kind: "investigated", note: "Extract three days old; no watermark displayed." },
      { at: "2026-05-09T13:00:00Z", actor: "Tomás Herrera", kind: "resolved", note: "Watermarks rendered on every dashboard." },
    ],
  },
  {
    id: "S19",
    title: "ZUMIQ self-serve adoption drop",
    domain: "Product", severity: "P2", status: "Investigating",
    owner: { name: "Nadia Farouk", team: "Product" },
    openedAt: "2026-07-02T09:00:00Z", resolvedAt: null,
    detectedBy: "Product analytics - weekly active queriers",
    summary: "Self-serve queries fell 38% while every platform health metric stayed green.",
    rootCause:
      "Under investigation. Current hypothesis is that the deprecation of three popular legacy " +
      "views pushed analysts back to extracting into spreadsheets rather than learning the " +
      "certified replacements - a documentation and change-management gap, not an outage.",
    resolution:
      "Not yet resolved. Migration guides for the three views are drafted; an in-product " +
      "deprecation notice with a suggested replacement is in design.",
    affectedKpis: ["Weekly Active Queriers", "Self-Serve Ratio"],
    affectedDatasets: ["metadata.query_audit"],
    businessImpactUsd: null,
    doc: "scenario-19-adoption-drop.md",
    timeline: [
      { at: "2026-07-02T09:00:00Z", actor: "product_analytics", kind: "detected", note: "Weekly active queriers down 38% over four weeks." },
      { at: "2026-07-07T14:00:00Z", actor: "Nadia Farouk", kind: "investigated", note: "Drop concentrated in users of three deprecated views." },
      { at: "2026-07-13T10:00:00Z", actor: "Nadia Farouk", kind: "note", note: "Migration guides drafted; in-product notice in design." },
    ],
  },
  {
    id: "S20",
    title: "Chargeback rate spike on a new reseller channel",
    domain: "Risk", severity: "P1", status: "Mitigated",
    owner: { name: "Amara Nwosu", team: "Operations Analytics" },
    openedAt: "2026-07-11T07:00:00Z", resolvedAt: null,
    detectedBy: "Anomaly rule - chargeback rate by channel",
    summary: "A new reseller channel double-charged customers; chargebacks reached 4.1%.",
    rootCause:
      "The reseller's integration retried failed captures without checking whether the original " +
      "had settled. Customers were charged twice and disputed the second charge.",
    resolution:
      "Channel suspended for new transactions and the reseller issued a fix. Watching two full " +
      "settlement cycles before re-enabling, so this stays open.",
    affectedKpis: ["Chargeback Rate", "Net Revenue"],
    affectedDatasets: ["core_layer.fct_transactions", "core_layer.fct_settlements"],
    businessImpactUsd: 418000,
    doc: "scenario-20-chargeback-spike.md",
    timeline: [
      { at: "2026-07-11T07:00:00Z", actor: "chargeback_anomaly_rule", kind: "detected", note: "Channel chargeback rate 4.1% against a 0.6% book average." },
      { at: "2026-07-11T12:00:00Z", actor: "Amara Nwosu", kind: "triaged", note: "Isolated to one reseller onboarded three weeks earlier." },
      { at: "2026-07-13T09:00:00Z", actor: "Risk Operations", kind: "mitigated", note: "Channel suspended for new transactions; reseller shipped a fix." },
    ],
  },
  {
    id: "S21",
    title: "FX conversion error in global consolidation",
    domain: "Finance", severity: "P1", status: "Resolved",
    owner: { name: "Sara Lindqvist", team: "Analytics Engineering" },
    openedAt: "2026-06-01T08:00:00Z", resolvedAt: "2026-06-05T19:00:00Z",
    detectedBy: "Reconciliation - consolidated vs regional ledgers",
    summary: "fx_rate silently defaulted to 1.0, understating EMEA revenue by 14% ($18.4M).",
    rootCause:
      "The consolidation query used COALESCE(fx_rate, 1.0) to avoid nulls. When the rate feed " +
      "missed a day, every EMEA transaction was converted at parity instead of failing loudly.",
    resolution:
      "Removed the default. A missing FX rate now fails the consolidation, and the rate feed has " +
      "its own freshness SLO.",
    affectedKpis: ["Net Revenue", "Regional Revenue Mix"],
    affectedDatasets: ["core_layer.fct_transactions", "core_layer.dim_fx_rate"],
    businessImpactUsd: 18400000,
    doc: "scenario-21-fx-error.md",
    timeline: [
      { at: "2026-06-01T08:00:00Z", actor: "recon_consolidation", kind: "detected", note: "Consolidated EMEA revenue 14% below the regional ledger." },
      { at: "2026-06-02T11:00:00Z", actor: "Sara Lindqvist", kind: "investigated", note: "COALESCE(fx_rate, 1.0) masked a missing rate feed day." },
      { at: "2026-06-05T19:00:00Z", actor: "Sara Lindqvist", kind: "resolved", note: "Default removed; FX feed given its own freshness SLO." },
    ],
  },
  {
    id: "S22",
    title: "Orphan FK surge after master data cleanup",
    domain: "DQ", severity: "P2", status: "Resolved",
    owner: { name: "Priya Raghavan", team: "Data Governance" },
    openedAt: "2026-06-20T09:00:00Z", resolvedAt: "2026-06-24T15:00:00Z",
    detectedBy: "Referential integrity rule - fct_transactions.customer_id",
    summary: "A customer merge did not remap fact keys; $610k of transactions went unattributed.",
    rootCause:
      "A master-data deduplication merged duplicate customer records and retired the losing IDs, " +
      "but the fact tables still referenced them. Those rows joined to nothing and dropped out of " +
      "every customer-level report.",
    resolution:
      "Merges now emit a remap table applied to all downstream facts in the same transaction, and " +
      "a referential integrity rule runs post-merge.",
    affectedKpis: ["Active Customers", "GMV by Customer"],
    affectedDatasets: ["core_layer.fct_transactions", "core_layer.dim_customer"],
    businessImpactUsd: 610000,
    doc: "scenario-22-orphan-fk.md",
    timeline: [
      { at: "2026-06-20T09:00:00Z", actor: "ri_rule_txn_customer", kind: "detected", note: "8,410 transactions referencing retired customer IDs." },
      { at: "2026-06-21T13:00:00Z", actor: "Priya Raghavan", kind: "investigated", note: "MDM merge retired IDs without remapping facts." },
      { at: "2026-06-24T15:00:00Z", actor: "Priya Raghavan", kind: "resolved", note: "Remap applied; RI check added to the merge procedure." },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Activity feed                                                              */
/* -------------------------------------------------------------------------- */

const ACTIVITY: ActivityEntry[] = [
  { at: "2026-07-14T13:45:00Z", actor: "Sara Lindqvist", action: "resolved incident", target: "S04 · Data freshness breach" },
  { at: "2026-07-14T11:20:00Z", actor: "Tomás Herrera", action: "published KPI", target: "Cost per TB (rolling 7d)" },
  { at: "2026-07-14T09:05:00Z", actor: "dq_rule_customer_email_complete", action: "raised alert", target: "dim_customer.email - 71% complete" },
  { at: "2026-07-14T07:10:00Z", actor: "Daniel Okafor", action: "resolved incident", target: "S03 · Pipeline failure" },
  { at: "2026-07-13T19:30:00Z", actor: "Daniel Okafor", action: "promoted rule to blocking", target: "dq_rule_txn_daily_volume" },
  { at: "2026-07-13T16:00:00Z", actor: "Priya Raghavan", action: "certified dataset", target: "analytics_layer.semantic_executive" },
  { at: "2026-07-13T10:00:00Z", actor: "Nadia Farouk", action: "commented on", target: "S19 · Self-serve adoption drop" },
  { at: "2026-07-13T09:00:00Z", actor: "Risk Operations", action: "mitigated incident", target: "S20 · Chargeback rate spike" },
];

/* -------------------------------------------------------------------------- */
/* Scenario simulator model                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Baselines are the measured values in the demo warehouse as of AS_OF. The
 * simulator is only honest if it starts from where the business actually is.
 */
const IMPACT_MODEL: ImpactModel = {
  levers: [
    { id: "approvalRate", label: "Payment approval rate", help: "Share of attempted payments that succeed. Every recovered point converts directly into settled revenue.", unit: "%", baseline: 91.4, min: 85, max: 99, step: 0.1 },
    { id: "processingTime", label: "Order processing time", help: "Median minutes from order placed to fulfilment started. Drives operational cost per order.", unit: "min", baseline: 42, min: 10, max: 90, step: 1 },
    { id: "repeatCalls", label: "Repeat support contacts", help: "Share of cases needing more than one contact. Each repeat is a fully-loaded agent handling cost.", unit: "%", baseline: 23.5, min: 5, max: 40, step: 0.5 },
    { id: "csat", label: "Customer satisfaction", help: "CSAT out of 100. Moves retention, which compounds into annual revenue.", unit: "count", baseline: 78, min: 50, max: 95, step: 1 },
    { id: "txnVolume", label: "Transaction volume", help: "Multiplier on current daily transaction count.", unit: "x", baseline: 1.0, min: 0.7, max: 1.6, step: 0.05 },
  ],
  assumptions: [
    { label: "Annual GMV baseline", value: "$45.9M", note: "90-day posted GMV in the demo warehouse, annualised." },
    { label: "Orders per year", value: "417,000", note: "Posted transaction count, annualised from the 90-day window." },
    { label: "Fully-loaded ops cost", value: "$1.15 / order-minute", note: "Blended fulfilment cost used by Operations Finance." },
    { label: "Support contact cost", value: "$7.40 / contact", note: "Agent time plus systems, per Operations Analytics." },
    { label: "Retention elasticity", value: "0.9% revenue per CSAT point", note: "Regression over 8 quarters; treat as directional, not causal." },
    { label: "Marginal cost ratio", value: "62% of incremental GMV", note: "Cost of goods and payment fees on additional volume." },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adapter                                                                    */
/* -------------------------------------------------------------------------- */

function computeHealth(): PlatformHealth {
  const open = INCIDENTS.filter((i) => i.status !== "Resolved");
  return {
    enterpriseKpiScore: 82.4,
    dataQualityScore: 97.0,
    pipelineSuccessRate: 94.6,
    freshnessMinutes: 11,
    openIncidents: open.length,
    p1Incidents: open.filter((i) => i.severity === "P1").length,
    alertsToday: 7,
    cloudCostTodayUsd: 41200,
    cloudCostTrendPct: 192.2,
    businessImpactUsd: open.reduce((a, i) => a + (i.businessImpactUsd ?? 0), 0),
    asOf: AS_OF,
  };
}

export const seededAdapter: DataAdapter = {
  source: "Seeded demo dataset (no warehouse connection)",
  async getPlatformHealth() { return computeHealth(); },
  async listIncidents() { return INCIDENTS; },
  async getIncident(id) { return INCIDENTS.find((i) => i.id === id) ?? null; },
  async getRecentActivity() { return ACTIVITY; },
  async getImpactModel() { return IMPACT_MODEL; },
};
