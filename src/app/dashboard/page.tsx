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
          <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span className="text-[14px] text-text-muted">Loading your sprint…</span>
        </div>
      </div>
    );
  }

  const displayName = user.nickname || user.name;

  return (
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      {/* ── TOP STATS OVERVIEW (Widescreen 4-Column Grid) ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Current Day",
            value: `Day ${currentDay} / ${TOTAL_DAYS}`,
            sub: hasStarted
              ? `${todayPlan?.weekday ?? ""} · Week ${todayPlan?.week ?? 1}`
              : "Ready to begin sprint",
            icon: "📅",
          },
          {
            label: "Day Tasks",
            value: `${checkedToday}/${totalTasksForDay}`,
            sub: isFutureDay
              ? "🔒 Read-only preview"
              : checkedToday === totalTasksForDay
              ? "All done for today! 🎉"
              : `${totalTasksForDay - checkedToday} remaining today`,
            icon: isFutureDay ? "🔒" : checkedToday === totalTasksForDay ? "✅" : "📋",
          },
          {
            label: "Sprint Completion",
            value: `${overallPct}%`,
            sub: `${totalChecked} of ${TOTAL_TASKS} total tasks`,
            icon: "📊",
          },
          {
            label: "Current Streak",
            value: streak > 0 ? `${streak} Day${streak > 1 ? "s" : ""}` : "0 Days",
            sub: streak > 0 ? "🔥 Consistency is key!" : "Complete today to start streak",
            icon: streak > 0 ? "🔥" : "💪",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="stagger-item rounded-xl border border-border bg-surface p-3.5 transition-all duration-200 hover:border-accent/40 sm:p-4"
            style={{ boxShadow: "var(--shadow-sm)", animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[11px]">
                {stat.label}
              </span>
              <span aria-hidden className="text-lg leading-none sm:text-xl">
                {stat.icon}
              </span>
            </div>
            <p className="mt-2 text-[18px] font-bold leading-tight text-text sm:text-[22px]">
              {stat.value}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-text-muted sm:text-[12px]">
              {stat.sub}
            </p>
          </div>
        ))}
      </section>

      {/* ── ERROR MESSAGE ── */}
      {errorMsg && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {errorMsg}
        </div>
      )}

      {/* ── DAILY REMINDER PROMPT ── */}
      <NotificationBanner />

      {/* ── MAIN 2-COLUMN DASHBOARD LAYOUT ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        {/* ── LEFT COLUMN: Day Rail & Tasks Checklist (8 cols) ── */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Day Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-text-faint">
                  {day === currentDay ? "Today" : `${dayPlan.weekday}`} · Week {dayPlan.week}
                </span>
                {dayPlan.isSunday && (
                  <span className="badge text-white bg-accent font-bold text-[10px]">
                    <span aria-hidden>☀️</span>
                    <span className="sm:hidden">Sunday + GPP</span>
                    <span className="hidden sm:inline">Sunday Schedule + GPP Projects</span>
                  </span>
                )}
                {isFutureDay && (
                  <span className="badge text-text-muted bg-surface-raised font-semibold text-[10px] border border-border">
                    <span aria-hidden>🔒</span>
                    <span className="sm:hidden">Read-Only</span>
                    <span className="hidden sm:inline">Future Day (Read-Only)</span>
                  </span>
                )}
              </div>
              <h1 className="font-display text-[26px] font-bold leading-tight text-text sm:text-[32px]">
                Day {day}{" "}
                <span className="text-[20px] font-normal text-text-faint sm:text-[24px]">
                  / {TOTAL_DAYS}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <span className="badge border border-warn/30 bg-warn-soft text-warn">
                  🔥 {streak}-day streak
                </span>
              )}
              <span
                className="badge text-white"
                style={{
                  background:
                    checkedToday === totalTasksForDay
                      ? "var(--done)"
                      : "var(--accent-gradient)",
                }}
              >
                {checkedToday}/{totalTasksForDay} done
              </span>
            </div>
          </div>

          {/* Spacious 21-Day Rail */}
          <DayRail
            plan={plan}
            progressByDay={progressByDay}
            currentDay={currentDay}
            selectedDay={day}
            onSelect={setSelectedDay}
          />

          {/* Checklist Section */}
          <section className="mt-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-[20px] font-bold text-text">
                  {displayName}&apos;s Daily Checklist
                </h2>
                <p className="text-[12.5px] text-text-muted">
                  {isFutureDay
                    ? "Viewing upcoming syllabus in read-only mode"
                    : dayPlan.isSunday
                    ? "Sunday Half Study (4h30m) + 1h GPP Project Revision · 1:30 PM onward 100% Free Reset"
                    : "Daily 3h30m Study Chain (7:30 PM – 11:45 PM) with Dinner Break at 9:00 PM"}
                </p>
              </div>

              <button
                onClick={() => setScheduleOpen(true)}
                className="flex min-h-[36px] items-center gap-1 rounded-full border border-border bg-surface-raised px-3 text-[12px] font-semibold text-accent hover:underline"
              >
                <span aria-hidden>⏰</span> View Schedule &amp; Timings →
              </button>
            </div>

            {/* Future Day Read-Only Banner */}
            {isFutureDay && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-[13px] text-text-muted animate-fade-in sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex items-start gap-2.5 sm:items-center">
                  <span aria-hidden className="text-lg leading-none">🔒</span>
                  <span>
                    <strong>Day {day} is upcoming.</strong> You are currently on{" "}
                    <strong>Day {currentDay}</strong>. You can preview all upcoming tasks below in
                    Read-Only mode.
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDay(currentDay)}
                  className="min-h-[36px] shrink-0 self-start text-[12px] font-semibold text-accent hover:underline sm:self-auto"
                >
                  Go to Day {currentDay} →
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

        {/* ── RIGHT COLUMN / SIDEBAR: Progress Analytics, Domain Mastery & Squad (4 cols) ── */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Sprint Overview Card */}
          <div
            className="rounded-xl border border-border bg-surface p-4 animate-fade-in-up sm:p-5"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-soft">
              <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
                Sprint Overview
              </span>
              <span className="badge text-white" style={{ background: "var(--accent-gradient)" }}>
                21-Day Goal
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-[32px] font-bold text-text">{overallPct}%</span>
              <span className="text-[13px] text-text-muted font-medium">
                {totalChecked} / {TOTAL_TASKS} Tasks
              </span>
            </div>

            <div className="mt-2">
              <ProgressBar percent={overallPct} size="md" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border-soft">
              <div className="text-center p-2 rounded-lg bg-surface-raised">
                <p className="text-[11px] text-text-faint uppercase font-semibold">Days Finished</p>
                <p className="text-[16px] font-bold text-text mt-0.5">{finishedDays} / {TOTAL_DAYS}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-raised">
                <p className="text-[11px] text-text-faint uppercase font-semibold">Sprint Started</p>
                <p className="text-[13px] font-bold text-text mt-0.5">{formatDateShort(user.start_date)}</p>
              </div>
            </div>
          </div>

          {/* Subject / Domain Mastery Breakdown */}
          <div
            className="rounded-xl border border-border bg-surface p-4 animate-fade-in-up sm:p-5"
            style={{ boxShadow: "var(--shadow-sm)", animationDelay: "0.1s" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-soft">
              <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
                Subject Mastery
              </span>
              <span className="text-[11px] text-text-faint">Total Tracked</span>
            </div>

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
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-medium text-text flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[key]}</span>
                        <span>{TASK_LABELS[key]}</span>
                      </span>
                      <span className="font-semibold text-text-muted tabular-nums text-[11.5px]">
                        {count}/{totalTarget} ({pct}%)
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

          {/* Quick Squad Leaderboard Widget */}
          {topSquad.length > 0 && (
            <div
              className="rounded-xl border border-border bg-surface p-4 animate-fade-in-up sm:p-5"
              style={{ boxShadow: "var(--shadow-sm)", animationDelay: "0.15s" }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-soft">
                <span className="text-[12px] font-bold uppercase tracking-wider text-text-faint">
                  Squad Standings
                </span>
                <Link
                  href="/squad"
                  className="text-[12px] font-semibold text-accent hover:underline flex items-center gap-1"
                >
                  View All ({squadUsers.length}) →
                </Link>
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                {topSquad.map((item, idx) => {
                  const isYou = item.user.id === user.id;
                  const dName = item.user.nickname || item.user.name;
                  const initial = dName.slice(0, 1).toUpperCase();
                  const medals = ["🥇", "🥈", "🥉", "4th"];

                  return (
                    <div
                      key={item.user.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        isYou
                          ? "border-accent/40 bg-accent-soft"
                          : "border-border bg-surface-raised"
                      }`}
                    >
                      <span className="text-[12px] font-bold w-5 text-center">
                        {medals[idx]}
                      </span>
                      <span
                        aria-hidden
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm"
                        style={{ background: "var(--accent-gradient)" }}
                      >
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-text">
                            {dName}
                          </span>
                          {isYou && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white bg-accent">
                              You
                            </span>
                          )}
                        </div>
                        <ProgressBar percent={item.overallPct} size="sm" />
                      </div>
                      <span className="text-[12px] font-bold tabular-nums text-text-muted">
                        {item.overallPct}%
                      </span>
                    </div>
                  );
                })}
              </div>
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
