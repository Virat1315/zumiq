import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCostInsights } from "@/lib/data/cost";

export async function GET() {
  return NextResponse.json({ insights: getCostInsights() });
}
