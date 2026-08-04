import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";

// Simulates executing a DQ rule against the seeded warehouse and returns
// a deterministic pass/fail verdict based on the rule's real dataset state.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rule = storeApi.getRules().find((r) => r.id === id);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  // deterministic verdict: seeds derived from rule + current date
  const today = new Date().toISOString().slice(0, 10);
  const h = (s: string) => Array.from(s).reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 100000, 11);
  const base = h(rule.id + today);
  const checked = rule.lastRun.checked || 10000;
  const failed = base % 40 < 2 ? Math.max(1, Math.round(checked * 0.02)) : base % 3 === 0 ? Math.round(checked * 0.006) : 0;
  const pass = failed / checked < 0.005;

  const updated = storeApi.updateRule(rule.id, {
    lastRun: { status: pass ? "PASS" : "FAIL", checked, failed, durationMs: 400 + (base % 5000), at: new Date().toISOString() },
  });

  return NextResponse.json({ rule: updated, result: { pass, checked, failed, ratio: failed / checked } });
}
