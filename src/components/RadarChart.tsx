"use client";

import { TASK_KEYS, TASK_LABELS, type SprintPlan, type TaskKey } from "@/lib/plan";
import { categoryStats } from "@/lib/stats";
import type { ProgressRow } from "@/lib/types";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
  size?: number;
}

const ICONS: Record<TaskKey, string> = {
  aptitude: "📐",
  reasoning: "🧩",
  verbal: "📖",
  cs_fundamentals: "💻",
  java_core: "☕",
  dsa_concept: "🌳",
  leetcode: "⚡",
  gpp_project: "🚀",
};

export default function RadarChart({ plan, rows, size = 320 }: Props) {
  const stats = categoryStats(rows);
  const keys = TASK_KEYS;
  const n = keys.length;
  const center = size / 2;
  const radius = size / 2 - 40;

  // For each axis compute (pct) and produce a point
  const points = keys.map((k, i) => {
    const total = plan.plannedFor(k);
    const pct = total > 0 ? Math.min(1, (stats[k] || 0) / total) : 0;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: center + radius * pct * Math.cos(angle), y: center + radius * pct * Math.sin(angle), labelX: center + (radius + 18) * Math.cos(angle), labelY: center + (radius + 18) * Math.sin(angle), key: k, pct };
  });

  // Build polygon string
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    const ringPoints = keys.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)}`;
    });
    return ringPoints.join(" ");
  });

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
          Subject Mastery Radar
        </span>
      </div>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} aria-label="Subject mastery radar chart">
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
          <polygon
            points={polygon}
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth={2}
          />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3.5} fill="var(--accent)" />
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--text)"
              >
                {ICONS[p.key]} {Math.round(p.pct * 100)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-text-muted sm:grid-cols-4">
        {keys.map((k) => {
          const total = plan.plannedFor(k);
          return (
            <span key={k} className="flex items-center gap-1">
              <span>{ICONS[k]}</span>
              <span className="truncate">{TASK_LABELS[k]}</span>
              <span className="ml-auto font-semibold tabular-nums">{stats[k] || 0}/{total}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
