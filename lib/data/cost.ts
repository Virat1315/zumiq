// Cloud cost insights derived from the seeded cost data.

import { seedData } from "./core";
import { DATASETS } from "./enterprise";

export interface CostInsights {
  dailyCost: { label: string; value: number }[];
  byUser: { label: string; value: number; team: string; gb: number; queries: number; runaway?: boolean }[];
  byDataset: { label: string; value: number }[];
  byTeam: { label: string; value: number }[];
  topQueries: { id: string; user: string; team: string; dataset: string; sql: string; gb: number; cost: number; cacheHit: boolean; timesRun: number }[];
  storage: { label: string; value: number }[];
  partitionSavings: number;
  clusteringBenefits: number;
  unusedTables: { name: string; sizeGb: number; lastAccess: string }[];
  suggestions: { title: string; detail: string; savings: string; effort: "Low" | "Medium" | "High" }[];
  totals: {
    total30d: number;
    avgDaily: number;
    baseline: number;
    overrun: number;
    cacheRate: number;
    costPerTb: number;
  };
}

export function getCostInsights(): CostInsights {
  const d = seedData();
  const daily = d.costDaily.map((x) => ({ label: x.date, value: x.value }));
  const total30d = d.costDaily.slice(-30).reduce((a, x) => a + x.value, 0);
  const avgDaily = total30d / 30;
  const baseline = d.costDaily.slice(-30, -7).reduce((a, x) => a + x.value, 0) / 23;
  const overrun = d.costDaily.slice(-7).reduce((a, x) => a + x.value, 0) - baseline * 7;

  const byUser = d.costUsers
    .map((u) => ({ label: u.email, value: u.cost, team: u.team, gb: u.gb, queries: u.queries, runaway: u.runaway }))
    .sort((a, b) => b.value - a.value);

  const byDataset = d.costDatasets.map((x) => ({ label: x.region, value: x.gmv })).sort((a, b) => b.value - a.value);
  const teamMap = new Map<string, number>();
  d.costUsers.forEach((u) => teamMap.set(u.team, (teamMap.get(u.team) || 0) + u.cost));
  const byTeam = Array.from(teamMap, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const storage = DATASETS.map((ds) => ({ label: ds.name, value: ds.sizeGb }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const unusedTables = [
    { name: "raw_layer.iot_telemetry_2024", sizeGb: 1420, lastAccess: "2025-11-02" },
    { name: "stg_campaigns_old", sizeGb: 38, lastAccess: "2026-01-19" },
    { name: "core_layer.dim_store_v1", sizeGb: 12, lastAccess: "2026-02-08" },
    { name: "analytics_layer.abandoned_experiments", sizeGb: 74, lastAccess: "2025-09-30" },
  ];

  const suggestions = [
    { title: "Migrate executive dashboard to gold mart", detail: "Replace full-table scan on fct_transactions with the certified kpi_executive_daily mart (INC-2026-041).", savings: "$24,000 / mo", effort: "Medium" as const },
    { title: "Enable query cache for dashboard refreshes", detail: "Cache dashboard queries - current hit rate is 24%, target > 80%.", savings: "$6,500 / mo", effort: "Low" as const },
    { title: "Enforce LIMIT preview on ad-hoc SQL", detail: "Add preview mode to the Query Playground to prevent accidental full scans.", savings: "$4,100 / mo", effort: "Low" as const },
    { title: "Drop 4 unused tables", detail: "Tables with no access in 120+ days - archive to cold storage first.", savings: "$900 / mo", effort: "Low" as const },
    { title: "Partition raw by ingestion date", detail: "raw_layer.transactions_landing is unpartitioned; add partition pruning.", savings: "$2,300 / mo", effort: "Medium" as const },
    { title: "Cluster fct_operations_events", detail: "Add clustering on service_name + event_type to cut scan volume.", savings: "$1,700 / mo", effort: "Medium" as const },
    { title: "Enforce slot quotas per team", detail: "Cap marketing extract queries to a dedicated reservation.", savings: "$3,900 / mo", effort: "High" as const },
  ];

  return {
    dailyCost: daily,
    byUser,
    byDataset,
    byTeam,
    topQueries: d.topQueries.map((q) => ({ ...q })),
    storage,
    partitionSavings: 2300,
    clusteringBenefits: 1700,
    unusedTables,
    suggestions,
    totals: {
      total30d,
      avgDaily,
      baseline,
      overrun,
      cacheRate: 24,
      costPerTb: 6.25,
    },
  };
}
