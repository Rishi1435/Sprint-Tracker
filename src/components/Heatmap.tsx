"use client";

import type { SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay } from "@/lib/stats";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
}

export default function Heatmap({ plan, rows }: Props) {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
          Completion Heatmap
        </span>
        <span className="text-[11px] text-text-faint">Darker = more done</span>
      </div>
      {/* Scrolls rather than clips on very narrow phones. */}
      <div className="scrollbar-thin -mx-1 flex flex-col gap-2 overflow-x-auto px-1">
        {[1, 2, 3].map((week) => {
          const days = plan.days.filter((d) => d.week === week);
          return (
            <div key={week} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-text-faint sm:w-12">
                Wk {week}
              </span>
              <div className="flex gap-1 sm:gap-1.5">
                {days.map((d) => {
                  const row = byDay.get(d.day);
                  const checked = countCheckedForDay(plan, row, d.day);
                  const total = d.taskKeys.length;
                  const pct = total > 0 ? checked / total : 0;
                  const bg =
                    pct === 0
                      ? "var(--surface-raised)"
                      : pct < 0.5
                      ? "var(--accent-soft)"
                      : pct < 1
                      ? "var(--accent-dim)"
                      : "var(--done)";
                  return (
                    <div
                      key={d.day}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10.5px] font-bold sm:h-9 sm:w-9"
                      style={{
                        background: bg,
                        color: pct === 0 ? "var(--text-faint)" : pct === 1 ? "#fff" : "var(--text)",
                        border: pct === 0 ? "1px solid var(--border)" : "none",
                      }}
                      title={`Day ${d.day} · ${d.weekday}: ${checked}/${total} done`}
                    >
                      {d.day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10.5px] text-text-faint">
        <span>Less</span>
        <div className="h-3 w-3 rounded" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
        <div className="h-3 w-3 rounded" style={{ background: "var(--accent-soft)" }} />
        <div className="h-3 w-3 rounded" style={{ background: "var(--accent-dim)" }} />
        <div className="h-3 w-3 rounded" style={{ background: "var(--done)" }} />
        <span>More</span>
      </div>
    </div>
  );
}
