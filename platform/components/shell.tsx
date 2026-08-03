"use client";

/**
 * Application shell: sidebar, mobile drawer, and the footer line that names
 * which data source the platform is reading from.
 *
 * Client component because the drawer and the active-route highlight both need
 * browser state. The pages it wraps stay server components.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

const NAV = [
  { group: "Overview", items: [{ href: "/", label: "Platform Home", icon: "◉" }] },
  {
    group: "Operate",
    items: [
      { href: "/incidents", label: "Incident Center", icon: "⚠" },
      { href: "/simulator", label: "Scenario Simulator", icon: "◈" },
    ],
  },
];

export function Shell({ source, children }: { source: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation should close the drawer, otherwise it stays over the page
  // you just moved to.
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--color-line)] bg-[rgba(10,16,30,0.86)] px-4 py-2.5 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-base"
        >
          ☰
        </button>
        <div>
          <div className="text-sm font-bold tracking-wide">ZUMIQ</div>
          <div className="-mt-0.5 text-[11px] text-[var(--color-muted)]">Enterprise Data Intelligence</div>
        </div>
      </div>

      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-[rgba(4,8,16,0.66)] backdrop-blur-[2px] md:hidden"
        />
      )}

      <div className="flex min-h-screen">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col overflow-y-auto border-r border-[var(--color-line)] bg-gradient-to-b from-[#0c1428] to-[#080e1b] px-3 pb-4 pt-4 transition-transform duration-300",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="mb-3 flex items-center gap-3 border-b border-[var(--color-line)] px-2 pb-4">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-[17px] font-extrabold text-[#06121d]">
              Z
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-wide">ZUMIQ</div>
              <div className="-mt-0.5 text-[11px] text-[var(--color-muted)]">Enterprise Data Intelligence</div>
            </div>
          </div>

          <nav className="flex flex-col gap-px">
            {NAV.map((section) => (
              <div key={section.group}>
                <div className="px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-faint)]">
                  {section.group}
                </div>
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-gradient-to-r from-[rgba(34,211,238,0.16)] to-[rgba(99,102,241,0.07)] font-semibold text-[var(--color-accent)]"
                          : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-accent)]" />}
                      <span aria-hidden className="w-4 flex-none text-center text-[15px]">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--color-line)] px-2.5 pt-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
            <div>
              Source: <span className="text-[var(--color-ink-2)]">{source}</span>
            </div>
            <a
              className="text-[var(--color-accent)] hover:underline"
              href="https://github.com/Virat1315/zumiq"
              target="_blank"
              rel="noopener"
            >
              Source on GitHub
            </a>
            <span className="mx-1.5 text-[var(--color-faint)]">/</span>
            <a className="text-[var(--color-accent)] hover:underline" href="/web/index.html">
              Analytics demo
            </a>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 pb-16 pt-6 md:px-8">{children}</main>
      </div>
    </>
  );
}
