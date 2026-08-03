/**
 * Domain types for the ZUMIQ platform.
 *
 * These describe the *shape the product needs*, not the shape any particular
 * warehouse happens to return. That separation is the whole point: a BigQuery
 * implementation and the seeded implementation both map onto these, so no
 * page or component knows where its data came from.
 */

export type Severity = "P1" | "P2" | "P3";

export type IncidentStatus = "Open" | "Investigating" | "Mitigated" | "Resolved";

/** Mirrors the `domain` values already used by docs/scenarios/ and web/js/data.js. */
export type IncidentDomain =
  | "Governance" | "Revenue" | "Reliability" | "Freshness" | "Cost"
  | "DQ" | "Metadata" | "CX" | "Schema" | "Timeliness" | "Operations"
  | "Performance" | "Accuracy" | "BI" | "Product" | "Risk" | "Finance";

/** One entry in an incident's audit trail. */
export interface TimelineEntry {
  /** ISO timestamp. */
  at: string;
  /** Who or what acted - a person, or an automated detector. */
  actor: string;
  kind: "detected" | "triaged" | "investigated" | "mitigated" | "resolved" | "note";
  note: string;
}

export interface Incident {
  id: string;
  title: string;
  domain: IncidentDomain;
  severity: Severity;
  status: IncidentStatus;
  /** Owning individual and the team accountable for resolution. */
  owner: { name: string; team: string };
  openedAt: string;
  resolvedAt: string | null;
  /** The rule or human that raised it - matters for measuring detection coverage. */
  detectedBy: string;
  summary: string;
  rootCause: string;
  resolution: string;
  /** KPIs whose numbers moved because of this incident. */
  affectedKpis: string[];
  /** Fully-qualified warehouse tables implicated. */
  affectedDatasets: string[];
  /** Estimated financial exposure, USD. Null when genuinely not quantifiable. */
  businessImpactUsd: number | null;
  timeline: TimelineEntry[];
  /** Long-form write-up in docs/scenarios/. */
  doc: string;
}

/** Headline numbers for the landing page. */
export interface PlatformHealth {
  enterpriseKpiScore: number;
  dataQualityScore: number;
  pipelineSuccessRate: number;
  freshnessMinutes: number;
  openIncidents: number;
  p1Incidents: number;
  alertsToday: number;
  cloudCostTodayUsd: number;
  cloudCostTrendPct: number;
  /** Total unresolved financial exposure across open incidents. */
  businessImpactUsd: number;
  asOf: string;
}

export interface ActivityEntry {
  at: string;
  actor: string;
  action: string;
  target: string;
}

/**
 * A single adjustable driver in the scenario simulator.
 *
 * `unit` drives formatting only. `baseline` is the current measured value, so
 * a simulation always starts from where the business actually is.
 */
export interface Lever {
  id: string;
  label: string;
  help: string;
  unit: "%" | "min" | "count" | "x";
  baseline: number;
  min: number;
  max: number;
  step: number;
}

export interface ImpactModel {
  levers: Lever[];
  /** Constants the impact maths is built from, surfaced so the model is auditable. */
  assumptions: { label: string; value: string; note: string }[];
}

/**
 * The one interface every page depends on.
 *
 * Implement this against BigQuery and the product switches over with no other
 * change. See lib/data/bigquery.ts for the query each method maps to.
 */
export interface DataAdapter {
  /** Human-readable name of the backing store, shown in the UI footer. */
  readonly source: string;
  getPlatformHealth(): Promise<PlatformHealth>;
  listIncidents(): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  getRecentActivity(): Promise<ActivityEntry[]>;
  getImpactModel(): Promise<ImpactModel>;
}
