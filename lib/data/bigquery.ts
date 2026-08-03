/**
 * BigQuery implementation of DataAdapter.
 *
 * This is the swap point. The product talks to `DataAdapter` and nothing else,
 * so pointing ZUMIQ at a real warehouse means finishing the methods below and
 * setting ZUMIQ_DATA_SOURCE=bigquery. No page or component changes.
 *
 * It is deliberately not wired up by default. A live connection needs a GCP
 * project, a service account with BigQuery Job User, and billing enabled, and
 * a public demo that required those would simply be broken for anyone without
 * them. The SQL each method needs is written out here so the remaining work is
 * plumbing rather than design.
 *
 * To finish it:
 *   1. npm install @google-cloud/bigquery
 *   2. set GOOGLE_APPLICATION_CREDENTIALS (or workload identity) and
 *      ZUMIQ_GCP_PROJECT
 *   3. replace each notImplemented() with a client.query() call using the SQL
 *      below, mapping the result rows onto the domain types
 */

import type {
  ActivityEntry, DataAdapter, ImpactModel, Incident, PlatformHealth,
} from "./types";

/** Set from ZUMIQ_GCP_PROJECT. Every query below is qualified with it. */
const PROJECT = process.env.ZUMIQ_GCP_PROJECT ?? "zumiq-prod";

export const SQL = {
  /**
   * Landing page headline numbers.
   *
   * Reads the pre-aggregated executive table rather than the raw facts: this
   * runs on every page load, and scanning fct_transactions here is exactly the
   * mistake that caused incident S13.
   */
  platformHealth: `
    SELECT
      kpi_score              AS enterprise_kpi_score,
      dq_score               AS data_quality_score,
      pipeline_success_rate,
      freshness_minutes,
      open_incidents,
      p1_incidents,
      alerts_today,
      cloud_cost_today_usd,
      cloud_cost_trend_pct,
      business_impact_usd,
      as_of
    FROM \`${PROJECT}.analytics_layer.mv_platform_health\`
    WHERE as_of = CURRENT_DATE()
  `,

  /**
   * Incident list. Timelines are aggregated into a nested array so one query
   * returns a complete incident, avoiding an N+1 across 22+ rows.
   */
  listIncidents: `
    SELECT
      i.incident_id            AS id,
      i.title,
      i.domain,
      i.severity,
      i.status,
      i.owner_name,
      i.owner_team,
      i.opened_at,
      i.resolved_at,
      i.detected_by,
      i.summary,
      i.root_cause,
      i.resolution,
      i.affected_kpis,
      i.affected_datasets,
      i.business_impact_usd,
      i.doc_path,
      ARRAY_AGG(
        STRUCT(t.event_at AS at, t.actor, t.kind, t.note)
        ORDER BY t.event_at
      ) AS timeline
    FROM \`${PROJECT}.governance.incidents\` i
    LEFT JOIN \`${PROJECT}.governance.incident_timeline\` t
      USING (incident_id)
    GROUP BY
      i.incident_id, i.title, i.domain, i.severity, i.status,
      i.owner_name, i.owner_team, i.opened_at, i.resolved_at,
      i.detected_by, i.summary, i.root_cause, i.resolution,
      i.affected_kpis, i.affected_datasets, i.business_impact_usd, i.doc_path
    ORDER BY
      CASE i.status WHEN 'Open' THEN 0 WHEN 'Investigating' THEN 1
                    WHEN 'Mitigated' THEN 2 ELSE 3 END,
      CASE i.severity WHEN 'P1' THEN 0 WHEN 'P2' THEN 1 ELSE 2 END,
      i.opened_at DESC
  `,

  /** Single incident. Same shape as the list, filtered by key. */
  getIncident: `
    SELECT * FROM \`${PROJECT}.governance.v_incident_detail\`
    WHERE incident_id = @incident_id
  `,

  /**
   * Recent platform activity. Partition-filtered on purpose: the audit table is
   * the largest in the warehouse and an unfiltered scan is expensive.
   */
  recentActivity: `
    SELECT event_at AS at, actor, action, target
    FROM \`${PROJECT}.metadata.platform_activity\`
    WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ORDER BY event_at DESC
    LIMIT 20
  `,

  /**
   * Simulator baselines. The levers must start from measured values, so these
   * come from the warehouse rather than being hardcoded in the UI.
   */
  impactBaselines: `
    SELECT
      approval_rate_pct,
      median_processing_minutes,
      repeat_contact_rate_pct,
      csat_score,
      annual_gmv_usd,
      annual_order_count
    FROM \`${PROJECT}.analytics_layer.mv_operating_baselines\`
    WHERE as_of = CURRENT_DATE()
  `,
} as const;

function notImplemented(method: string): never {
  throw new Error(
    `BigQuery adapter: ${method}() is not wired up yet. ` +
      `The SQL is ready in lib/data/bigquery.ts; install @google-cloud/bigquery ` +
      `and run SQL.${method}. Until then set ZUMIQ_DATA_SOURCE=seeded.`
  );
}

export const bigQueryAdapter: DataAdapter = {
  source: `BigQuery (${PROJECT})`,
  async getPlatformHealth(): Promise<PlatformHealth> { notImplemented("platformHealth"); },
  async listIncidents(): Promise<Incident[]> { notImplemented("listIncidents"); },
  async getIncident(): Promise<Incident | null> { notImplemented("getIncident"); },
  async getRecentActivity(): Promise<ActivityEntry[]> { notImplemented("recentActivity"); },
  async getImpactModel(): Promise<ImpactModel> { notImplemented("impactBaselines"); },
};
