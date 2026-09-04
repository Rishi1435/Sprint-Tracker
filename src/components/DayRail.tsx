"use client";

import { useEffect, useRef } from "react";
import type { SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";
import { countCheckedForDay, isDayComplete } from "@/lib/stats";

interface Props {
  /** The rail owner's plan — which days are 8-task Sundays is per-user. */
  plan: SprintPlan;
  progressByDay: Map<number, ProgressRow>;
  currentDay: number;
  selectedDay: number;
  onSelect: (day: number) => void;
}

const WEEKS = [1, 2, 3] as const;

export default function DayRail({ plan, progressByDay, currentDay, selectedDay, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<number, HTMLButtonElement>());

  /**
   * Keeps the selected day centred in the rail. On phones the three weeks are
   * wider than the screen, so without this the day you just tapped — or day 1 of
   * week 3 on first load — can sit off-screen. Pure DOM side effect: nothing here
   * touches React state.
   */
  useEffect(() => {
    const container = scrollerRef.current;
    const el = dayRefs.current.get(selectedDay);
    if (!container || !el) return;
    if (container.scrollWidth <= container.clientWidth) return;

    const elRect = el.getBoundingClientRect();
    const boxRect = container.getBoundingClientRect();
    const delta = elRect.left + elRect.width / 2 - (boxRect.left + boxRect.width / 2);
    if (Math.abs(delta) < 4) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollBy({ left: delta, behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedDay]);

  return (
    <div
      ref={scrollerRef}
      className="scrollbar-thin snap-rail overflow-x-auto rounded-xl border border-border bg-surface p-3 pb-2.5 sm:p-4 sm:pb-3"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex min-w-max items-start justify-between gap-6 lg:gap-8 xl:min-w-full">
        {WEEKS.map((w) => (
          <div key={w} className="flex flex-1 snap-center flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 pr-2">
              <span className="pl-0.5 text-[11px] font-bold uppercase tracking-widest text-text-faint">
                Week {w}
              </span>
              <span className="whitespace-nowrap text-[10px] font-medium text-text-faint">
                {w === 1 ? "Days 1–7" : w === 2 ? "Days 8–14" : "Days 15–21"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {plan.days.filter((d) => d.week === w).map((d) => {
                const row = progressByDay.get(d.day);
                const totalTasks = d.taskKeys.length;
                const checked = countCheckedForDay(plan, row, d.day);
                const fraction = checked / totalTasks;
                const full = isDayComplete(plan, row, d.day);
                const isToday = d.day === currentDay;
                const isSelected = d.day === selectedDay;
                const isFuture = d.day > currentDay;
                const hasProgress = checked > 0;

                return (
                  <button
                    key={d.day}
                    ref={(node) => {
                      if (node) dayRefs.current.set(d.day, node);
                      else dayRefs.current.delete(d.day);
                    }}
                    onClick={() => onSelect(d.day)}
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={`Day ${d.day}, ${d.weekday}, ${checked} of ${totalTasks} tasks done${
                      isToday ? ", current day" : isFuture ? ", future day (read-only)" : ""
                    }`}
                    title={
                      isToday
                        ? `Day ${d.day} · ${d.weekday} (Today) — ${checked}/${totalTasks} done`
                        : isFuture
                        ? `Day ${d.day} · ${d.weekday} (Future Day — Read Only Preview)`
                        : `Day ${d.day} · ${d.weekday} — ${checked}/${totalTasks} done`
                    }
                    className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[12.5px] font-semibold transition-all duration-200 md:h-10 md:w-10 md:text-[12px] ${
                      isSelected ? "scale-110 shadow-md ring-2 ring-accent" : "hover:scale-105"
                    } ${isToday && !isSelected ? "animate-pulse-glow" : ""} ${
                      isFuture && !isSelected ? "opacity-75" : ""
                    }`}
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
                        width: hasProgress && !full ? "28px" : "auto",
                        height: hasProgress && !full ? "28px" : "auto",
                        background: hasProgress && !full ? "var(--surface)" : "transparent",
                        color: full
                          ? "#ffffff"
                          : isSelected
                          ? "var(--accent)"
                          : isToday
                          ? "var(--accent)"
                          : hasProgress
                          ? "var(--text)"
                          : isFuture
                          ? "var(--text-faint)"
                          : "var(--text-muted)",
                      }}
                    >
                      {d.day}
                    </span>
                    {/* Marks the 8-task Sundays, wherever they fall in the sprint. */}
                    {d.isSunday && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-0.5 -top-1 text-[9px] leading-none"
                      >
                        ☀️
                      </span>
                    )}
                    {isToday && (
                      <span
                        className="absolute -bottom-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--accent)" }}
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
