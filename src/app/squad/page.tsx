"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listUsers, getAllProgress } from "@/lib/db";
import type { UserRow, ProgressRow } from "@/lib/types";
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
  overallPercent,
  currentStreak,
  rowForDay,
  isDayComplete,
} from "@/lib/stats";
import ProgressBar from "@/components/ProgressBar";
import DayRail from "@/components/DayRail";

interface Ranked {
  user: UserRow;
  currentDay: number;
  todayChecked: number;
  todayTotal: number;
  overallPct: number;
  streak: number;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #9ca3af, #6b7280)",
  "linear-gradient(135deg, #d97706, #b45309)",
];

export default function SquadPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [allProgress, setAllProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inspected squad member state for viewing full sprint details
  const [inspectUser, setInspectUser] = useState<UserRow | null>(null);
  const [inspectSelectedDay, setInspectSelectedDay] = useState<number>(1);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/");
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listUsers(), getAllProgress()])
      .then(([u, p]) => {
        if (cancelled) return;
        setUsers(u);
        setAllProgress(p);
      })
      .catch(() => setErrorMsg("Couldn't load squad progress. Refresh to try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const ranked: Ranked[] = useMemo(() => {
    return users
      .map((u) => {
        const rows = allProgress.filter((p) => p.user_id === u.id);
        const day = dayNumberFor(u.start_date, TOTAL_DAYS);
        const todayRow = rowForDay(rows, day);
        const todayTotal = day % 7 === 0 ? 8 : 7;
        return {
          user: u,
          currentDay: day,
          todayChecked: countCheckedForDay(todayRow, day),
          todayTotal,
          overallPct: overallPercent(rows),
          streak: currentStreak(rows),
        };
      })
      .sort((a, b) => b.overallPct - a.overallPct || b.streak - a.streak);
  }, [users, allProgress]);

  // Squad room summary stats
  const squadStats = useMemo(() => {
    if (ranked.length === 0) {
      return { total: 0, avgPct: 0, maxStreak: 0, completedToday: 0 };
    }
    const total = ranked.length;
    const avgPct = Math.round(ranked.reduce((acc, r) => acc + r.overallPct, 0) / total);
    const maxStreak = Math.max(...ranked.map((r) => r.streak), 0);
    const completedToday = ranked.filter((r) => r.todayChecked >= r.todayTotal).length;
    return { total, avgPct, maxStreak, completedToday };
  }, [ranked]);

  // Handle opening detailed sprint view for a member
  function openSprintDetails(targetUser: UserRow) {
    const day = dayNumberFor(targetUser.start_date, TOTAL_DAYS);
    setInspectUser(targetUser);
    setInspectSelectedDay(day);
  }

  // Progress rows for inspected user
  const inspectUserRows = useMemo(() => {
    if (!inspectUser) return [];
    return allProgress.filter((p) => p.user_id === inspectUser.id);
  }, [allProgress, inspectUser]);

  const inspectProgressByDay = useMemo(() => {
    return new Map(inspectUserRows.map((r) => [r.day_number, r]));
  }, [inspectUserRows]);

  const inspectCurrentDay = useMemo(() => {
    return inspectUser ? dayNumberFor(inspectUser.start_date, TOTAL_DAYS) : 1;
  }, [inspectUser]);

  const inspectDayPlan = useMemo(() => {
    return getDayPlan(inspectSelectedDay);
  }, [inspectSelectedDay]);

  const inspectSelectedRow = inspectProgressByDay.get(inspectSelectedDay);
  const inspectCheckedCount = countCheckedForDay(inspectSelectedRow, inspectSelectedDay);
  const inspectTotalTasks = inspectDayPlan ? inspectDayPlan.taskKeys.length : 7;
  const inspectOverallPct = overallPercent(inspectUserRows);
  const inspectStreak = currentStreak(inspectUserRows);

  if (userLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span className="text-[14px] text-text-muted">Loading squad…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-text-faint">
            Shared Room Sprint Leaderboard
          </p>
          <h1 className="font-display text-[32px] font-bold text-text">Squad Leaderboard</h1>
        </div>
        <span
          className="badge text-white"
          style={{ background: "var(--accent-gradient)" }}
        >
          🏆 Live Rankings
        </span>
      </div>

      {/* ── SQUAD ROOM TOP STATS (Widescreen Row) ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          className="rounded-xl border border-border bg-surface p-4 transition-all duration-200"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Total Sprinters
            </span>
            <span className="text-xl">👥</span>
          </div>
          <p className="mt-2 text-[22px] font-bold text-text">{squadStats.total}</p>
          <p className="mt-0.5 text-[12px] text-text-muted">Active members in room</p>
        </div>

        <div
          className="rounded-xl border border-border bg-surface p-4 transition-all duration-200"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Room Average Progress
            </span>
            <span className="text-xl">📈</span>
          </div>
          <p className="mt-2 text-[22px] font-bold text-accent">{squadStats.avgPct}%</p>
          <p className="mt-0.5 text-[12px] text-text-muted">Average completion rate</p>
        </div>

        <div
          className="rounded-xl border border-border bg-surface p-4 transition-all duration-200"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Highest Room Streak
            </span>
            <span className="text-xl">🔥</span>
          </div>
          <p className="mt-2 text-[22px] font-bold text-warn">{squadStats.maxStreak} Days</p>
          <p className="mt-0.5 text-[12px] text-text-muted">Top streak holder</p>
        </div>

        <div
          className="rounded-xl border border-border bg-surface p-4 transition-all duration-200"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Finished Today
            </span>
            <span className="text-xl">🎯</span>
          </div>
          <p className="mt-2 text-[22px] font-bold text-done">
            {squadStats.completedToday} of {squadStats.total}
          </p>
          <p className="mt-0.5 text-[12px] text-text-muted">Members 100% done today</p>
        </div>
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {ranked.map((r, i) => {
            const isYou = r.user.id === user.id;
            const displayName = r.user.nickname || r.user.name;
            const initial = displayName.slice(0, 1).toUpperCase();
            const isTop3 = i < 3;

            return (
              <li
                key={r.user.id}
                onClick={() => openSprintDetails(r.user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    openSprintDetails(r.user);
                  }
                }}
                className={`stagger-item group flex cursor-pointer items-center gap-4 rounded-xl border p-4.5 transition-all duration-200 hover:border-accent hover:scale-[1.005] ${
                  isYou
                    ? "border-accent/40 bg-accent-soft"
                    : "border-border bg-surface"
                }`}
                style={{ boxShadow: "var(--shadow-sm)" }}
                title={`Click to view ${displayName}'s full sprint`}
              >
                {/* Rank */}
                <span className="w-9 shrink-0 text-center">
                  {isTop3 ? (
                    <span className="text-2xl">{RANK_MEDALS[i]}</span>
                  ) : (
                    <span className="text-[15px] font-bold text-text-faint">
                      {i + 1}
                    </span>
                  )}
                </span>

                {/* Avatar */}
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: isTop3
                      ? RANK_COLORS[i]
                      : "var(--accent-gradient)",
                  }}
                >
                  {initial}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-semibold text-text group-hover:text-accent transition-colors">
                      {displayName}
                    </span>
                    {r.user.nickname && (
                      <span className="truncate text-[12.5px] text-text-faint">
                        @{r.user.name}
                      </span>
                    )}
                    {isYou && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: "var(--accent-gradient)" }}
                      >
                        You
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 max-w-xl">
                    <ProgressBar
                      percent={r.overallPct}
                      size="sm"
                      showLabel
                      color={
                        r.overallPct === 100
                          ? "var(--done)"
                          : undefined
                      }
                    />
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px] text-text-faint">
                    <span>📅 Day {r.currentDay} of {TOTAL_DAYS}</span>
                    <span>🗓️ Started {formatDateShort(r.user.start_date)}</span>
                    {r.streak > 0 && (
                      <span className="font-semibold text-warn">🔥 {r.streak}-day streak</span>
                    )}
                    <span className="text-accent font-medium sm:ml-auto group-hover:underline">
                      View full sprint →
                    </span>
                  </div>
                </div>

                {/* Today's score */}
                <div className="shrink-0 text-right pr-2">
                  <p
                    className={`text-[18px] font-bold ${
                      r.todayChecked === r.todayTotal ? "text-done" : "text-text"
                    }`}
                  >
                    {r.todayChecked}/{r.todayTotal}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
                    today
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── SPRINT DETAILS MODAL ── */}
      {inspectUser && inspectDayPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setInspectUser(null)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div
            className="glass-card relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-soft">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 place-items-center rounded-full text-[15px] font-bold text-white shadow-sm"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {(inspectUser.nickname || inspectUser.name).slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-[18px] font-bold text-text">
                      {inspectUser.nickname || inspectUser.name}&apos;s Sprint
                    </h2>
                    {inspectUser.nickname && (
                      <span className="text-[12px] text-text-faint">
                        @{inspectUser.name}
                      </span>
                    )}
                    {inspectUser.id === user.id && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: "var(--accent-gradient)" }}
                      >
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-muted">
                    Day {inspectCurrentDay} of {TOTAL_DAYS} · Started {formatDateShort(inspectUser.start_date)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                aria-label="Close details"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M1 13L13 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Member Stats Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div
                className="rounded-xl border border-border bg-surface p-3 text-center"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Overall Completion
                </p>
                <p className="mt-1 text-[18px] font-bold text-accent">
                  {inspectOverallPct}%
                </p>
              </div>

              <div
                className="rounded-xl border border-border bg-surface p-3 text-center"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Day {inspectSelectedDay} Done
                </p>
                <p
                  className={`mt-1 text-[18px] font-bold ${
                    inspectCheckedCount === inspectTotalTasks ? "text-done" : "text-text"
                  }`}
                >
                  {inspectCheckedCount}/{inspectTotalTasks}
                </p>
              </div>

              <div
                className="rounded-xl border border-border bg-surface p-3 text-center"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  Current Streak
                </p>
                <p className="mt-1 text-[18px] font-bold text-warn">
                  {inspectStreak > 0 ? `🔥 ${inspectStreak}d` : "None"}
                </p>
              </div>
            </div>

            {/* Interactive Day Rail for Inspected User */}
            <div className="mt-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-text-muted">
                Select a day to inspect
              </p>
              <DayRail
                progressByDay={inspectProgressByDay}
                currentDay={inspectCurrentDay}
                selectedDay={inspectSelectedDay}
                onSelect={setInspectSelectedDay}
              />
            </div>

            {/* Day Title */}
            <div className="mt-5 mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">
                    {inspectSelectedDay === inspectCurrentDay ? "Current Day" : inspectDayPlan.weekday} · Week {inspectDayPlan.week}
                  </span>
                  {inspectDayPlan.isSunday && (
                    <span className="badge text-white bg-accent font-bold text-[9.5px]">
                      Sunday + GPP Projects
                    </span>
                  )}
                </div>
                <h3 className="font-display text-[20px] font-bold text-text">
                  Day {inspectSelectedDay} Checklist
                </h3>
              </div>
              <span
                className="badge text-white"
                style={
                  inspectCheckedCount === inspectTotalTasks
                    ? { background: "var(--done)" }
                    : { background: "var(--accent-gradient)" }
                }
              >
                {inspectCheckedCount}/{inspectTotalTasks} completed
              </span>
            </div>

            {/* Inspected User Checklist Items (Read-only view) */}
            <div className="flex flex-col gap-2.5">
              {inspectDayPlan.taskKeys.map((key) => {
                const isChecked = Boolean(inspectSelectedRow?.[key]);
                const timing = inspectDayPlan.timings[key];
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors ${
                      isChecked
                        ? "border-done/40 bg-done-soft"
                        : "border-border bg-surface"
                    }`}
                    style={{ boxShadow: "var(--shadow-sm)" }}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border-2 transition-colors ${
                        isChecked
                          ? "border-done bg-done text-white"
                          : "border-border text-transparent"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M2.5 7.2L5.5 10.5L11.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            isChecked ? "text-done" : "text-accent"
                          }`}
                        >
                          {TASK_LABELS[key]}
                        </span>
                        {timing && (
                          <span className="rounded-full bg-surface-raised px-1.5 py-0.2 text-[10px] font-semibold text-text-faint flex items-center gap-1 border border-border-soft">
                            <span>⏰ {timing.time}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`mt-0.5 block text-[13.5px] leading-snug ${
                          isChecked
                            ? "text-text-muted line-through decoration-done/40 decoration-2"
                            : "text-text"
                        }`}
                      >
                        {inspectDayPlan.tasks[key]}
                      </span>
                    </div>

                    {isChecked ? (
                      <span className="shrink-0 text-[11px] font-semibold text-done">
                        ✓ Completed
                      </span>
                    ) : inspectSelectedDay > inspectCurrentDay ? (
                      <span className="shrink-0 rounded-md bg-surface-raised px-2 py-0.5 text-[10.5px] font-medium text-text-faint border border-border-soft">
                        🔒 Future Day
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-text-faint">
                        Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Close Button */}
            <div className="mt-6 pt-4 border-t border-border-soft flex justify-end">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="btn-primary text-[13px] px-5 py-2"
              >
                Back to Squad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
