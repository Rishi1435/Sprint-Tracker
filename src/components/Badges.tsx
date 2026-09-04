"use client";

import { evaluateAchievements } from "@/lib/achievements";
import type { SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
}

export default function Badges({ plan, rows }: Props) {
  const achievements = evaluateAchievements(plan, rows);
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
          Achievements
        </span>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
          {earned} / {achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-5">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all sm:p-3 ${
              a.earned
                ? "border-accent/30 bg-accent-soft"
                : "border-border bg-surface-raised/50 opacity-55"
            }`}
          >
            <span aria-hidden className={`text-xl sm:text-2xl ${a.earned ? "" : "grayscale"}`}>
              {a.icon}
            </span>
            <span className="text-[11.5px] font-semibold leading-tight text-text">{a.title}</span>
            <span className="text-[10.5px] leading-tight text-text-faint">{a.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
