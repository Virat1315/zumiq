import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSql } from "@/lib/data/playground";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sql = String(body.sql || "");
  if (!sql.trim()) return NextResponse.json({ error: "Empty query" }, { status: 400 });
  try {
    const result = runSql(sql);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
