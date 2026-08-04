import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { askExecutive } from "@/lib/data/executive-ask";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "");
  if (!question.trim()) return NextResponse.json({ error: "Ask a question" }, { status: 400 });
  const result = askExecutive(question);
  return NextResponse.json({ result });
}
