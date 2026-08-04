import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { INCIDENTS } from "@/lib/data/enterprise";

export async function GET() {
  return NextResponse.json({ incidents: INCIDENTS });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const inc = INCIDENTS.find((i) => i.id === body.id);
  if (!inc) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  if (body.status) {
    inc.status = body.status;
    inc.timeline.push({ at: new Date().toISOString(), actor: user.name, message: `Status updated to ${body.status}.` });
  }
  return NextResponse.json({ incident: inc });
}
