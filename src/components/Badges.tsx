"use client";

import { evaluateAchievements } from "@/lib/achievements";
import type { SprintPlan } from "@/lib/plan";
import type { ProgressRow } from "@/lib/types";

interface Props {
  plan: SprintPlan;
  rows: ProgressRow[];
}

/**
 * The emoji stay: a badge is one of the few places where the glyph *is* the
 * content. What changes is everything around them — an earned badge is stated in
 * words and colour, not by being the one that isn't greyed out.
 */
export default function Badges({ plan, rows }: Props) {
  const achievements = evaluateAchievements(plan, rows);
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold leading-tight text-text">Achievements</h2>
        <p className="text-sm text-text-muted">
          <span className="num font-semibold text-text">{earned}</span> of{" "}
          <span className="num">{achievements.length}</span> earned
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-5">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center sm:p-3 ${
              a.earned ? "border-accent/30 bg-accent-soft" : "border-border-soft bg-surface"
            }`}
          >
            <span
              aria-hidden
              className={`text-xl leading-none sm:text-2xl ${a.earned ? "" : "opacity-40 grayscale"}`}
            >
              {a.icon}
            </span>
            <span
              className={`text-sm font-semibold leading-tight ${
                a.earned ? "text-text" : "text-text-muted"
              }`}
            >
              {a.title}
            </span>
            <span className="text-xs leading-tight text-text-faint">{a.description}</span>
            <span className="sr-only">{a.earned ? "Earned" : "Not earned yet"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
