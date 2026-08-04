import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";
import { DATASETS, type DqRule } from "@/lib/data/enterprise";

export async function GET() {
  return NextResponse.json({ rules: storeApi.getRules() });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const updated = storeApi.updateRule(body.id, { enabled: Boolean(body.enabled) });
  if (!updated) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ rule: updated });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, type, dataset, datasetId, column, params, threshold, schedule, enabled } = body;
  const ds = DATASETS.find((d) => d.id === datasetId) || DATASETS.find((d) => d.name === dataset);
  if (!name || !type || !ds) return NextResponse.json({ error: "name, type and dataset are required" }, { status: 400 });

  const rule: DqRule = {
    id: "R-" + Math.floor(100 + Math.random() * 899),
    name,
    type,
    dataset: ds.name,
    datasetId: ds.id,
    column: column || undefined,
    params: params || "",
    threshold: threshold || "-",
    enabled: enabled !== false,
    owner: user.name,
    schedule: schedule || "Hourly",
    lastRun: { status: "PENDING", checked: 0, failed: 0, durationMs: 0, at: new Date().toISOString() },
  };
  storeApi.createRule(rule);
  return NextResponse.json({ rule }, { status: 201 });
}
