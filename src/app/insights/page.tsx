"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getProgressForUser, subscribeToAllProgress } from "@/lib/db";
import type { ProgressRow } from "@/lib/types";
import { TOTAL_DAYS, TOTAL_TASKS, buildSprintPlan } from "@/lib/plan";
import { totalCheckedForUser, overallPercent, currentStreak, completedDaysCount } from "@/lib/stats";
import Heatmap from "@/components/Heatmap";
import RadarChart from "@/components/RadarChart";
import TrendLine from "@/components/TrendLine";
import Badges from "@/components/Badges";
import ShareExport from "@/components/ShareExport";

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
        <span className="text-[14px] text-text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in sm:gap-8">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-widest text-text-faint">
          Personal Analytics
        </p>
        <h1 className="font-display text-[26px] font-bold text-text sm:text-[32px]">
          Your Sprint Insights
        </h1>
      </div>

      {/* Top stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Overall" value={`${overallPct}%`} sub={`${totalChecked} of ${TOTAL_TASKS} tasks`} icon="📊" />
        <StatTile label="Days Done" value={`${finishedDays}/${TOTAL_DAYS}`} sub="Fully completed days" icon="📅" />
        <StatTile label="Streak" value={streak > 0 ? `${streak}d` : "0d"} sub={streak > 0 ? "Keep it going!" : "Start a streak"} icon="🔥" />
        <StatTile label="Avg/day" value={finishedDays > 0 ? (totalChecked / Math.max(1, finishedDays)).toFixed(1) : "0"} sub="Tasks per active day" icon="⚡" />
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30dvh] items-center justify-center">
          <span className="text-[14px] text-text-muted">Crunching your numbers…</span>
        </div>
      ) : (
        <>
          <ShareExport user={user} rows={rows} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Heatmap plan={plan} rows={rows} />
            <RadarChart plan={plan} rows={rows} />
          </div>
          <TrendLine plan={plan} rows={rows} />
          <Badges plan={plan} rows={rows} />
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-3.5 sm:p-4"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[11px]">
          {label}
        </span>
        <span aria-hidden className="text-lg leading-none sm:text-xl">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[18px] font-bold leading-tight text-text sm:text-[22px]">{value}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-text-muted sm:text-[12px]">{sub}</p>
    </div>
  );
}
