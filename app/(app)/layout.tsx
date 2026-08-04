import { requireUser } from "@/lib/auth";
import { allowedNav } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "ZUMIQ" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = allowedNav(user.role);
  return <AppShell user={user} nav={nav}>{children}</AppShell>;
}
