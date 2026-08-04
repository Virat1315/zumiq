import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken, userForToken } from "@/lib/auth";
import { USERS } from "@/lib/data/enterprise";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase();
  const user = USERS.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  }
  const token = await createSessionToken(user.email);
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, title: user.title, avatar: user.avatar, color: user.color },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = await userForToken(token);
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user });
}
