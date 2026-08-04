// Executive Ask - a lightweight reasoning engine that maps a natural-language
// question to relevant KPIs, datasets, pipeline state, incidents and actions.

import { getKpis, INCIDENTS, DATASETS } from "./enterprise";
import { seedData } from "./core";

export interface AskResult {
  answer: string;
  kpis: { name: string; value: string; status: string }[];
  datasets: { name: string; domain: string }[];
  incidents: { id: string; title: string; severity: string; status: string }[];
  pipelineState: { pipeline: string; status: string }[];
  possibleCauses: string[];
  recommendedActions: string[];
}

function keywordHits(question: string, terms: string[]): number {
  const q = question.toLowerCase();
  return terms.filter((t) => q.includes(t)).length;
}

export function askExecutive(question: string): AskResult {
  const q = question.toLowerCase();
  const d = seedData();
  const kpis = getKpis();
  const fmt = (n?: number) => (n === undefined ? "-" : n.toLocaleString("en-US", { maximumFractionDigits: 0 }));
  const statusLabel = (s?: string) => (s === "BREACH" ? "BREACH" : s === "WARNING" ? "WARNING" : "ON TRACK");

  // Determine topic
  const topic = ["satisfaction", "csat", "churn", "customer"]
    .filter((t) => q.includes(t)).length
    ? "csat"
    : ["sla", "support", "cases", "service"].filter((t) => q.includes(t)).length
      ? "sla"
      : ["cost", "spend", "bigquery", "cloud", "money"].filter((t) => q.includes(t)).length
        ? "cost"
        : ["gmv", "revenue", "sales", "margin", "p&l", "profit"].filter((t) => q.includes(t)).length
          ? "revenue"
          : ["quality", "dq", "null", "duplicate", "data"].filter((t) => q.includes(t)).length
            ? "quality"
            : ["pipeline", "batch", "freshness", "stale", "load"].filter((t) => q.includes(t)).length
              ? "pipeline"
              : "general";

  const pickKpis = (ids: string[]) => kpis.filter((k) => ids.includes(k.id));
  const related: Record<string, { ids: string[]; answer: string; causes: string[]; actions: string[]; incidents: string[] }> = {
    csat: {
      ids: ["KPI-004", "KPI-010"],
      answer: `CSAT is at 4.12 (down from 4.4) and Support SLA is ${fmt(kpis.find((k) => k.id === "KPI-004")?.value)}% - a billing regression in mid-July drove 4,000+ cases and a 3.2x case spike, which degraded satisfaction.`,
      causes: ["Payment gateway regression (svc-pay-3) ×14 failure spike on Jul 11", "Billing case spike 3.2x baseline (INC-2026-035)", "SLA board under-counted open cases - real SLA 71% (INC-2026-038)"],
      actions: ["Confirm gateway rollback complete and replay payments idempotently", "Fix SLA definition to include open + resolved cases", "Deploy case deflection for known billing issues", "Re-measure CSAT after 14 days of stable billing"],
      incidents: ["INC-2026-038", "INC-2026-035"],
    },
    sla: {
      ids: ["KPI-004", "KPI-008"],
      answer: `SLA Attainment is at ${fmt(kpis.find((k) => k.id === "KPI-004")?.value)}% vs a 97% target (BREACH). The billing bug wave and an SLA definition gap are the drivers.`,
      causes: ["INC-2026-038: board counted only CLOSED cases", "Case volume 3.2x from payment gateway regression", "Backlog not included in attainment calc"],
      actions: ["Adopt the corrected SLA definition (open + resolved)", "Drain the 4,000-case backlog with a surge plan", "Add P1 case auto-escalation to Executive Slack"],
      incidents: ["INC-2026-038", "INC-2026-035"],
    },
    cost: {
      ids: ["KPI-007", "KPI-011"],
      answer: `Daily cloud cost is $${fmt(kpis.find((k) => k.id === "KPI-007")?.value)} - a 2.9x anomaly vs the $14k baseline (INC-2026-041). One analyst's Tableau extract is scanning 4.3 TB every 30 minutes.`,
      causes: ["Runaway full-table extract (analyst@zumiq.io) - 336 runs, 4,320 GB each", "Dashboard bound to raw fact table instead of certified gold mart", "No cache and no LIMIT preview on extracts"],
      actions: ["Rebind dashboard to gold_layer.kpi_executive_daily (deployed)", "Enable cache and add LIMIT preview to extract", "Set FinOps alert at $30k/day and notify team quota owner"],
      incidents: ["INC-2026-041"],
    },
    revenue: {
      ids: ["KPI-001", "KPI-003", "KPI-009", "KPI-010"],
      answer: `GMV is $${fmt(kpis.find((k) => k.id === "KPI-001")?.value)} (30d) with a Jul 13 -18% volume dip from a silent source gap (already resolved). Chargeback rate is 4.1% and subtracting ~$1.9M of refund exposure from net revenue.`,
      causes: ["Jul 13 source gap: OMS connector down 7h (INC-2026-039, resolved)", "Chargeback spike via reseller double-charge (INC-2026-040)", "1.4% late-arriving data forcing restatements (INC-2026-034)"],
      actions: ["Confirm chargeback refund reversal complete", "Watch GMV 7-day trailing after volume guardrail", "Include late-arrival buffer in next month P&L"],
      incidents: ["INC-2026-039", "INC-2026-040", "INC-2026-034"],
    },
    quality: {
      ids: ["KPI-005", "KPI-001"],
      answer: `Enterprise DQ Score is ${fmt(kpis.find((k) => k.id === "KPI-005")?.value)}/100. Customer 360 dipped to 89.4 on Jul 13 from a CRM null spike (EMEA emails 22% NULL).`,
      causes: ["CRM field rename not propagated to CDC mapping (schema drift)", "Null spike on dim_customer.email - 221k rows", "R-104 rule threshold breached"],
      actions: ["Verify CDC mapping fix in production", "Backfill NULL emails from CRM", "Add SCHEMA drift rule to CRM feed (done - R-107)"],
      incidents: ["INC-2026-036"],
    },
    pipeline: {
      ids: ["KPI-011", "KPI-008"],
      answer: `fct_transactions is ${fmt(kpis.find((k) => k.id === "KPI-011")?.value)} min stale vs a 15-min SLA (BREACH). FCT_TRANSACTIONS_LOAD has failed 2 consecutive runs (INC-2026-037).`,
      causes: ["Duplicate txn_id in retry file violating the unique constraint (S03)", "Overnight batch blocked since Jul 13", "Freshness SLA breach since the load stopped"],
      actions: ["Replay with dedup pre-step and UNIQUE rule (R-101)", "Backfill the 26h gap after load resumes", "Monitor gold KPI recompute freshness after catch-up"],
      incidents: ["INC-2026-037"],
    },
    general: {
      ids: ["KPI-001", "KPI-005"],
      answer: `Here's the current platform state: GMV $${fmt(kpis.find((k) => k.id === "KPI-001")?.value)} (30d), Enterprise DQ Score ${fmt(kpis.find((k) => k.id === "KPI-005")?.value)}, 1 open P1 incident (INC-2026-037 pipeline failure) and 2 in-progress cost/support incidents.`,
      causes: ["Open incident INC-2026-037: FCT_TRANSACTIONS_LOAD failing", "INC-2026-041: cost spike under investigation", "INC-2026-040: chargeback spike mitigated"],
      actions: ["Review open incidents in the Incident Center", "Open the Executive Dashboard for live KPIs", "Schedule an incident review for INC-2026-041"],
      incidents: ["INC-2026-037", "INC-2026-041", "INC-2026-040"],
    },
  };

  const r = related[topic];
  const relatedKpis = pickKpis(r.ids);
  const relatedIncidents = INCIDENTS.filter((i) => r.incidents.includes(i.id));
  const pipeState = Array.from(new Set(d.pipelines.map((p) => p.pipeline))).slice(0, 6).map((p) => {
    const runs = d.pipelines.filter((x) => x.pipeline === p).slice(-3);
    return { pipeline: p, status: runs.some((x) => x.status === "FAILED") ? "DEGRADED" : "HEALTHY" };
  });

  return {
    answer: r.answer,
    kpis: relatedKpis.map((k) => ({ name: k.name, value: k.value ? fmt(k.value) : "-", status: statusLabel(k.lastStatus) })),
    datasets: r.incidents.length ? relatedIncidents.flatMap((i) => i.affectedSystems).slice(0, 4).map((name) => ({ name, domain: "System" })) : DATASETS.slice(0, 4).map((dd) => ({ name: dd.name, domain: dd.domain })),
    incidents: relatedIncidents.map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status })),
    pipelineState: pipeState,
    possibleCauses: r.causes,
    recommendedActions: r.actions,
  };
}

export const ASK_SUGGESTIONS = [
  "Why did customer satisfaction decrease?",
  "Why is our cloud cost up?",
  "Is revenue on track this month?",
  "Why is support SLA breaching?",
  "What's the data quality status?",
  "Why is my pipeline failing?",
];
