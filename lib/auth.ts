import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS, NAV_ITEMS, type Role } from "@/lib/data/enterprise";

const COOKIE = "zumiq_session";
const MAX_AGE = 60 * 60 * 12; // 12h

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  title: string;
  color: string;
  avatar: string;
}

function secret(): string {
  return process.env.ZUMIQ_SECRET || "zumiq-dev-secret-2026-change-in-prod";
}

const enc = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: { email: string; exp: number }): Promise<string> {
  const body = btoa(JSON.stringify(payload));
  const sigBuf = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${body}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<{ email: string; exp: number } | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await hmacKey();
  const valid = await crypto.subtle.verify("HMAC", key, new Uint8Array(atob(sig).split("").map((c) => c.charCodeAt(0))), enc.encode(body));
  if (!valid) return null;
  try {
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function userForToken(token: string | undefined | null): Promise<SessionUser | null> {
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = USERS.find((u) => u.email === payload.email);
  if (!user) return null;
  const { id, name, email, role, team, title, color, avatar } = user;
  return { id, name, email, role, team, title, color, avatar };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return userForToken(token);
}

export async function createSessionToken(email: string): Promise<string> {
  return signSession({ email, exp: Date.now() + MAX_AGE * 1000 });
}

export const COOKIE_NAME = COOKIE;

/* ---------------- role-based access ---------------- */
export function canAccess(role: Role, navId: string): boolean {
  const item = NAV_ITEMS.find((n) => n.id === navId);
  if (!item) return false;
  return item.roles.includes(role) || role === "admin";
}

export function allowedNav(role: Role) {
  return NAV_ITEMS.filter((n) => n.roles.includes(role) || role === "admin");
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAccess(navId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, navId)) redirect("/");
  return user;
}
