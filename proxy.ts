import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession, canAccess } from "@/lib/auth";
import { USERS } from "@/lib/data/enterprise";

const PUBLIC_PATHS = ["/login"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/images", "/fonts"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (PUBLIC_PATHS.includes(pathname)) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (await verifySession(token)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = await verifySession(token);
  if (!payload) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const user = USERS.find((u) => u.email === payload.email);
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const segments = pathname.split("/").filter(Boolean);
  const navId = segments.length === 0 ? "home" : segments[0];
  const navMap: Record<string, string> = {
    "": "home",
    kpis: "kpis",
    quality: "quality",
    upload: "upload",
    pipelines: "pipelines",
    incidents: "incidents",
    notifications: "notifications",
    catalog: "catalog",
    playground: "playground",
    marketplace: "marketplace",
    cost: "cost",
    governance: "governance",
    ask: "ask",
    simulator: "simulator",
    analytics: "analytics",
  };
  const itemId = navMap[navId] || "home";
  if (!canAccess(user.role, itemId)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
