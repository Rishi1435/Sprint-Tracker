"use client";

import type { SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay } from "@/lib/stats";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
}

/** Four steps, so a glance tells you nothing / started / most / all. */
function fill(pct: number): { background: string; color: string; border: string } {
  if (pct === 0) {
    return {
      background: "var(--surface-raised)",
      color: "var(--text-faint)",
      border: "1px solid var(--border)",
    };
  }
  if (pct === 1) {
    return { background: "var(--done)", color: "var(--on-fill)", border: "none" };
  }
  return {
    background: pct < 0.5 ? "var(--accent-soft)" : "var(--accent-dim)",
    color: "var(--text)",
    border: "none",
  };
}

export default function Heatmap({ plan, rows }: Props) {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold leading-tight text-text">Day by day</h2>
        <p className="text-sm text-text-muted">Fuller squares are fuller days.</p>
      </div>

      {/* Scrolls rather than clips on very narrow phones. */}
      <div className="scrollbar-thin -mx-1 flex flex-col gap-2 overflow-x-auto px-1">
        {[1, 2, 3].map((week) => {
          const days = plan.days.filter((d) => d.week === week);
          return (
            <div key={week} className="flex items-center gap-2.5">
              <span className="w-11 shrink-0 text-xs font-semibold text-text-faint sm:w-14">
                Week {week}
              </span>
              <div className="flex gap-1 sm:gap-1.5">
                {days.map((d) => {
                  const row = byDay.get(d.day);
                  const checked = countCheckedForDay(plan, row, d.day);
                  const total = d.taskKeys.length;
                  const pct = total > 0 ? checked / total : 0;
                  return (
                    /* `role="img"` so the label is read instead of a bare numeral,
                       which on its own tells a screen reader nothing. */
                    <div
                      key={d.day}
                      role="img"
                      aria-label={`Day ${d.day}, ${d.weekday}: ${checked} of ${total} done`}
                      title={`Day ${d.day}, ${d.weekday}: ${checked} of ${total} done`}
                      className="num grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-semibold sm:h-9 sm:w-9"
                      style={fill(pct)}
                    >
                      <span aria-hidden>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div aria-hidden className="mt-3.5 flex items-center gap-1.5 text-xs text-text-faint">
        <span className="mr-0.5">None</span>
        {[
          { background: "var(--surface-raised)", border: "1px solid var(--border)" },
          { background: "var(--accent-soft)", border: "1px solid transparent" },
          { background: "var(--accent-dim)", border: "1px solid transparent" },
          { background: "var(--done)", border: "1px solid transparent" },
        ].map((s, i) => (
          <span key={i} className="h-3 w-3 rounded-sm" style={s} />
        ))}
        <span className="ml-0.5">Every task</span>
      </div>
    </div>
  );
}
