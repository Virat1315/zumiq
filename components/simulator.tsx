"use client";

/**
 * Scenario simulator.
 *
 * Sliders move operating drivers away from their measured baseline and the
 * page reports the annualised consequence. The maths is deliberately simple
 * and fully written out below: a simulator nobody can audit is a toy, and the
 * first question any finance partner asks is "where does that number come
 * from". Every constant used here is also listed in the assumptions panel.
 */

import { useMemo, useState } from "react";
import type { ImpactModel } from "@/lib/data/types";
import { Card, CardHead } from "@/components/ui";
import { moneyCompact, num, pct } from "@/lib/format";

/* Constants behind the model. Mirrored in ImpactModel.assumptions so the UI
   and the maths cannot drift apart silently. */
const ANNUAL_GMV = 45_900_000;
const ORDERS_PER_YEAR = 417_000;
const OPS_COST_PER_ORDER_MINUTE = 1.15;
const SUPPORT_CONTACT_COST = 7.4;
const RETENTION_ELASTICITY = 0.009; // revenue share gained per CSAT point
const MARGINAL_COST_RATIO = 0.62;

type Values = Record<string, number>;

export function Simulator({ model }: { model: ImpactModel }) {
  const baseline: Values = useMemo(
    () => Object.fromEntries(model.levers.map((l) => [l.id, l.baseline])),
    [model.levers],
  );
  const [values, setValues] = useState<Values>(baseline);

  const dirty = model.levers.some((l) => values[l.id] !== l.baseline);

  const impact = useMemo(() => {
    const d = (id: string) => values[id] - baseline[id];

    // Payment approval. Attempted volume is implied by current GMV at the
    // current approval rate; recovered points convert at that same volume.
    const attemptedVolume = ANNUAL_GMV / (baseline.approvalRate / 100);
    const approvalRevenue = attemptedVolume * (d("approvalRate") / 100);

    // Retention. Directional only: an elasticity from historical regression,
    // not a causal claim.
    const csatRevenue = ANNUAL_GMV * RETENTION_ELASTICITY * d("csat");

    // Volume. Extra GMV is not extra profit, so only the contribution margin
    // on incremental volume counts.
    const incrementalGmv = ANNUAL_GMV * d("txnVolume");
    const volumeRevenue = incrementalGmv * (1 - MARGINAL_COST_RATIO);

    // Costs. Negative deltas are savings, which is why these are subtracted.
    const processingCost = ORDERS_PER_YEAR * d("processingTime") * OPS_COST_PER_ORDER_MINUTE;
    const supportCost = ORDERS_PER_YEAR * (d("repeatCalls") / 100) * SUPPORT_CONTACT_COST;

    const revenue = approvalRevenue + csatRevenue + volumeRevenue;
    const cost = processingCost + supportCost;

    return {
      approvalRevenue, csatRevenue, volumeRevenue, processingCost, supportCost,
      revenue,
      cost,
      net: revenue - cost,
      orderMinutes: ORDERS_PER_YEAR * d("processingTime"),
      contacts: ORDERS_PER_YEAR * (d("repeatCalls") / 100),
    };
  }, [values, baseline]);

  const set = (id: string, v: number) => setValues((prev) => ({ ...prev, [id]: v }));

  const fmtLever = (unit: string, v: number) => {
    if (unit === "%") return pct(v);
    if (unit === "min") return `${v} min`;
    if (unit === "x") return `${v.toFixed(2)}x`;
    return String(v);
  };

  /** Costs invert: a negative cost delta is a good outcome. */
  const tone = (v: number, goodWhenNegative = false) => {
    if (Math.abs(v) < 1) return "text-[var(--color-muted)]";
    const good = goodWhenNegative ? v < 0 : v > 0;
    return good ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]";
  };

  const signed = (v: number) => (v >= 0 ? "+" : "-") + moneyCompact(Math.abs(v)).replace("$", "$");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <CardHead
          title="Operating drivers"
          sub="Each slider starts at the value measured in the warehouse. Move one and the impact updates immediately."
          right={
            dirty ? (
              <button
                type="button"
                onClick={() => setValues(baseline)}
                className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Reset
              </button>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-6">
          {model.levers.map((l) => {
            const delta = values[l.id] - l.baseline;
            return (
              <div key={l.id}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <label htmlFor={l.id} className="text-[13px] font-semibold">{l.label}</label>
                  <div className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="font-bold text-[var(--color-accent)]">{fmtLever(l.unit, values[l.id])}</span>
                    {delta !== 0 && (
                      <span className="text-[11px] text-[var(--color-faint)]">
                        baseline {fmtLever(l.unit, l.baseline)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]">{l.help}</p>
                <input
                  id={l.id}
                  type="range"
                  min={l.min}
                  max={l.max}
                  step={l.step}
                  value={values[l.id]}
                  onChange={(e) => set(l.id, Number(e.target.value))}
                />
                <div className="mt-1 flex justify-between text-[10.5px] text-[var(--color-faint)]">
                  <span>{fmtLever(l.unit, l.min)}</span>
                  <span>{fmtLever(l.unit, l.max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHead title="Annualised impact" sub="Against the current operating baseline." />

          <div className="mb-4 rounded-xl border border-[var(--color-line)] bg-[#0d1526] p-4 text-center">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Net contribution
            </div>
            <div className={`mt-1 text-3xl font-bold tracking-tight ${tone(impact.net)}`}>
              {dirty ? signed(impact.net) : "$0"}
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-faint)]">revenue gained less cost added</div>
          </div>

          <div className="flex flex-col gap-2.5 text-[12.5px]">
            <Row label="Revenue impact" value={dirty ? signed(impact.revenue) : "$0"} cls={tone(impact.revenue)} />
            <Sub label="from payment approval" value={signed(impact.approvalRevenue)} show={Math.abs(impact.approvalRevenue) > 1} />
            <Sub label="from retention (CSAT)" value={signed(impact.csatRevenue)} show={Math.abs(impact.csatRevenue) > 1} />
            <Sub label="from volume, at contribution margin" value={signed(impact.volumeRevenue)} show={Math.abs(impact.volumeRevenue) > 1} />

            <div className="my-1 h-px bg-[var(--color-line-soft)]" />

            <Row label="Cost impact" value={dirty ? signed(impact.cost) : "$0"} cls={tone(impact.cost, true)} />
            <Sub label="fulfilment time" value={signed(impact.processingCost)} show={Math.abs(impact.processingCost) > 1} />
            <Sub label="repeat support contacts" value={signed(impact.supportCost)} show={Math.abs(impact.supportCost) > 1} />
          </div>
        </Card>

        <Card>
          <CardHead title="Operational and customer effect" />
          <div className="flex flex-col gap-2.5 text-[12.5px]">
            <Row
              label="Order-minutes per year"
              value={dirty ? `${impact.orderMinutes >= 0 ? "+" : "-"}${num(Math.round(Math.abs(impact.orderMinutes)))}` : "0"}
              cls={tone(impact.orderMinutes, true)}
            />
            <Row
              label="Support contacts per year"
              value={dirty ? `${impact.contacts >= 0 ? "+" : "-"}${num(Math.round(Math.abs(impact.contacts)))}` : "0"}
              cls={tone(impact.contacts, true)}
            />
            <Row
              label="CSAT"
              value={`${values.csat.toFixed(0)} / 100`}
              cls={values.csat >= baseline.csat ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="Assumptions" sub="Every constant the maths above depends on." />
          <div className="flex flex-col gap-3">
            {model.assumptions.map((a) => (
              <div key={a.label}>
                <div className="flex justify-between gap-3 text-[12.5px]">
                  <span className="text-[var(--color-muted)]">{a.label}</span>
                  <span className="text-right font-semibold">{a.value}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-faint)]">{a.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={`font-bold ${cls}`}>{value}</span>
    </div>
  );
}

function Sub({ label, value, show }: { label: string; value: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 pl-3 text-[11.5px]">
      <span className="text-[var(--color-faint)]">{label}</span>
      <span className="text-[var(--color-ink-2)]">{value}</span>
    </div>
  );
}
