import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";

export async function GET() {
  const notifications = storeApi.getNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (id) storeApi.markRead(id);
  else storeApi.markAllRead();
  return NextResponse.json({ ok: true });
}
