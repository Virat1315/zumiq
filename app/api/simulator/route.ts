import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSimulation, type SimInputs } from "@/lib/data/simulator";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<SimInputs>;
  const inputs: SimInputs = {
    approvalRate: Number(body.approvalRate) || 94,
    processingTime: Number(body.processingTime) || 24,
    repeatCalls: Number(body.repeatCalls) || 11,
    customerSatisfaction: Number(body.customerSatisfaction) || 4.1,
    transactionVolume: Number(body.transactionVolume) || 4,
  };
  return NextResponse.json({ impact: runSimulation(inputs) });
}
