"use client";

import { PLAN, TASK_KEYS } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay } from "@/lib/stats";

interface Props {
  progressByDay: Map<number, ProgressRow>;
  currentDay: number;
  selectedDay: number;
  onSelect: (day: number) => void;
}

const WEEKS = [1, 2, 3] as const;

export default function DayRail({ progressByDay, currentDay, selectedDay, onSelect }: Props) {
  return (
    <div
      className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-surface p-4 pb-3"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex min-w-max xl:min-w-full items-start justify-between gap-6 lg:gap-8">
        {WEEKS.map((w) => (
          <div key={w} className="flex flex-col gap-2.5 flex-1">
            <div className="flex items-center justify-between pr-2">
              <span className="pl-0.5 text-[11px] font-bold uppercase tracking-widest text-text-faint">
                Week {w}
              </span>
              <span className="text-[10px] text-text-faint font-medium">
                {w === 1 ? "Days 1–7" : w === 2 ? "Days 8–14" : "Days 15–21"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {PLAN.filter((d) => d.week === w).map((d) => {
                const row = progressByDay.get(d.day);
                const checked = countCheckedForDay(row);
                const fraction = checked / TASK_KEYS.length;
                const full = checked === TASK_KEYS.length;
                const isToday = d.day === currentDay;
                const isSelected = d.day === selectedDay;
                const hasProgress = checked > 0;

                return (
                  <button
                    key={d.day}
                    onClick={() => onSelect(d.day)}
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={`Day ${d.day}, ${checked} of ${TASK_KEYS.length} tasks done${
                      isToday ? ", today" : ""
                    }`}
                    className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                      isSelected
                        ? "scale-110 shadow-md"
                        : "hover:scale-105"
                    } ${isToday && !isSelected ? "animate-pulse-glow" : ""}`}
                    style={{
                      background: full
                        ? "var(--done)"
                        : hasProgress
                          ? `conic-gradient(var(--accent) ${fraction * 360}deg, var(--border) 0deg)`
                          : "var(--surface-raised)",
                      border: isSelected
                        ? "2px solid var(--accent)"
                        : full
                          ? "2px solid var(--done)"
                          : "1.5px solid var(--border)",
                      boxShadow: isSelected
                        ? "var(--shadow-glow)"
                        : isToday
                          ? "0 0 0 2px var(--accent-dim)"
                          : "var(--shadow-sm)",
                    }}
                  >
                    <span
                      className="grid place-items-center rounded-lg"
                      style={{
                        width: hasProgress && !full ? '28px' : 'auto',
                        height: hasProgress && !full ? '28px' : 'auto',
                        background: hasProgress && !full ? 'var(--surface)' : 'transparent',
                        color: full
                          ? "#ffffff"
                          : isSelected
                            ? "var(--accent)"
                            : isToday
                              ? "var(--accent)"
                              : hasProgress
                                ? "var(--text)"
                                : "var(--text-faint)",
                      }}
                    >
                      {d.day}
                    </span>
                    {isToday && (
                      <span
                        className="absolute -bottom-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
