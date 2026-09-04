import type { ProgressRow, UserRow } from "./types";
import {
  TASK_KEYS,
  TASK_LABELS,
  TOTAL_DAYS,
  TOTAL_TASKS,
  buildSprintPlan,
  type TaskKey,
} from "./plan";
import {
  categoryStats,
  completedDaysCount,
  countCheckedForDay,
  currentStreak,
  isDayComplete,
  overallPercent,
  rowForDay,
  totalCheckedForUser,
} from "./stats";
import { dayNumberFor, formatDateShort } from "./date";

export interface SubjectSummary {
  key: TaskKey;
  label: string;
  done: number;
  planned: number;
  percent: number;
}

export interface DaySummary {
  day: number;
  week: 1 | 2 | 3;
  weekday: string;
  isSunday: boolean;
  done: number;
  planned: number;
  complete: boolean;
  notes: string;
}

export interface WeekSummary {
  week: 1 | 2 | 3;
  done: number;
  planned: number;
  percent: number;
  daysComplete: number;
  daysInWeek: number;
}

export interface SprintSummary {
  name: string;
  /** Preferred display handle — nickname if set, otherwise the name. */
  handle: string;
  startLabel: string;
  endLabel: string;
  generatedLabel: string;
  currentDay: number;
  totalDays: number;
  tasksDone: number;
  tasksTotal: number;
  percent: number;
  daysComplete: number;
  streak: number;
  bestSubject: SubjectSummary | null;
  weakestSubject: SubjectSummary | null;
  avgPerActiveDay: number;
  subjects: SubjectSummary[];
  weeks: WeekSummary[];
  days: DaySummary[];
  /** True once every planned task is ticked — unlocks the "sprint complete" wording. */
  finished: boolean;
}

function addDaysISO(startISO: string, days: number): string {
  const [y, m, d] = startISO.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Everything the PNG card and the PDF report need, derived once so the two
 * renderers can never disagree about a number.
 */
export function buildSprintSummary(user: UserRow, rows: ProgressRow[]): SprintSummary {
  // Resolved against this user's own calendar, so the weekday column and the
  // 8-task Sundays in the report match the days they actually studied.
  const plan = buildSprintPlan(user.start_date);
  const cats = categoryStats(rows);
  const subjects: SubjectSummary[] = TASK_KEYS.map((key) => {
    const planned = plan.plannedFor(key);
    const done = Math.min(cats[key] ?? 0, planned);
    return {
      key,
      label: TASK_LABELS[key],
      done,
      planned,
      percent: planned > 0 ? Math.round((done / planned) * 100) : 0,
    };
  });

  const days: DaySummary[] = plan.days.map((dayPlan) => {
    const row = rowForDay(rows, dayPlan.day);
    return {
      day: dayPlan.day,
      week: dayPlan.week,
      weekday: dayPlan.weekday,
      isSunday: dayPlan.isSunday,
      done: countCheckedForDay(plan, row, dayPlan.day),
      planned: dayPlan.taskKeys.length,
      complete: isDayComplete(plan, row, dayPlan.day),
      notes: (row?.notes ?? "").trim(),
    };
  });

  const weeks: WeekSummary[] = ([1, 2, 3] as const).map((week) => {
    const inWeek = days.filter((d) => d.week === week);
    const done = inWeek.reduce((acc, d) => acc + d.done, 0);
    const planned = inWeek.reduce((acc, d) => acc + d.planned, 0);
    return {
      week,
      done,
      planned,
      percent: planned > 0 ? Math.round((done / planned) * 100) : 0,
      daysComplete: inWeek.filter((d) => d.complete).length,
      daysInWeek: inWeek.length,
    };
  });

  const attempted = days.filter((d) => d.done > 0).length;
  const tasksDone = totalCheckedForUser(plan, rows);
  // Ties break toward the first subject in plan order, which keeps the card stable
  // between renders instead of flipping between equal-scoring subjects.
  const ranked = subjects.filter((s) => s.planned > 0);
  const bestSubject =
    ranked.length > 0 ? ranked.reduce((a, b) => (b.percent > a.percent ? b : a)) : null;
  const weakestSubject =
    ranked.length > 0 ? ranked.reduce((a, b) => (b.percent < a.percent ? b : a)) : null;

  const startISO = user.start_date ?? null;
  const generated = new Date();

  return {
    name: user.name,
    handle: user.nickname?.trim() || user.name,
    startLabel: formatDateShort(startISO),
    endLabel: startISO ? formatDateShort(addDaysISO(startISO, TOTAL_DAYS - 1)) : "—",
    generatedLabel: generated.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    currentDay: dayNumberFor(startISO, TOTAL_DAYS),
    totalDays: TOTAL_DAYS,
    tasksDone,
    tasksTotal: TOTAL_TASKS,
    percent: overallPercent(plan, rows),
    daysComplete: completedDaysCount(plan, rows),
    streak: currentStreak(plan, rows),
    bestSubject,
    weakestSubject,
    avgPerActiveDay: attempted > 0 ? Math.round((tasksDone / attempted) * 10) / 10 : 0,
    subjects,
    weeks,
    days,
    finished: tasksDone >= TOTAL_TASKS,
  };
}
