"use client";

import { useEffect, useState } from "react";
import {
  SPRINT_TIMETABLE_WEEKDAYS,
  SPRINT_TIMETABLE_SUNDAY,
  SPRINT_RULES,
} from "@/lib/plan";
import type { SprintPlan, TimetableSlot } from "@/lib/plan";

interface Props {
  /** Used to name the sprint days that actually fall on a Sunday. */
  plan: SprintPlan;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "weekdays" | "sunday" | "rules";

/** Tab labels collapse to `short` on phones, where three full labels won't fit. */
const TABS: { id: TabId; icon: string; short: string; label: string }[] = [
  { id: "weekdays", icon: "🗓️", short: "Mon–Sat", label: "Mon – Sat Schedule" },
  { id: "sunday", icon: "☀️", short: "Sunday", label: "Sunday (Study + Rest)" },
  { id: "rules", icon: "⚡", short: "Rules", label: "5 Strict Rules" },
];

/** Row tint by slot kind, shared by the mobile cards and the desktop table. */
function slotTone(slot: TimetableSlot, isGpp: boolean): string {
  if (isGpp) return "bg-accent-soft text-accent font-semibold";
  if (slot.type === "study") return "bg-surface transition-colors hover:bg-surface-raised/40";
  if (slot.type === "break") return "bg-warn-soft/40 text-warn";
  return "bg-surface-raised/50 text-text-muted";
}

function slotMarker(slot: TimetableSlot, sunday: boolean, isGpp: boolean) {
  if (isGpp) return { glyph: "🚀", className: "" };
  if (slot.type === "study") return { glyph: "●", className: "text-accent" };
  if (slot.type === "break") return { glyph: sunday ? "☕" : "🍽️", className: "text-warn" };
  return { glyph: sunday ? "🌴" : "💤", className: sunday ? "text-done" : "text-text-faint" };
}

/**
 * One timetable, twice: a stacked card list on phones (a three-column table at
 * 360px squeezes the activity name down to a couple of words per line) and the
 * original table from `sm` up.
 */
function Timetable({ slots, sunday }: { slots: TimetableSlot[]; sunday: boolean }) {
  const rows = slots.map((slot) => {
    const isGpp = sunday && slot.title.includes("GPP");
    return { slot, isGpp, tone: slotTone(slot, isGpp), marker: slotMarker(slot, sunday, isGpp) };
  });

  return (
    <>
      {/* Mobile: one card per slot */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map(({ slot, tone, marker }, idx) => (
          <li key={idx} className={`rounded-xl border border-border p-3 ${tone}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[12px] font-semibold">{slot.time}</span>
              <span className="shrink-0 text-[11.5px] font-medium text-text-muted">
                {slot.duration}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] font-medium text-text">
              <span aria-hidden className={`mr-1.5 ${marker.className}`}>
                {marker.glyph}
              </span>
              {slot.title}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop: the full table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface sm:block">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b border-border-soft bg-surface-raised text-[11px] font-bold uppercase tracking-wider text-text-faint">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Subject / Activity</th>
              <th className="px-4 py-3 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {rows.map(({ slot, tone, marker }, idx) => (
              <tr key={idx} className={tone}>
                <td className="px-4 py-2.5 font-mono text-[12.5px] font-semibold">{slot.time}</td>
                <td className="px-4 py-2.5 font-medium text-text">
                  <span aria-hidden className={`mr-2 ${marker.className}`}>
                    {marker.glyph}
                  </span>
                  {slot.title}
                </td>
                <td className="px-4 py-2.5 text-right text-[12px] font-medium text-text-muted">
                  {slot.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ScheduleRulesModal({ plan, isOpen, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("weekdays");
  const [sun1, sun2, sun3] = plan.sundayDays;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sprint timetable and rules"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="glass-card relative z-10 max-h-[90dvh] w-full max-w-3xl overflow-y-auto p-4 animate-fade-in-up sm:p-6"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-soft pb-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-[18px] font-bold text-text sm:text-[22px]">
              <span aria-hidden>📅</span> Sprint Timetable &amp; Rules
            </h2>
            <p className="mt-0.5 text-[12px] text-text-muted sm:text-[12.5px]">
              Strict 3-Week Job-Ready Schedule with GPP Project Walkthroughs
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
            aria-label="Close modal"
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

        {/* Tab Navigation — labels shorten rather than overflow on phones */}
        <div
          role="tablist"
          aria-label="Timetable sections"
          className="mt-4 flex items-stretch gap-1 rounded-xl border border-border-soft bg-surface-raised p-1 sm:gap-2"
        >
          {TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={`min-h-[40px] flex-1 rounded-lg px-1.5 text-[12px] font-semibold transition-all sm:text-[13px] ${
                  selected ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text"
                }`}
              >
                <span aria-hidden>{t.icon}</span>{" "}
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Weekday Schedule */}
        {tab === "weekdays" && (
          <div className="mt-5 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-1 rounded-xl border border-accent/30 bg-accent-soft p-3 text-[12.5px] text-accent sm:flex-row sm:items-center sm:justify-between sm:text-[13px]">
              <span>⏰ Daily 3h30m Study Chain (7:30 PM – 11:45 PM)</span>
              <span className="font-semibold">7 Blocks Back-to-Back</span>
            </div>

            <Timetable slots={SPRINT_TIMETABLE_WEEKDAYS} sunday={false} />

            <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-text-muted">
              <p className="mb-1 font-semibold text-text">💡 College Timing Shifts:</p>
              <p>
                If travel/commute eats into the 6:00–7:30 PM rest window on some days, shrink rest first (to 45–60 min).
                <strong> Never shrink sleep or the 3h30m study block.</strong>
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Sunday Schedule */}
        {tab === "sunday" && (
          <div className="mt-5 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-1 rounded-xl border border-done/30 bg-done-soft p-3 text-[12.5px] text-done sm:flex-row sm:items-center sm:justify-between sm:text-[13px]">
              <span>☀️ Sunday Study Total: ~4h30m (9:00 AM – 1:30 PM)</span>
              <span className="font-semibold">1:30 PM onward: 100% Free Reset</span>
            </div>

            <Timetable slots={SPRINT_TIMETABLE_SUNDAY} sunday />

            <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3.5 text-[12px] text-text-muted">
              <p className="font-semibold text-text">🚀 Sunday GPP Project Walkthrough Theme:</p>
              <p>• <strong>Week 1 (Day {sun1}):</strong> Revise 1–2 GPP projects — full walkthrough out loud (problem, design decisions, trade-offs).</p>
              <p>• <strong>Week 2 (Day {sun2}):</strong> Revise 1–2 different GPP projects — focus on the trickiest architectural decision.</p>
              <p>• <strong>Week 3 (Day {sun3}):</strong> Revise your strongest 1–2 GPP projects — tighten pitch to under 3 minutes each.</p>
              <p className="mt-1 text-text-faint">
                Those are your Sundays because your sprint started on a{" "}
                {plan.days[0].weekday} — this schedule always follows the real calendar week.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: 5 Strict Rules */}
        {tab === "rules" && (
          <div className="mt-5 flex flex-col gap-3 animate-fade-in">
            {SPRINT_RULES.map((r) => (
              <div
                key={r.num}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-accent/40 sm:gap-4 sm:p-4"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <span aria-hidden className="mt-0.5 text-xl leading-none sm:text-2xl">
                  {r.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14.5px] font-bold text-text sm:text-[15px]">
                    Rule {r.num}: {r.title}
                  </h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-muted sm:text-[13.5px]">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12px] text-text-faint">
            Stay consistent across all 21 days!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full text-[13px] sm:w-auto"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
