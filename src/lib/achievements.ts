import type { ProgressRow } from "./types";
import { currentStreak, completedDaysCount, categoryStats } from "./stats";
import { TASK_KEYS, TOTAL_TASKS, type SprintPlan, type TaskKey } from "./plan";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

export function evaluateAchievements(plan: SprintPlan, rows: ProgressRow[]): Achievement[] {
  const streak = currentStreak(plan, rows);
  const finished = completedDaysCount(plan, rows);
  const catStats = categoryStats(rows);
  const completedAllKeys: TaskKey[] = TASK_KEYS.filter(
    (k) => (catStats[k] || 0) >= plan.plannedFor(k)
  );
  const allDone = rows.reduce((acc, r) => {
    let n = 0;
    for (const k of TASK_KEYS) if (r[k]) n++;
    return acc + n;
  }, 0);

  return [
    {
      id: "first-task",
      title: "First Step",
      description: "Complete your first task",
      icon: "🎯",
      earned: allDone >= 1,
    },
    {
      id: "perfect-day",
      title: "Perfect Day",
      description: "Complete all tasks in one day",
      icon: "✨",
      earned: rows.some((r) => {
        const keys = plan.taskKeysFor(r.day_number);
        return keys.every((k) => r[k]);
      }),
    },
    {
      id: "streak-3",
      title: "3-Day Streak",
      description: "Complete Day 1, 2 and 3 fully",
      icon: "🔥",
      earned: streak >= 3,
    },
    {
      id: "streak-7",
      title: "Week Warrior",
      description: "Complete a full 7-day streak",
      icon: "💪",
      earned: streak >= 7,
    },
    {
      id: "streak-14",
      title: "Two-Week Titan",
      description: "14-day streak",
      icon: "🏆",
      earned: streak >= 14,
    },
    {
      id: "week-1",
      title: "Foundation Done",
      description: "Complete all 7 days of Week 1",
      icon: "📚",
      earned: finished >= 7,
    },
    {
      id: "week-2",
      title: "Push Through",
      description: "Complete all 14 days",
      icon: "🚀",
      earned: finished >= 14,
    },
    {
      id: "finish",
      title: "Sprint Champion",
      description: "Complete all 21 days",
      icon: "👑",
      earned: finished >= 21,
    },
    {
      id: "all-subjects",
      title: "Renaissance Sprinter",
      description: "Complete every task in every subject",
      icon: "🌟",
      earned: allDone >= TOTAL_TASKS,
    },
    {
      id: "subject-master",
      title: "Subject Master",
      description: "Master at least 3 subjects fully",
      icon: "🎓",
      earned: completedAllKeys.length >= 3,
    },
  ];
}
