import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { seedData } from "@/lib/data/core";

export async function GET() {
  const d = seedData();
  const pipeNames = Array.from(new Set(d.pipelines.map((p) => p.pipeline)));
  const pipelines = pipeNames.map((name) => {
    const runs = d.pipelines.filter((p) => p.pipeline === name);
    const recent = runs.slice(-7);
    return {
      name,
      target: runs[0]?.target,
      status: recent.some((r) => r.status === "FAILED") ? "DEGRADED" : "HEALTHY",
      successRate: Math.round((recent.filter((r) => r.status === "SUCCESS").length / recent.length) * 100),
      runs: runs.length,
      lastRun: runs[runs.length - 1],
      history: recent.map((r) => ({ date: r.date, status: r.status, rows: r.rows, durationSec: r.durationSec })),
    };
  });
  return NextResponse.json({ pipelines });
}
