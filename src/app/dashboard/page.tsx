"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getProgressForUser, setTask, listUsers, getAllProgress } from "@/lib/db";
import type { ProgressRow, UserRow } from "@/lib/types";
import {
  TASK_LABELS,
  TOTAL_DAYS,
  TOTAL_TASKS,
  getDayPlan,
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
  const { user, loading: userLoading } = useCurrentUser();
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

  const currentDay = useMemo(() => (user ? dayNumberFor(user.start_date, TOTAL_DAYS) : 1), [user]);

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

  const progressByDay = useMemo(() => new Map(rows.map((r) => [r.day_number, r])), [rows]);
  const day = selectedDay ?? currentDay;
  const dayPlan = getDayPlan(day);
  const selectedRow = progressByDay.get(day);
  const totalTasksForDay = dayPlan ? dayPlan.taskKeys.length : 7;
  const checkedToday = countCheckedForDay(selectedRow, day);
  const streak = useMemo(() => currentStreak(rows), [rows]);
  const totalChecked = useMemo(() => totalCheckedForUser(rows), [rows]);
  const finishedDays = useMemo(() => completedDaysCount(rows), [rows]);
  const catStats = useMemo(() => categoryStats(rows), [rows]);
  const overallPct = TOTAL_TASKS > 0 ? Math.round((totalChecked / TOTAL_TASKS) * 100) : 0;

  // Top squad leaderboard preview
  const topSquad = useMemo(() => {
    return squadUsers
      .map((u) => {
        const uRows = allSquadProgress.filter((p) => p.user_id === u.id);
        const uDay = dayNumberFor(u.start_date, TOTAL_DAYS);
        const todayR = rowForDay(uRows, uDay);
        const uTotalChecked = totalCheckedForUser(uRows);
        return {
          user: u,
          currentDay: uDay,
          todayChecked: countCheckedForDay(todayR, uDay),
          overallPct: Math.round((uTotalChecked / TOTAL_TASKS) * 100),
          streak: currentStreak(uRows),
        };
      })
      .sort((a, b) => b.overallPct - a.overallPct || b.streak - a.streak)
      .slice(0, 4);
  }, [squadUsers, allSquadProgress]);

  async function toggle(taskKey: TaskKey) {
    if (!user) return;
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
      await setTask(user.id, day, taskKey, next);
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
      <div className="flex min-h-[60vh] items-center justify-center">
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
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* ── TOP STATS OVERVIEW (Widescreen 4-Column Grid) ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Current Day",
            value: `Day ${day} / ${TOTAL_DAYS}`,
            sub: `${dayPlan.weekday} · Week ${dayPlan.week}`,
            icon: "📅",
          },
          {
            label: "Day Tasks",
            value: `${checkedToday}/${totalTasksForDay}`,
            sub:
              checkedToday === totalTasksForDay
                ? "All done for today! 🎉"
                : `${totalTasksForDay - checkedToday} remaining today`,
            icon: checkedToday === totalTasksForDay ? "✅" : "📋",
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
            className="stagger-item rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-accent/40"
            style={{ boxShadow: "var(--shadow-sm)", animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                {stat.label}
              </span>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-2 text-[22px] font-bold text-text">{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-text-muted">{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* ── ERROR MESSAGE ── */}
      {errorMsg && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {errorMsg}
        </div>
      )}

      {/* ── MAIN 2-COLUMN DASHBOARD LAYOUT ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* ── LEFT COLUMN: Day Rail & Tasks Checklist (8 cols) ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Day Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-text-faint">
                  {day === currentDay ? "Today" : `${dayPlan.weekday}`} · Week {dayPlan.week}
                </span>
                {dayPlan.isSunday && (
                  <span className="badge text-white bg-accent font-bold text-[10px]">
                    ☀️ Sunday Schedule + GPP Projects
                  </span>
                )}
              </div>
              <h1 className="font-display text-[32px] font-bold leading-tight text-text">
                Day {day}{" "}
                <span className="text-text-faint font-normal text-[24px]">/ {TOTAL_DAYS}</span>
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
                  {dayPlan.isSunday
                    ? "Sunday Half Study (4h30m) + 1h GPP Project Revision · 1:30 PM onward 100% Free Reset"
                    : "Daily 3h30m Study Chain (7:30 PM – 11:45 PM) with Dinner Break at 9:00 PM"}
                </p>
              </div>

              <button
                onClick={() => setScheduleOpen(true)}
                className="text-[12px] font-semibold text-accent hover:underline flex items-center gap-1 bg-surface-raised px-3 py-1 rounded-full border border-border"
              >
                <span>⏰</span> View Schedule & Timings →
              </button>
            </div>

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
                />
              ))}
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN / SIDEBAR: Progress Analytics, Domain Mastery & Squad (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Sprint Overview Card */}
          <div
            className="rounded-xl border border-border bg-surface p-5 animate-fade-in-up"
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
                <p className="text-[11px] text-text-faint uppercase font-semibold">Started On</p>
                <p className="text-[14px] font-bold text-text mt-0.5">{formatDateShort(user.start_date)}</p>
              </div>
            </div>
          </div>

          {/* Subject / Domain Mastery Breakdown */}
          <div
            className="rounded-xl border border-border bg-surface p-5 animate-fade-in-up"
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
                const totalTarget = key === "gpp_project" ? 3 : 21; // 3 Sundays for GPP, 21 for others
                const pct = Math.min(100, Math.round((count / totalTarget) * 100));
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
              className="rounded-xl border border-border bg-surface p-5 animate-fade-in-up"
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
                            <span className="rounded-full px-1.5 py-0.2 text-[9px] font-bold text-white bg-accent">
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
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />
    </div>
  );
}
