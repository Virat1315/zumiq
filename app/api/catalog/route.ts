import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DATASETS } from "@/lib/data/enterprise";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const ds = DATASETS.find((d) => d.id === id);
    return NextResponse.json({ dataset: ds || null });
  }
  return NextResponse.json({ datasets: DATASETS });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ds = DATASETS.find((d) => d.id === body.datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    message: `Access request for ${ds.name} submitted by ${user.name}.`,
  });
}
