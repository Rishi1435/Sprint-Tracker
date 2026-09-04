"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { listUsers, getAllProgress, subscribeToAllProgress, subscribeToUsers } from "@/lib/db";
import type { UserRow, ProgressRow } from "@/lib/types";
import {
  TASK_LABELS,
  TOTAL_DAYS,
  buildSprintPlan,
} from "@/lib/plan";
import { dayNumberFor, formatDateShort } from "@/lib/date";
import {
  countCheckedForDay,
  overallPercent,
  currentStreak,
  rowForDay,
} from "@/lib/stats";
import ProgressBar from "@/components/ProgressBar";
import DayRail from "@/components/DayRail";
import CheerButton from "@/components/CheerButton";

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

  // Live updates
  useEffect(() => {
    if (!user) return;
    const unsubProgress = subscribeToAllProgress((evt) => {
      if (evt.type === "DELETE") {
        setAllProgress((prev) => prev.filter((r) => r.id !== evt.old?.id));
        return;
      }
      const row = evt.row;
      if (!row) return;
      setAllProgress((prev) => {
        const idx = prev.findIndex((r) => r.id === row.id);
        if (idx === -1) return [...prev, row];
        const copy = prev.slice();
        copy[idx] = row;
        return copy;
      });
    });
    const unsubUsers = subscribeToUsers(() => {
      listUsers().then((u) => setUsers(u)).catch(() => {});
    });
    return () => {
      unsubProgress();
      unsubUsers();
    };
  }, [user]);

  const ranked: Ranked[] = useMemo(() => {
    return users
      .map((u) => {
        const rows = allProgress.filter((p) => p.user_id === u.id);
        // Members start on different weekdays, so each gets their own calendar.
        const plan = buildSprintPlan(u.start_date);
        const day = dayNumberFor(u.start_date, TOTAL_DAYS);
        const todayRow = rowForDay(rows, day);
        const todayTotal = plan.taskKeysFor(day).length;
        return {
          user: u,
          currentDay: day,
          todayChecked: countCheckedForDay(plan, todayRow, day),
          todayTotal,
          overallPct: overallPercent(plan, rows),
          streak: currentStreak(plan, rows),
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

  // The inspected member's own calendar — their Sundays (daytime timetable plus
  // the 8th GPP task) depend on the weekday they started on, not ours.
  const inspectPlan = useMemo(() => {
    return buildSprintPlan(inspectUser?.start_date);
  }, [inspectUser?.start_date]);

  const inspectDayPlan = useMemo(() => {
    return inspectPlan.getDay(inspectSelectedDay);
  }, [inspectPlan, inspectSelectedDay]);

  const inspectSelectedRow = inspectProgressByDay.get(inspectSelectedDay);
  const inspectCheckedCount = countCheckedForDay(inspectPlan, inspectSelectedRow, inspectSelectedDay);
  const inspectTotalTasks = inspectDayPlan ? inspectDayPlan.taskKeys.length : 7;
  const inspectOverallPct = overallPercent(inspectPlan, inspectUserRows);
  const inspectStreak = currentStreak(inspectPlan, inspectUserRows);

  if (userLoading || !user) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
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
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-text-faint">
            Shared Room Sprint Leaderboard
          </p>
          <h1 className="font-display text-[26px] font-bold text-text sm:text-[32px]">
            Squad Leaderboard
          </h1>
        </div>
        <span
          className="badge text-white"
          style={{ background: "var(--accent-gradient)" }}
        >
          🏆 Live Rankings
        </span>
      </div>

      {/* ── SQUAD ROOM TOP STATS (Widescreen Row) ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Sprinters",
            icon: "👥",
            value: `${squadStats.total}`,
            sub: "Active members in room",
            tone: "text-text",
          },
          {
            label: "Room Average Progress",
            icon: "📈",
            value: `${squadStats.avgPct}%`,
            sub: "Average completion rate",
            tone: "text-accent",
          },
          {
            label: "Highest Room Streak",
            icon: "🔥",
            value: `${squadStats.maxStreak} Days`,
            sub: "Top streak holder",
            tone: "text-warn",
          },
          {
            label: "Finished Today",
            icon: "🎯",
            value: `${squadStats.completedToday} of ${squadStats.total}`,
            sub: "Members 100% done today",
            tone: "text-done",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="stagger-item rounded-xl border border-border bg-surface p-3.5 transition-all duration-200 sm:p-4"
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
            <p className={`mt-2 text-[18px] font-bold leading-tight sm:text-[22px] ${stat.tone}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-text-muted sm:text-[12px]">
              {stat.sub}
            </p>
          </div>
        ))}
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30dvh] items-center justify-center">
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
                className={`stagger-item group flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:border-accent hover:scale-[1.005] sm:flex-nowrap sm:gap-4 sm:p-4.5 ${
                  isYou
                    ? "border-accent/40 bg-accent-soft"
                    : "border-border bg-surface"
                }`}
                style={{ boxShadow: "var(--shadow-sm)" }}
                title={`Click to view ${displayName}'s full sprint`}
              >
                {/* Rank */}
                <span className="w-7 shrink-0 text-center sm:w-9">
                  {isTop3 ? (
                    <span className="text-xl sm:text-2xl">{RANK_MEDALS[i]}</span>
                  ) : (
                    <span className="text-[15px] font-bold text-text-faint">
                      {i + 1}
                    </span>
                  )}
                </span>

                {/* Avatar */}
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11"
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-[15px] font-semibold text-text transition-colors group-hover:text-accent sm:text-[16px]">
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
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-faint sm:gap-x-4">
                    <span>📅 Day {r.currentDay} of {TOTAL_DAYS}</span>
                    <span>🗓️ Started {formatDateShort(r.user.start_date)}</span>
                    {r.streak > 0 && (
                      <span className="font-semibold text-warn">🔥 {r.streak}-day streak</span>
                    )}
                    <span className="font-medium text-accent group-hover:underline sm:ml-auto">
                      View full sprint →
                    </span>
                  </div>
                </div>

                {/* Today's score + cheer — a full-width strip below the row on phones */}
                <div className="flex w-full items-center justify-between gap-3 border-t border-border-soft pt-2.5 sm:w-auto sm:border-0 sm:pt-0">
                  <div className="shrink-0 text-left sm:pr-2 sm:text-right">
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

                  {/* Cheer button (hidden on self) */}
                  {!isYou && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <CheerButton
                        fromUserId={user.id}
                        toUserId={r.user.id}
                        toName={displayName}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── SPRINT DETAILS MODAL ── */}
      {inspectUser && inspectDayPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
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
            className="glass-card relative z-10 max-h-[90dvh] w-full max-w-3xl overflow-y-auto p-4 animate-fade-in-up sm:p-6"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border-soft pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white shadow-sm"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {(inspectUser.nickname || inspectUser.name).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h2 className="font-display text-[17px] font-bold text-text sm:text-[18px]">
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
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
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <div
                className="rounded-xl border border-border bg-surface p-2.5 text-center sm:p-3"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[10px]">
                  Overall Completion
                </p>
                <p className="mt-1 text-[17px] font-bold text-accent sm:text-[18px]">
                  {inspectOverallPct}%
                </p>
              </div>

              <div
                className="rounded-xl border border-border bg-surface p-2.5 text-center sm:p-3"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[10px]">
                  Day {inspectSelectedDay} Done
                </p>
                <p
                  className={`mt-1 text-[17px] font-bold sm:text-[18px] ${
                    inspectCheckedCount === inspectTotalTasks ? "text-done" : "text-text"
                  }`}
                >
                  {inspectCheckedCount}/{inspectTotalTasks}
                </p>
              </div>

              <div
                className="rounded-xl border border-border bg-surface p-2.5 text-center sm:p-3"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[10px]">
                  Current Streak
                </p>
                <p className="mt-1 text-[17px] font-bold text-warn sm:text-[18px]">
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
                plan={inspectPlan}
                progressByDay={inspectProgressByDay}
                currentDay={inspectCurrentDay}
                selectedDay={inspectSelectedDay}
                onSelect={setInspectSelectedDay}
              />
            </div>

            {/* Day Title */}
            <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">
                    {inspectSelectedDay === inspectCurrentDay ? "Current Day" : inspectDayPlan.weekday} · Week {inspectDayPlan.week}
                  </span>
                  {inspectDayPlan.isSunday && (
                    <span className="badge bg-accent text-[9.5px] font-bold text-white">
                      Sunday + GPP Projects
                    </span>
                  )}
                </div>
                <h3 className="font-display text-[18px] font-bold text-text sm:text-[20px]">
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
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors sm:gap-3.5 sm:p-3.5 ${
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
                          <span className="flex items-center gap-1 rounded-full border border-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-faint">
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
                        <span aria-hidden>✓</span>
                        <span className="hidden sm:inline"> Completed</span>
                      </span>
                    ) : inspectSelectedDay > inspectCurrentDay ? (
                      <span className="shrink-0 rounded-md border border-border-soft bg-surface-raised px-2 py-0.5 text-[10.5px] font-medium text-text-faint">
                        <span aria-hidden>🔒</span>
                        <span className="hidden sm:inline"> Future Day</span>
                      </span>
                    ) : (
                      <span className="hidden shrink-0 text-[11px] font-medium text-text-faint sm:block">
                        Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Close Button */}
            <div className="mt-6 flex justify-end border-t border-border-soft pt-4">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="btn-primary w-full text-[13px] sm:w-auto"
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
