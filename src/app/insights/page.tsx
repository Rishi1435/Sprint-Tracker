"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getProgressForUser, subscribeToAllProgress } from "@/lib/db";
import type { ProgressRow } from "@/lib/types";
import { TOTAL_DAYS, TOTAL_TASKS, buildSprintPlan } from "@/lib/plan";
import { totalCheckedForUser, overallPercent, currentStreak, completedDaysCount } from "@/lib/stats";
import { dayNumberFor } from "@/lib/date";
import Heatmap from "@/components/Heatmap";
import RadarChart from "@/components/RadarChart";
import TrendLine from "@/components/TrendLine";
import Badges from "@/components/Badges";
import ShareExport from "@/components/ShareExport";
import Icon from "@/components/Icon";

export default function InsightsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/");
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getProgressForUser(user.id)
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setErrorMsg("Couldn't load your data."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAllProgress((evt) => {
      if (evt.type === "DELETE") {
        setRows((prev) => prev.filter((r) => r.id !== evt.old?.id));
        return;
      }
      const row = evt.row;
      if (!row || row.user_id !== user.id) return;
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.day_number === row.day_number);
        if (idx === -1) return [...prev, row];
        const copy = prev.slice();
        copy[idx] = row;
        return copy;
      });
    });
    return unsub;
  }, [user]);

  // Every chart below has to know which of this user's days are real Sundays
  // (8 tasks, daytime timetable), which follows from the weekday they started on.
  const plan = useMemo(() => buildSprintPlan(user?.start_date), [user?.start_date]);

  const totalChecked = useMemo(() => totalCheckedForUser(plan, rows), [plan, rows]);
  const overallPct = useMemo(() => overallPercent(plan, rows), [plan, rows]);
  const streak = useMemo(() => currentStreak(plan, rows), [plan, rows]);
  const finishedDays = useMemo(() => completedDaysCount(plan, rows), [plan, rows]);

  if (userLoading || !user) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <span className="text-md text-text-muted">Loading…</span>
      </div>
    );
  }

  const avgPerDay =
    finishedDays > 0 ? (totalChecked / Math.max(1, finishedDays)).toFixed(1) : "0";

  // Charts only ever render on the client (the page returns the loading branch
  // until `user` resolves), so reading today's date here can't desync hydration.
  const currentDay = dayNumberFor(user.start_date, TOTAL_DAYS);

  return (
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold leading-none text-text sm:text-4xl">
          Insights
        </h1>
        <p className="mt-2 max-w-[52ch] text-md text-text-muted">
          Where the {TOTAL_TASKS} tasks a night are actually going — by day, by
          subject, and over the whole sprint.
        </p>
      </div>

      {/* Same tile as the dashboard and the squad room: the icon names the metric,
          the number stays in --text, and only the icon is tinted. */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Overall",
            icon: "chart" as const,
            value: `${overallPct}%`,
            unit: "",
            sub: `${totalChecked} of ${TOTAL_TASKS} tasks`,
          },
          {
            label: "Days done",
            icon: "calendar" as const,
            value: `${finishedDays}`,
            unit: `of ${TOTAL_DAYS}`,
            sub: "Cleared end to end",
          },
          {
            label: "Streak",
            icon: "flame" as const,
            value: `${streak}`,
            unit: streak === 1 ? "day" : "days",
            sub: streak > 0 ? "Running right now" : "Nothing going yet",
          },
          {
            label: "Per active day",
            icon: "bolt" as const,
            value: avgPerDay,
            unit: "tasks",
            sub: "Averaged over days you worked",
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
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-md text-warn"
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
        <>
          <ShareExport user={user} rows={rows} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Heatmap plan={plan} rows={rows} />
            <RadarChart plan={plan} rows={rows} />
          </div>
          <TrendLine plan={plan} rows={rows} currentDay={currentDay} />
          <Badges plan={plan} rows={rows} />
        </>
      )}
    </div>
  );
}
