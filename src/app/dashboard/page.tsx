"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getProgressForUser, setTask, listUsers, getAllProgress, subscribeToAllProgress, subscribeToUsers } from "@/lib/db";
import type { ProgressRow, UserRow } from "@/lib/types";
import {
  TASK_LABELS,
  TOTAL_DAYS,
  TOTAL_TASKS,
  buildSprintPlan,
  type TaskKey,
} from "@/lib/plan";
import { dayNumberFor, formatDateShort } from "@/lib/date";
import {
  countCheckedForDay,
  currentStreak,
  totalCheckedForUser,
  categoryStats,
  completedDaysCount,
  rowForDay,
} from "@/lib/stats";
import DayRail from "@/components/DayRail";
import ChecklistItem from "@/components/ChecklistItem";
import ProgressBar from "@/components/ProgressBar";
import ScheduleRulesModal from "@/components/ScheduleRulesModal";
import DayNotes from "@/components/DayNotes";
import NotificationBanner from "@/components/NotificationBanner";
import Icon from "@/components/Icon";

/**
 * Subject glyphs are content, not controls — they name the eight things this
 * sprint studies, and they're the one place emoji earn their keep. Everything
 * that is a control or a status is drawn from the stroke set instead.
 */
const CATEGORY_ICONS: Record<TaskKey, string> = {
  aptitude: "📐",
  reasoning: "🧩",
  verbal: "📖",
  cs_fundamentals: "💻",
  java_core: "☕",
  dsa_concept: "🌳",
  leetcode: "⚡",
  gpp_project: "🚀",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading, updateUserSession } = useCurrentUser();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [squadUsers, setSquadUsers] = useState<UserRow[]>([]);
  const [allSquadProgress, setAllSquadProgress] = useState<ProgressRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/");
  }, [userLoading, user, router]);

  // Which sprint days land on a Sunday — and so get the daytime timetable plus
  // the 8th GPP task — depends on the weekday this user started on.
  const plan = useMemo(() => buildSprintPlan(user?.start_date), [user?.start_date]);

  const hasStarted = Boolean(user?.start_date) || rows.some((r) => countCheckedForDay(plan, r, r.day_number) > 0);
  const currentDay = useMemo(() => (hasStarted && user?.start_date ? dayNumberFor(user.start_date, TOTAL_DAYS) : 1), [hasStarted, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      getProgressForUser(user.id),
      listUsers().catch(() => []),
      getAllProgress().catch(() => []),
    ])
      .then(([r, u, ap]) => {
        if (cancelled) return;
        setRows(r);
        setSquadUsers(u);
        setAllSquadProgress(ap);
        setSelectedDay((prev) => prev ?? currentDay);
      })
      .catch(() => setErrorMsg("Couldn't load your progress. Refresh to try again."))
      .finally(() => !cancelled && setDataLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live updates: subscribe to changes on the progress and users tables
  useEffect(() => {
    if (!user) return;
    const unsubProgress = subscribeToAllProgress((evt) => {
      if (evt.type === "DELETE") {
        const day = evt.old?.day_number;
        if (day == null) return;
        setRows((prev) => prev.filter((r) => r.day_number !== day));
        setAllSquadProgress((prev) => prev.filter((r) => r.id !== evt.old?.id));
        return;
      }
      const row = evt.row;
      if (!row) return;
      if (row.user_id === user.id) {
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.day_number === row.day_number);
          if (idx === -1) return [...prev, row];
          const copy = prev.slice();
          copy[idx] = row;
          return copy;
        });
      }
      setAllSquadProgress((prev) => {
        const idx = prev.findIndex((r) => r.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = prev.slice();
        copy[idx] = row;
        return copy;
      });
    });
    const unsubUsers = subscribeToUsers(() => {
      // Refresh user list (e.g., when a new person joins)
      listUsers().then((u) => setSquadUsers(u)).catch(() => {});
    });
    return () => {
      unsubProgress();
      unsubUsers();
    };
  }, [user]);

  const progressByDay = useMemo(() => new Map(rows.map((r) => [r.day_number, r])), [rows]);
  const day = selectedDay ?? currentDay;
  const isFutureDay = day > currentDay;
  const dayPlan = plan.getDay(day);
  const todayPlan = plan.getDay(currentDay);
  const selectedRow = progressByDay.get(day);
  const totalTasksForDay = dayPlan ? dayPlan.taskKeys.length : 7;
  const checkedToday = countCheckedForDay(plan, selectedRow, day);
  const streak = useMemo(() => currentStreak(plan, rows), [plan, rows]);
  const totalChecked = useMemo(() => totalCheckedForUser(plan, rows), [plan, rows]);
  const finishedDays = useMemo(() => completedDaysCount(plan, rows), [plan, rows]);
  const catStats = useMemo(() => categoryStats(rows), [rows]);
  const overallPct = TOTAL_TASKS > 0 ? Math.round((totalChecked / TOTAL_TASKS) * 100) : 0;

  // Top squad leaderboard preview
  const topSquad = useMemo(() => {
    return squadUsers
      .map((u) => {
        const uRows = allSquadProgress.filter((p) => p.user_id === u.id);
        // Each member's own calendar, so their 8-task Sundays are counted right.
        const uPlan = buildSprintPlan(u.start_date);
        const uHasStarted = Boolean(u.start_date) || uRows.some((r) => countCheckedForDay(uPlan, r, r.day_number) > 0);
        const uDay = uHasStarted && u.start_date ? dayNumberFor(u.start_date, TOTAL_DAYS) : 1;
        const todayR = rowForDay(uRows, uDay);
        const uTotalChecked = totalCheckedForUser(uPlan, uRows);
        return {
          user: u,
          currentDay: uDay,
          todayChecked: countCheckedForDay(uPlan, todayR, uDay),
          overallPct: Math.round((uTotalChecked / TOTAL_TASKS) * 100),
          streak: currentStreak(uPlan, uRows),
        };
      })
      .sort((a, b) => b.overallPct - a.overallPct || b.streak - a.streak)
      .slice(0, 4);
  }, [squadUsers, allSquadProgress]);

  async function toggle(taskKey: TaskKey) {
    if (!user || isFutureDay) return;
    const wasChecked = Boolean(selectedRow?.[taskKey]);
    const next = !wasChecked;

    // optimistic update
    setPendingKey(taskKey);
    setRows((prev) => {
      const existing = prev.find((r) => r.day_number === day);
      if (existing) {
        return prev.map((r) => (r.day_number === day ? { ...r, [taskKey]: next } : r));
      }
      const blank: ProgressRow = {
        id: `local-${day}`,
        user_id: user.id,
        day_number: day,
        aptitude: false,
        reasoning: false,
        verbal: false,
        cs_fundamentals: false,
        java_core: false,
        dsa_concept: false,
        leetcode: false,
        gpp_project: false,
        updated_at: new Date().toISOString(),
        [taskKey]: next,
      };
      return [...prev, blank];
    });

    try {
      const res = await setTask(user.id, day, taskKey, next);
      if (res?.startDateUpdated) {
        updateUserSession({ start_date: res.startDateUpdated });
      }
    } catch {
      setErrorMsg("Couldn't save that — check your connection and try again.");
      // revert
      setRows((prev) =>
        prev.map((r) => (r.day_number === day ? { ...r, [taskKey]: wasChecked } : r))
      );
    } finally {
      setPendingKey(null);
    }
  }

  if (userLoading || !user || !dayPlan) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-7 w-7 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span className="text-md text-text-muted">Loading your sprint…</span>
        </div>
      </div>
    );
  }

  const displayName = user.nickname || user.name;

  return (
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      {/* ── At a glance. Each tile's icon names the metric; the number and the
             line under it carry the state, so nothing swaps glyphs mid-sprint. ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Current day",
            icon: "calendar" as const,
            value: `Day ${currentDay}`,
            unit: `of ${TOTAL_DAYS}`,
            sub: hasStarted
              ? `${todayPlan?.weekday ?? ""}, week ${todayPlan?.week ?? 1}`
              : "Tick anything to begin",
          },
          {
            label: `Day ${day} tasks`,
            icon: "list" as const,
            value: `${checkedToday}`,
            unit: `of ${totalTasksForDay}`,
            sub: isFutureDay
              ? "Read-only preview"
              : checkedToday === totalTasksForDay
              ? "All done"
              : `${totalTasksForDay - checkedToday} to go`,
          },
          {
            label: "Sprint complete",
            icon: "chart" as const,
            value: `${overallPct}%`,
            unit: "",
            sub: `${totalChecked} of ${TOTAL_TASKS} tasks`,
          },
          {
            label: "Streak",
            icon: "flame" as const,
            value: `${streak}`,
            unit: streak === 1 ? "day" : "days",
            sub: streak > 0 ? "Keep it going" : "Finish a day to start one",
          },
        ].map((stat) => (
          <div key={stat.label} className="stagger-item card p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-text-faint">
              <Icon name={stat.icon} size={13} />
              <span className="truncate text-xs font-semibold">{stat.label}</span>
            </div>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="num font-display text-2xl font-semibold leading-none text-text sm:text-3xl">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="num text-sm font-medium text-text-faint">{stat.unit}</span>
              )}
            </p>
            <p className="mt-1.5 truncate text-sm text-text-muted">{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* ── Save failures ── */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-md text-warn">
          <span aria-hidden className="mt-0.5">
            <Icon name="cloudOff" size={15} />
          </span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── DAILY REMINDER PROMPT ── */}
      <NotificationBanner />

      {/* ── Main layout: the day's work on the left, the sprint's shape on the right ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        {/* ── Left: day rail and checklist ── */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Day header. The day number is the largest thing on the page —
              everything else here is a quiet annotation on it. */}
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold leading-none text-text sm:text-4xl">
                Day {day}
                <span className="num ml-2 text-xl font-normal text-text-faint sm:text-2xl">
                  of {TOTAL_DAYS}
                </span>
              </h1>
              <p className="mt-2 text-md text-text-muted">
                {day === currentDay ? "Today" : dayPlan.weekday}, week {dayPlan.week}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dayPlan.isSunday && (
                <span className="badge border border-border bg-surface-raised text-text-muted">
                  <Icon name="sun" size={12} />
                  Sunday schedule
                </span>
              )}
              {isFutureDay && (
                <span className="badge border border-border bg-surface-raised text-text-muted">
                  <Icon name="lock" size={12} />
                  Read-only
                </span>
              )}
              {streak > 0 && (
                <span className="badge border border-warn/30 bg-warn-soft text-warn">
                  <Icon name="flame" size={12} />
                  {streak}-day streak
                </span>
              )}
              <span
                className="badge num text-on-fill"
                style={{
                  background:
                    checkedToday === totalTasksForDay ? "var(--done)" : "var(--accent)",
                }}
              >
                {checkedToday}/{totalTasksForDay} done
              </span>
            </div>
          </div>

          <DayRail
            plan={plan}
            progressByDay={progressByDay}
            currentDay={currentDay}
            selectedDay={day}
            onSelect={setSelectedDay}
          />

          {/* ── The checklist itself ── */}
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-text">
                  {displayName}&apos;s checklist
                </h2>
                <p className="mt-1 max-w-[62ch] text-sm text-text-muted">
                  {isFutureDay
                    ? "A preview of what this day holds. Ticking opens up when you get there."
                    : dayPlan.isSunday
                    ? "Four and a half hours of study, then an hour on the project. From 1:30 PM the day is yours."
                    : "Three and a half hours, 7:30 PM to 11:45 PM, with dinner at 9:00 PM."}
                </p>
              </div>

              <button
                onClick={() => setScheduleOpen(true)}
                className="btn-ghost shrink-0 px-3 py-2 text-sm"
              >
                <Icon name="clock" size={14} />
                Timetable
              </button>
            </div>

            {isFutureDay && (
              <div className="animate-fade-in mb-4 flex flex-col gap-2.5 rounded-xl border border-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="flex items-start gap-2.5 text-md text-text-muted sm:items-center">
                  <span aria-hidden className="mt-0.5 shrink-0 text-text-faint sm:mt-0">
                    <Icon name="lock" size={15} />
                  </span>
                  <span>
                    Day {day} hasn&apos;t arrived yet — you&apos;re on day {currentDay}. Read ahead
                    as much as you like.
                  </span>
                </p>
                <button
                  onClick={() => setSelectedDay(currentDay)}
                  className="min-h-[36px] shrink-0 self-start text-sm font-semibold text-accent hover:underline sm:self-auto"
                >
                  Back to day {currentDay}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {dayPlan.taskKeys.map((key) => (
                <ChecklistItem
                  key={key}
                  label={TASK_LABELS[key]}
                  description={dayPlan.tasks[key] || ""}
                  timing={dayPlan.timings[key]}
                  checked={Boolean(selectedRow?.[key])}
                  onToggle={() => toggle(key)}
                  disabled={dataLoading || pendingKey === key}
                  readOnly={isFutureDay}
                />
              ))}
            </div>

            {/* Notes for this day */}
            <DayNotes
              userId={user.id}
              day={day}
              initialValue={selectedRow?.notes || ""}
              isFuture={isFutureDay}
            />
          </section>
        </div>

        {/* ── Right: the shape of the whole sprint ── */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Sprint overview */}
          <div className="card animate-fade-in-up p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-text">Sprint overview</h2>
              <span className="num text-sm text-text-faint">
                {totalChecked} of {TOTAL_TASKS}
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="num font-display text-4xl font-semibold leading-none text-text">
                {overallPct}%
              </span>
              <span className="text-sm text-text-muted">complete</span>
            </div>

            <div className="mt-3">
              <ProgressBar percent={overallPct} size="md" />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border-soft pt-4">
              <div>
                <dt className="text-xs font-semibold text-text-faint">Days finished</dt>
                <dd className="num mt-1 text-lg font-semibold text-text">
                  {finishedDays}
                  <span className="text-sm font-normal text-text-faint"> of {TOTAL_DAYS}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-text-faint">Started</dt>
                <dd className="mt-1 text-lg font-semibold text-text">
                  {formatDateShort(user.start_date)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Subject mastery */}
          <div
            className="card animate-fade-in-up p-4 sm:p-5"
            style={{ animationDelay: "0.08s" }}
          >
            <h2 className="font-display text-lg font-semibold text-text">Subject mastery</h2>
            <p className="mt-1 text-sm text-text-muted">Every day of the sprint, added up.</p>

            <div className="mt-4 flex flex-col gap-3.5">
              {(
                [
                  "aptitude",
                  "reasoning",
                  "verbal",
                  "cs_fundamentals",
                  "java_core",
                  "dsa_concept",
                  "leetcode",
                  "gpp_project",
                ] as TaskKey[]
              ).map((key) => {
                const count = catStats[key] || 0;
                const totalTarget = plan.plannedFor(key);
                const pct = totalTarget > 0 ? Math.min(100, Math.round((count / totalTarget) * 100)) : 0;
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-base font-medium text-text">
                        <span aria-hidden className="text-sm leading-none">
                          {CATEGORY_ICONS[key]}
                        </span>
                        <span className="truncate">{TASK_LABELS[key]}</span>
                      </span>
                      <span className="num shrink-0 text-xs font-semibold text-text-faint">
                        {count}/{totalTarget}
                      </span>
                    </div>
                    <ProgressBar
                      percent={pct}
                      size="sm"
                      color={pct === 100 ? "var(--done)" : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Squad standings */}
          {topSquad.length > 0 && (
            <div
              className="card animate-fade-in-up p-4 sm:p-5"
              style={{ animationDelay: "0.16s" }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-text">Squad standings</h2>
                <Link href="/squad" className="text-sm font-semibold text-accent hover:underline">
                  View all {squadUsers.length}
                </Link>
              </div>

              <ol className="mt-4 flex flex-col gap-2">
                {topSquad.map((item, idx) => {
                  const isYou = item.user.id === user.id;
                  const dName = item.user.nickname || item.user.name;
                  const initial = dName.slice(0, 1).toUpperCase();

                  return (
                    <li
                      key={item.user.id}
                      className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 ${
                        isYou
                          ? "border-accent/40 bg-accent-soft"
                          : "border-border-soft bg-surface-raised"
                      }`}
                    >
                      <span className="num w-4 shrink-0 text-center text-sm font-semibold text-text-faint">
                        {idx + 1}
                      </span>
                      <span aria-hidden className="avatar h-7 w-7 text-xs">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-base font-semibold text-text">
                            {dName}
                          </span>
                          {isYou && (
                            <span className="badge bg-accent px-1.5 py-0 text-2xs text-on-fill">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <ProgressBar percent={item.overallPct} size="sm" />
                        </div>
                      </div>
                      <span className="num shrink-0 text-sm font-semibold text-text-muted">
                        {item.overallPct}%
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Schedule & Rules Modal */}
      <ScheduleRulesModal
        plan={plan}
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />
    </div>
  );
}
