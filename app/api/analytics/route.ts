import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FEATURE_USAGE, MOST_USED_KPIS, ANALYTICS_SUMMARY, getDauSeries } from "@/lib/data/enterprise";

export async function GET() {
  return NextResponse.json({
    summary: ANALYTICS_SUMMARY,
    dau: getDauSeries(),
    featureUsage: FEATURE_USAGE,
    mostUsedKpis: MOST_USED_KPIS,
  });
}
