"use client";

import { TASK_KEYS, TASK_LABELS, type SprintPlan, type TaskKey } from "@/lib/plan";
import { categoryStats } from "@/lib/stats";
import type { ProgressRow } from "@/lib/types";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
  size?: number;
}

/**
 * Axis tips get an abbreviation, not the full subject name: eight full labels
 * around a 320px circle overlap. The list underneath names each one in full.
 */
const AXIS_SHORT: Record<TaskKey, string> = {
  aptitude: "Apt",
  reasoning: "Reas",
  verbal: "Verbal",
  cs_fundamentals: "CS",
  java_core: "Java",
  dsa_concept: "DSA",
  leetcode: "LeetCode",
  gpp_project: "GPP",
};

export default function RadarChart({ plan, rows, size = 320 }: Props) {
  const stats = categoryStats(rows);
  const keys = TASK_KEYS;
  const n = keys.length;
  const center = size / 2;
  const radius = size / 2 - 36;

  const points = keys.map((key, i) => {
    const total = plan.plannedFor(key);
    const done = stats[key] || 0;
    const pct = total > 0 ? Math.min(1, done / total) : 0;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cos = Math.cos(angle);
    return {
      key,
      done,
      total,
      pct,
      x: center + radius * pct * cos,
      y: center + radius * pct * Math.sin(angle),
      labelX: center + (radius + 15) * cos,
      labelY: center + (radius + 15) * Math.sin(angle),
      // Labels on the right hang off their left edge and vice versa, so nothing
      // runs past the viewBox.
      anchor: (cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle") as
        | "start"
        | "end"
        | "middle",
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1].map((scale) =>
    keys
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)}`;
      })
      .join(" ")
  );

  const summary = points
    .map((p) => `${TASK_LABELS[p.key]} ${Math.round(p.pct * 100)}%`)
    .join(", ");

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold leading-tight text-text">
          Balance by subject
        </h2>
        <p className="text-sm text-text-muted">Further out is further along.</p>
      </div>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          style={{ maxWidth: size }}
          role="img"
          aria-label={`Share of each subject finished: ${summary}`}
        >
          {rings.map((r, i) => (
            <polygon
              key={i}
              points={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth={i === rings.length - 1 ? 1.5 : 1}
              strokeDasharray={i === rings.length - 1 ? undefined : "2 3"}
            />
          ))}

          {keys.map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="var(--border)"
                strokeWidth={1}
              />
            );
          })}

          <polygon points={polygon} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={2} />

          {points.map((p) => (
            <circle key={p.key} cx={p.x} cy={p.y} r={3.5} fill="var(--accent)" />
          ))}

          {points.map((p) => (
            <text
              key={p.key}
              x={p.labelX}
              y={p.labelY}
              textAnchor={p.anchor}
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--text-muted)"
            >
              {AXIS_SHORT[p.key]}
            </text>
          ))}
        </svg>
      </div>

      {/* The shape answers "am I balanced?"; these answer "by how much?" */}
      <ul className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
        {points.map((p) => (
          <li key={p.key} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-text">{TASK_LABELS[p.key]}</span>
              <span className="num shrink-0 font-semibold text-text-muted">
                {p.done}/{p.total}
              </span>
            </span>
            <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-surface-raised">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.round(p.pct * 100)}%`,
                  background: p.pct === 1 ? "var(--done)" : "var(--accent)",
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
