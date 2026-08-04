import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/data/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Number(req.nextUrl.searchParams.get("limit") || 40);
  return NextResponse.json({ results: searchAll(q, limit) });
}
