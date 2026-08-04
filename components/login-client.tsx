"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, ShieldCheck } from "lucide-react";
import { USERS, ROLE_LABELS, type Role } from "@/lib/data/enterprise";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ROLE_ORDER: Role[] = ["admin", "executive", "analyst", "engineer", "pm", "operations"];

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [busy, setBusy] = React.useState(false);

  const login = async (email: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Login failed");
      toast.success(`Signed in as ${email.split("@")[0]}`);
      router.push(next);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">ZUMIQ</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Data Intelligence</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/70 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-lg font-semibold">Choose a persona to continue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Demo workspace with role-based access. Sign in as anyone - the sidebar adapts to their permissions.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {ROLE_ORDER.map((role) => (
              <div key={role}>
                <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ROLE_LABELS[role]}</div>
                <div className="flex flex-col gap-1.5">
                  {USERS.filter((u) => u.role === role).map((u) => (
                    <button
                      key={u.id}
                      disabled={busy}
                      onClick={() => login(u.email)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50",
                        u.email === "ada@zumiq.io" && "border-primary/40"
                      )}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback style={{ background: u.color + "22", color: u.color }}>{u.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{u.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{u.title}</span>
                      </span>
                      <LogIn className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span>Default demo admin</span>
            <button onClick={() => login("ada@zumiq.io")} disabled={busy} className="font-semibold text-primary hover:underline">
              ada@zumiq.io
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Synthetic deterministic demo data · all systems as of 2026-07-14
        </p>
      </div>
    </div>
  );
}
