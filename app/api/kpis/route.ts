import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";
import { getKpis, DATASETS, type Kpi } from "@/lib/data/enterprise";
import { generateSql } from "@/lib/data/playground";
import { seedData } from "@/lib/data/core";

export async function GET() {
  return NextResponse.json({ kpis: getKpis() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, dataset, datasetId, metric, aggregation, dimensions, timeWindow, unit, direction, target, threshold } = body;

  const ds = DATASETS.find((d) => d.id === datasetId) || DATASETS.find((d) => d.name === dataset);
  if (!name || !ds || !metric) {
    return NextResponse.json({ error: "name, dataset and metric are required" }, { status: 400 });
  }

  const sql = generateSql({
    dataset: ds.name,
    metric,
    aggregation,
    dimensions: dimensions || [],
    timeWindow: timeWindow || "30d",
  });

  // derive a live value + spark from seeded data so the KPI is immediately usable
  const d = seedData();
  const hash = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
  const lastGmv = d.dailyGmv[d.dailyGmv.length - 1].value;
  const value = Math.round(lastGmv * 30 * (0.9 + (hash(name + metric) % 20) / 100));
  const spark = d.dailyGmv.slice(-30).map((x, i) => Math.round(x.value * (0.9 + ((hash(name + i) % 20)) / 100)));

  const kpi: Kpi = {
    id: "KPI-" + String(100 + getKpis().length + 1),
    name,
    dataset: ds.name,
    datasetId: ds.id,
    metric,
    aggregation,
    dimensions: dimensions || [],
    timeWindow: timeWindow || "30d",
    unit: unit || "count",
    direction: direction === "LOWER_IS_BETTER" ? "LOWER_IS_BETTER" : "HIGHER_IS_BETTER",
    target: Number(target) || 0,
    threshold: Number(threshold) || 0,
    owner: user.name,
    ownerId: user.id,
    status: "PUBLISHED",
    certified: false,
    sql,
    spark,
    value,
    lastStatus: value >= (Number(threshold) || 1) ? "ON_TRACK" : "WARNING",
  };

  storeApi.createKpi(kpi);
  return NextResponse.json({ kpi }, { status: 201 });
}
