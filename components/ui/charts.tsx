import * as React from "react";
import { formatCompact, formatNumber } from "@/lib/utils";

export interface Datum {
  label: string;
  value: number;
}

const PALETTE = ["#22d3ee", "#6366f1", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf", "#f472b6"];

function colorFor(i: number) {
  return PALETTE[i % PALETTE.length];
}

/* ---------------- Line / Area ---------------- */
interface LineChartProps {
  data: Datum[];
  height?: number;
  color?: string;
  area?: boolean;
  showDots?: boolean;
  yFormat?: (v: number) => string;
  baseline?: number;
}

export function LineChart({ data, height = 220, color = "#22d3ee", area = true, showDots = false, yFormat, baseline }: LineChartProps) {
  const W = 600, H = height, pad = { l: 46, r: 10, t: 12, b: 24 };
  const vals = data.map((d) => d.value);
  const min = Math.min(0, ...vals, baseline ?? Infinity);
  const max = Math.max(...vals, baseline ?? -Infinity);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (W - pad.l - pad.r) * (data.length === 1 ? 0.5 : i / (data.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const v = min + span * t;
        const yy = y(v);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke="hsl(var(--muted))" strokeOpacity={0.5} strokeWidth={1} />
            <text x={pad.l - 6} y={yy + 3} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
              {yFormat ? yFormat(v) : formatCompact(v)}
            </text>
          </g>
        );
      })}
      {baseline !== undefined ? (
        <line x1={pad.l} x2={W - pad.r} y1={y(baseline)} y2={y(baseline)} stroke="hsl(var(--warning))" strokeWidth={1.5} strokeDasharray="4 3" />
      ) : null}
      {area && data.length > 1 ? (
        <path d={`${path} L${x(data.length - 1).toFixed(1)},${(H - pad.b).toFixed(1)} L${x(0).toFixed(1)},${(H - pad.b).toFixed(1)} Z`} fill={color} opacity={0.1} />
      ) : null}
      {data.length > 1 ? <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {showDots
        ? data.map((d, i) => (
            <circle key={i} cx={x(i)} cy={y(d.value)} r={3} fill={color} stroke="hsl(var(--background))" strokeWidth={1.5} />
          ))
        : null}
      {data.length === 1 ? <circle cx={x(0)} cy={y(data[0].value)} r={3.5} fill={color} /> : null}
      {data.length > 0 ? (
        <text x={x(data.length - 1)} y={Math.max(pad.t, y(data[data.length - 1].value) - 8)} textAnchor="end" fill={color} fontSize={12} fontWeight={700}>
          {yFormat ? yFormat(data[data.length - 1].value) : formatCompact(data[data.length - 1].value)}
        </text>
      ) : null}
      <text x={pad.l} y={H - 4} className="fill-muted-foreground" fontSize={9.5}>{data[0]?.label}</text>
      <text x={W - pad.r} y={H - 4} textAnchor="end" className="fill-muted-foreground" fontSize={9.5}>{data[data.length - 1]?.label}</text>
    </svg>
  );
}

/* ---------------- Bar ---------------- */
interface BarChartProps {
  data: Datum[];
  height?: number;
  horizontal?: boolean;
  maxBars?: number;
  yFormat?: (v: number) => string;
  barColor?: (label: string) => string;
}

export function BarChart({ data, height = 220, horizontal = false, maxBars = 12, yFormat, barColor }: BarChartProps) {
  const rows = data.slice(0, maxBars);
  if (horizontal) {
    const max = Math.max(...rows.map((d) => d.value), 1);
    return (
      <div className="flex flex-col gap-1.5" style={{ height }}>
        {rows.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-muted-foreground" title={d.label}>{d.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
              <div className="flex h-full items-center rounded px-1.5" style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, background: (barColor ? barColor(d.label) : colorFor(i)) }}>
                <span className="truncate text-[10px] font-semibold text-black/70">{yFormat ? yFormat(d.value) : formatCompact(d.value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  const W = 600, H = height, pad = { l: 46, r: 10, t: 12, b: 24 };
  const max = Math.max(...rows.map((d) => d.value), 1);
  const bw = (W - pad.l - pad.r) / Math.max(1, rows.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * t} y2={pad.t + (H - pad.t - pad.b) * t} stroke="hsl(var(--muted))" strokeOpacity={0.5} />
          <text x={pad.l - 6} y={pad.t + (H - pad.t - pad.b) * t + 3} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
            {yFormat ? yFormat(max * (1 - t)) : formatCompact(max * (1 - t))}
          </text>
        </g>
      ))}
      {rows.map((d, i) => {
        const h = Math.max(2, (H - pad.t - pad.b) * (d.value / max));
        const x = pad.l + bw * i + bw * 0.12;
        const w = bw * 0.76;
        return (
          <g key={i}>
            <rect x={x} y={H - pad.b - h} width={w} height={h} rx={3} fill={barColor ? barColor(d.label) : colorFor(i)} />
            <text x={x + w / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize={9.5}>
              {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- Donut ---------------- */
interface DonutChartProps {
  data: Datum[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  thickness?: number;
}

export function DonutChart({ data, centerLabel, centerValue, size = 180, thickness = 22 }: DonutChartProps) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  // Arc geometry is accumulated up front rather than by mutating a running
  // angle inside the render callback: mutating during render is what the
  // React Compiler flags, and it breaks if the subtree ever re-renders
  // independently.
  const arcs: { large: number; x1: number; y1: number; x2: number; y2: number }[] = [];
  let angle = -Math.PI / 2;
  for (const d of data) {
    const next = angle + (d.value / total) * Math.PI * 2;
    arcs.push({
      large: next - angle > Math.PI ? 1 : 0,
      x1: c + r * Math.cos(angle), y1: c + r * Math.sin(angle),
      x2: c + r * Math.cos(next), y2: c + r * Math.sin(next),
    });
    angle = next;
  }

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="hsl(var(--muted))" strokeOpacity={0.4} strokeWidth={thickness} />
        {arcs.map((arc, i) => {
          return (
            <path
              key={i}
              d={`M${arc.x1},${arc.y1} A${r},${r} 0 ${arc.large} 1 ${arc.x2},${arc.y2}`}
              fill="none"
              stroke={colorFor(i)}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          );
        })}
        {centerValue ? <text x={c} y={c - 2} textAnchor="middle" className="fill-foreground" fontSize={18} fontWeight={700}>{centerValue}</text> : null}
        {centerLabel ? <text x={c} y={c + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={10.5}>{centerLabel}</text> : null}
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorFor(i) }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="tabular font-semibold">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Sparkline ---------------- */
export function Sparkline({ data, color = "#34d399", width = 120, height = 34 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const min = Math.min(...data, 0), max = Math.max(...data, 1);
  const span = max - min || 1;
  const x = (i: number) => (data.length === 1 ? width / 2 : (i / (data.length - 1)) * width);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2} fill={color} />
    </svg>
  );
}

export { colorFor, formatNumber };
