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
import ChecklistItem from "@/components/ChecklistItem";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";

interface Ranked {
  user: UserRow;
  currentDay: number;
  todayChecked: number;
  todayTotal: number;
  overallPct: number;
  streak: number;
}

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
          <span className="text-md text-text-muted">Loading squad…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      {/* The ranking is the page; it doesn't need a badge announcing that it's a
          ranking. The live dot says the one thing a leaderboard should say up
          front — that what you're reading is current. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-none text-text sm:text-4xl">
            Squad
          </h1>
          <p className="mt-2 max-w-[52ch] text-md text-text-muted">
            Everyone in the room, ranked by how much of their sprint is done.
            Tap a name to read their whole 21 days.
          </p>
        </div>
        <span className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-done"
            style={{ boxShadow: "0 0 0 3px var(--done-soft)" }}
          />
          Updating live
        </span>
      </div>

      {/* ── The room at a glance. Same tile as the dashboard: the icon names the
             metric, the number stays in --text, and only the icon is tinted, so
             four tiles side by side don't read as four warning lights. ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Sprinters",
            icon: "users" as const,
            value: `${squadStats.total}`,
            unit: squadStats.total === 1 ? "member" : "members",
            sub: "In the room",
          },
          {
            label: "Room average",
            icon: "chart" as const,
            value: `${squadStats.avgPct}%`,
            unit: "",
            sub: "Across every sprint",
          },
          {
            label: "Best streak",
            icon: "flame" as const,
            value: `${squadStats.maxStreak}`,
            unit: squadStats.maxStreak === 1 ? "day" : "days",
            sub: squadStats.maxStreak > 0 ? "Longest run going" : "Nobody has one yet",
          },
          {
            label: "Finished today",
            icon: "target" as const,
            value: `${squadStats.completedToday}`,
            unit: `of ${squadStats.total}`,
            sub: "Cleared the whole day",
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

      {errorMsg && (
        <div
          className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-md text-warn"
          role="alert"
        >
          <Icon name="cloudOff" size={15} />
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
            const leader = i === 0;

            return (
              <li
                key={r.user.id}
                className={`stagger-item group relative flex flex-wrap items-center gap-3 rounded-xl border p-3.5 transition-colors duration-200 sm:flex-nowrap sm:gap-4 sm:p-4 ${
                  isYou
                    ? "border-accent/40 bg-accent-soft"
                    : "border-border-soft bg-surface hover:border-accent/45"
                }`}
              >
                {/* The whole row opens the sprint. An overlay button rather than a
                    `role="button"` wrapper on the <li>, so the cheer control stays
                    a sibling instead of one interactive element inside another —
                    and Space scrolls nothing, because it's a real button. */}
                <button
                  onClick={() => openSprintDetails(r.user)}
                  aria-label={`View ${displayName}'s sprint`}
                  className="absolute inset-0 rounded-xl focus-visible:rounded-xl"
                />

                {/* Rank. Numerals in the display face rather than medals: the
                    podium needs three colours this system doesn't have, and on
                    day 12 of 21 second place isn't a silver-medal moment. The
                    trophy marks the lead and nothing else. */}
                <span className="pointer-events-none relative flex w-7 shrink-0 flex-col items-center gap-1 sm:w-9">
                  <span
                    className={`num font-display text-lg font-semibold leading-none ${
                      leader ? "text-warn" : "text-text-faint"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {leader && (
                    <span aria-hidden className="text-warn">
                      <Icon name="trophy" size={11} />
                    </span>
                  )}
                </span>

                {/* Turns green the day someone finishes all 21. */}
                <span
                  aria-hidden
                  className="pointer-events-none relative grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-md font-semibold text-on-fill sm:h-11 sm:w-11"
                  style={{
                    background: r.overallPct === 100 ? "var(--done)" : "var(--accent)",
                  }}
                >
                  {initial}
                </span>

                <div className="pointer-events-none relative min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-md font-semibold text-text transition-colors group-hover:text-accent sm:text-lg">
                      {displayName}
                    </span>
                    {r.user.nickname && (
                      <span className="truncate text-sm text-text-faint">
                        @{r.user.name}
                      </span>
                    )}
                    {isYou && (
                      <span className="badge text-on-fill" style={{ background: "var(--accent)" }}>
                        You
                      </span>
                    )}
                    {/* The row is a button; this is the only thing that says so. */}
                    <span
                      aria-hidden
                      className="text-text-faint transition-colors group-hover:text-accent"
                    >
                      <Icon name="chevronRight" size={13} />
                    </span>
                  </div>

                  <div className="mt-2 max-w-xl">
                    <ProgressBar
                      percent={r.overallPct}
                      size="sm"
                      showLabel
                      color={r.overallPct === 100 ? "var(--done)" : undefined}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-faint">
                    <span className="num">
                      Day {r.currentDay} of {TOTAL_DAYS}
                    </span>
                    <span aria-hidden className="h-2.5 w-px bg-border" />
                    <span>Started {formatDateShort(r.user.start_date)}</span>
                    {r.streak > 0 && (
                      <>
                        <span aria-hidden className="h-2.5 w-px bg-border" />
                        <span className="flex items-center gap-1 font-semibold text-warn">
                          <Icon name="flame" size={11} />
                          <span className="num">{r.streak}-day streak</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Today's count and the cheer — a full-width strip under the row
                    on phones, a right-hand column from `sm` up. */}
                <div className="relative flex w-full items-center justify-between gap-3 border-t border-border-soft pt-2.5 sm:w-auto sm:border-0 sm:pt-0">
                  <p className="pointer-events-none shrink-0 sm:pr-1 sm:text-right">
                    <span
                      className={`num font-display text-xl font-semibold leading-none ${
                        r.todayChecked === r.todayTotal ? "text-done" : "text-text"
                      }`}
                    >
                      {r.todayChecked}/{r.todayTotal}
                    </span>
                    <span className="mt-1 block text-xs text-text-faint">today</span>
                  </p>

                  {!isYou && (
                    <CheerButton
                      fromUserId={user.id}
                      toUserId={r.user.id}
                      toName={displayName}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── One member's whole sprint, read-only ── */}
      {inspectUser && inspectDayPlan && (
        <Modal
          isOpen
          onClose={() => setInspectUser(null)}
          size="lg"
          title={
            inspectUser.id === user.id
              ? "Your sprint"
              : `${inspectUser.nickname || inspectUser.name}'s sprint`
          }
          subtitle={
            <span className="flex items-center gap-2">
              {inspectUser.nickname && (
                <>
                  <span className="truncate">@{inspectUser.name}</span>
                  <span aria-hidden className="h-2.5 w-px shrink-0 bg-border" />
                </>
              )}
              <span className="num shrink-0">
                Day {inspectCurrentDay} of {TOTAL_DAYS}
              </span>
              <span aria-hidden className="h-2.5 w-px shrink-0 bg-border" />
              <span className="truncate">
                Started {formatDateShort(inspectUser.start_date)}
              </span>
            </span>
          }
          lead={
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-md font-semibold text-on-fill"
              style={{
                background: inspectOverallPct === 100 ? "var(--done)" : "var(--accent)",
              }}
            >
              {(inspectUser.nickname || inspectUser.name).slice(0, 1).toUpperCase()}
            </span>
          }
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="btn-ghost w-full sm:w-auto"
              >
                Back to squad
              </button>
            </div>
          }
        >

          {/* Three figures, unboxed. Inside a dialog that is itself a panel,
              wrapping each number in its own card only adds edges. */}
          <dl className="grid grid-cols-3 gap-3 border-b border-border-soft pb-4">
            <div>
              <dt className="truncate text-xs font-semibold text-text-faint">Sprint complete</dt>
              <dd className="num mt-1 font-display text-2xl font-semibold leading-none text-text">
                {inspectOverallPct}%
              </dd>
            </div>
            <div>
              <dt className="truncate text-xs font-semibold text-text-faint">
                Day {inspectSelectedDay}
              </dt>
              <dd
                className={`num mt-1 font-display text-2xl font-semibold leading-none ${
                  inspectCheckedCount === inspectTotalTasks ? "text-done" : "text-text"
                }`}
              >
                {inspectCheckedCount}/{inspectTotalTasks}
              </dd>
            </div>
            <div>
              <dt className="truncate text-xs font-semibold text-text-faint">Streak</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="num font-display text-2xl font-semibold leading-none text-text">
                  {inspectStreak}
                </span>
                <span className="text-sm font-medium text-text-faint">
                  {inspectStreak === 1 ? "day" : "days"}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="mb-2 text-sm text-text-muted">Pick a day to read.</p>
            <DayRail
              plan={inspectPlan}
              progressByDay={inspectProgressByDay}
              currentDay={inspectCurrentDay}
              selectedDay={inspectSelectedDay}
              onSelect={setInspectSelectedDay}
            />
          </div>

          {/* Day title, then the day's facts under it — same order as the
              dashboard, so the two checklists read the same way. */}
          <div className="mb-3 mt-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-xl font-semibold leading-none text-text">
                Day {inspectSelectedDay}
              </h3>
              <p className="mt-1.5 text-sm text-text-muted">
                {inspectSelectedDay === inspectCurrentDay
                  ? "Today"
                  : inspectDayPlan.weekday}
                , week {inspectDayPlan.week}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {inspectDayPlan.isSunday && (
                <span className="badge border border-border bg-surface-raised text-text-muted">
                  <Icon name="sun" size={11} />
                  Sunday schedule
                </span>
              )}
              <span
                className="badge num text-on-fill"
                style={{
                  background:
                    inspectCheckedCount === inspectTotalTasks
                      ? "var(--done)"
                      : "var(--accent)",
                }}
              >
                {inspectCheckedCount}/{inspectTotalTasks} done
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {inspectDayPlan.taskKeys.map((key) => (
              <ChecklistItem
                key={key}
                readOnly
                locked={inspectSelectedDay > inspectCurrentDay}
                label={TASK_LABELS[key]}
                description={inspectDayPlan.tasks[key] ?? ""}
                timing={inspectDayPlan.timings[key]}
                checked={Boolean(inspectSelectedRow?.[key])}
              />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
