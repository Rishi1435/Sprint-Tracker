"use client";

import { TOTAL_DAYS, type SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay } from "@/lib/stats";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
  /**
   * The day the sprint is on. The line stops here — carrying it flat to day 21
   * would draw days that haven't happened as days that were missed.
   */
  currentDay?: number;
  size?: { w: number; h: number };
}

export default function TrendLine({
  plan,
  rows,
  currentDay = TOTAL_DAYS,
  size = { w: 480, h: 200 },
}: Props) {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));

  // One unit per whole day cleared, so the y-axis reads in days rather than in
  // tasks — and the ideal line becomes a plain diagonal.
  const data: { day: number; cumulative: number }[] = [];
  let cum = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const dayTotal = plan.taskKeysFor(d).length;
    cum += countCheckedForDay(plan, byDay.get(d), d) / Math.max(1, dayTotal);
    data.push({ day: d, cumulative: cum });
  }

  const today = Math.min(Math.max(Math.round(currentDay), 1), TOTAL_DAYS);
  const plotted = data.slice(0, today);
  const done = data[today - 1]?.cumulative ?? 0;

  const maxY = TOTAL_DAYS;
  const pad = { l: 30, r: 14, t: 12, b: 26 };
  const { w, h } = size;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const baseline = pad.t + innerH;

  const xFor = (day: number) => pad.l + ((day - 1) / (TOTAL_DAYS - 1)) * innerW;
  const yFor = (val: number) => pad.t + innerH - (val / maxY) * innerH;

  const linePath = plotted
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.day).toFixed(1)},${yFor(p.cumulative).toFixed(1)}`)
    .join(" ");

  const areaPath = plotted.length
    ? `${linePath} L${xFor(today).toFixed(1)},${baseline.toFixed(1)} L${xFor(1).toFixed(1)},${baseline.toFixed(1)} Z`
    : "";

  // y = x: by the end of day n, n days' worth should be done.
  const pacePath = `M${xFor(1).toFixed(1)},${yFor(1).toFixed(1)} L${xFor(TOTAL_DAYS).toFixed(1)},${yFor(TOTAL_DAYS).toFixed(1)}`;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold leading-tight text-text">Pace</h2>
        <p className="text-sm text-text-muted">
          <span className="num font-semibold text-text">{done.toFixed(1)}</span> of{" "}
          <span className="num">{today}</span> days&rsquo; work done
        </p>
      </div>

      <div className="mb-2 flex items-center gap-4 text-xs text-text-faint">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-4 rounded-full bg-accent" />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-[3px] w-4 rounded-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--text-faint) 0 4px, transparent 4px 7px)",
            }}
          />
          On schedule
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        role="img"
        aria-label={`By day ${today}, ${done.toFixed(1)} of ${today} days' work is done.`}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yFor(maxY * f)}
              y2={yFor(maxY * f)}
              stroke="var(--border)"
              strokeDasharray={f === 0 ? undefined : "2 3"}
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

        {[1, 7, 14, 21].map((d) => (
          <text
            key={d}
            x={xFor(d)}
            y={h - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-faint)"
          >
            {d === 1 ? "Day 1" : d}
          </text>
        ))}

        <path d={pacePath} fill="none" stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 3" />

        {areaPath && <path d={areaPath} fill="url(#trendFill)" />}
        {plotted.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {plotted.map((p) => (
          <circle key={p.day} cx={xFor(p.day)} cy={yFor(p.cumulative)} r={2.5} fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}
