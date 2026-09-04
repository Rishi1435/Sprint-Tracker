"use client";

import { TOTAL_DAYS, type SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay } from "@/lib/stats";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
  size?: { w: number; h: number };
}

export default function TrendLine({ plan, rows, size = { w: 480, h: 200 } }: Props) {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));

  // Cumulative completion per day
  const data: { day: number; cumulative: number }[] = [];
  let cum = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const row = byDay.get(d);
    const dayTotal = plan.taskKeysFor(d).length;
    cum += countCheckedForDay(plan, row, d) / Math.max(1, dayTotal);
    data.push({ day: d, cumulative: cum });
  }

  const maxY = Math.max(TOTAL_DAYS, cum);
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const w = size.w;
  const h = size.h;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const xFor = (day: number) => pad.l + ((day - 1) / (TOTAL_DAYS - 1)) * innerW;
  const yFor = (val: number) => pad.t + innerH - (val / maxY) * innerH;

  const linePath = data
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.day).toFixed(1)},${yFor(p.cumulative).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L${xFor(TOTAL_DAYS).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${xFor(1).toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`;

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
          Daily Completion Trend
        </span>
        <span className="text-[11px] text-text-faint">{cum.toFixed(1)} / {TOTAL_DAYS} days</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Cumulative completion trend">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yFor(maxY * f)}
              y2={yFor(maxY * f)}
              stroke="var(--border)"
              strokeDasharray="2 3"
            />
            <text
              x={pad.l - 6}
              y={yFor(maxY * f) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-faint)"
            >
              {Math.round(maxY * f)}
            </text>
          </g>
        ))}
        {/* X labels (every 7 days) */}
        {[1, 7, 14, 21].map((d) => (
          <text
            key={d}
            x={xFor(d)}
            y={h - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-faint)"
          >
            D{d}
          </text>
        ))}
        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
        {data.map((p) => (
          <circle
            key={p.day}
            cx={xFor(p.day)}
            cy={yFor(p.cumulative)}
            r={2.5}
            fill="var(--accent)"
          />
        ))}
      </svg>
    </div>
  );
}
