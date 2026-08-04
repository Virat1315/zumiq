"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, LogOut, ChevronsUpDown, Command } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import type { NavItem } from "@/lib/data/enterprise";
import { ROLE_LABELS } from "@/lib/data/enterprise";
import { navIcon } from "@/components/icons";
import { CommandSearch } from "@/components/command-search";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AppShell({ user, nav, children }: { user: SessionUser; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = Array.from(new Set(nav.map((n) => n.section)));
  const current = nav.find((n) => n.href !== "/" && pathname.startsWith(n.href)) || nav.find((n) => n.href === pathname);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">ZUMIQ</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Data Intelligence</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {sections.map((s) => (
            <div key={s} className="mb-4">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">{s}</div>
              <div className="flex flex-col gap-0.5">
                {nav
                  .filter((n) => n.section === s)
                  .map((n) => {
                    const Icon = navIcon(n.icon);
                    const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        {n.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">System as of</div>
            <div className="mt-0.5 font-mono text-[11px] font-semibold text-primary">2026-07-14</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="lg:hidden">
            <span className="text-sm font-bold text-primary">ZUMIQ</span>
          </div>
          <div className="hidden min-w-0 flex-1 text-sm font-medium lg:block">
            {current ? current.label : ""}
          </div>
          <div className="flex flex-1 justify-end lg:flex-none lg:justify-start">
            <CommandSearch />
          </div>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-1.5 py-1 transition-colors hover:border-primary/40">
                <Avatar className="h-7 w-7">
                  <AvatarFallback style={{ background: user.color + "22", color: user.color }}>{user.avatar}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[8rem] truncate text-xs font-semibold leading-tight">{user.name}</span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                </span>
                <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold">{user.name}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Command className="h-4 w-4" />
                {user.title} · {user.team}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
