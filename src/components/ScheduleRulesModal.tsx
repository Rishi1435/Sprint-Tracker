"use client";

import { useState } from "react";
import {
  SPRINT_TIMETABLE_WEEKDAYS,
  SPRINT_TIMETABLE_SUNDAY,
  SPRINT_RULES,
} from "@/lib/plan";
import type { SprintPlan, TimetableSlot } from "@/lib/plan";
import Icon, { type IconName } from "./Icon";
import Modal from "./Modal";

interface Props {
  /** Used to name the sprint days that actually fall on a Sunday. */
  plan: SprintPlan;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "weekdays" | "sunday" | "rules";

/** Tab labels collapse to `short` on phones, where three full labels won't fit. */
const TABS: { id: TabId; icon: IconName; short: string; label: string }[] = [
  { id: "weekdays", icon: "calendar", short: "Mon–Sat", label: "Monday to Saturday" },
  { id: "sunday", icon: "sun", short: "Sunday", label: "Sunday" },
  { id: "rules", icon: "bolt", short: "Rules", label: "The five rules" },
];

/**
 * Row tint by slot kind, shared by the mobile cards and the desktop table.
 * The tint is reinforcement, not the message — every row says in words what it
 * is ("Dinner break", "Sleep"), so nothing here is carried by colour alone.
 */
function slotTone(slot: TimetableSlot, isGpp: boolean): string {
  if (isGpp) return "bg-accent-soft font-semibold text-accent";
  if (slot.type === "study") return "bg-surface";
  if (slot.type === "break") return "bg-warn-soft/40 text-warn";
  return "bg-surface-raised/50 text-text-muted";
}

/**
 * One timetable, twice: a stacked card list on phones (a three-column table at
 * 360px squeezes the activity name down to a couple of words per line) and the
 * original table from `sm` up.
 */
function Timetable({ slots, sunday }: { slots: TimetableSlot[]; sunday: boolean }) {
  const rows = slots.map((slot) => {
    const isGpp = sunday && slot.title.includes("GPP");
    return { slot, isGpp, tone: slotTone(slot, isGpp) };
  });

  return (
    <>
      {/* Mobile: one card per slot */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map(({ slot, tone }, idx) => (
          <li key={idx} className={`rounded-lg border border-border-soft p-3 ${tone}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="num text-sm font-semibold">{slot.time}</span>
              <span className="num shrink-0 text-xs font-medium text-text-muted">
                {slot.duration}
              </span>
            </div>
            <p className="mt-1 text-md font-medium text-text">{slot.title}</p>
          </li>
        ))}
      </ul>

      {/* Desktop: the full table */}
      <div className="hidden overflow-hidden rounded-lg border border-border-soft sm:block">
        <table className="w-full text-left text-md">
          <thead className="border-b border-border-soft bg-surface-raised text-xs font-semibold text-text-faint">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Time</th>
              <th className="px-4 py-2.5 font-semibold">What you&apos;re doing</th>
              <th className="px-4 py-2.5 text-right font-semibold">Length</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {rows.map(({ slot, tone }, idx) => (
              <tr key={idx} className={tone}>
                <td className="num whitespace-nowrap px-4 py-2.5 text-sm font-semibold">
                  {slot.time}
                </td>
                <td className="px-4 py-2.5 font-medium text-text">{slot.title}</td>
                <td className="num px-4 py-2.5 text-right text-sm font-medium text-text-muted">
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Timetable and rules"
      subtitle="Three weeks, the same shape every day."
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-text-faint">
            The schedule only works if it&apos;s boring. Same hours, all 21 days.
          </span>
          <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto">
            Got it
          </button>
        </div>
      }
    >
      {/* Labels shorten rather than overflow on phones. */}
      <div
        role="tablist"
        aria-label="Timetable sections"
        className="flex items-stretch gap-1 rounded-lg border border-border-soft bg-surface-raised p-1"
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
              className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Icon name={t.icon} size={13} />
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "weekdays" && (
        <div className="animate-fade-in mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-accent/30 bg-accent-soft p-3 text-md text-accent sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Icon name="clock" size={14} />
              <span className="num">7:30 PM to 11:45 PM</span>
            </span>
            <span>Seven blocks, back to back.</span>
          </div>

          <Timetable slots={SPRINT_TIMETABLE_WEEKDAYS} sunday={false} />

          <div className="card p-3.5 text-sm text-text-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-text">
              <Icon name="bolt" size={13} />
              When college runs late
            </p>
            <p className="leading-relaxed">
              If the commute eats into the 6:00–7:30 PM rest window, shrink rest first — down to
              45 minutes if you have to. Sleep and the three-and-a-half-hour study block don&apos;t
              move.
            </p>
          </div>
        </div>
      )}

      {tab === "sunday" && (
        <div className="animate-fade-in mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-done/30 bg-done-soft p-3 text-md text-done sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Icon name="sun" size={14} />
              <span className="num">9:00 AM to 1:30 PM</span>
            </span>
            <span>Then the rest of the day is yours.</span>
          </div>

          <Timetable slots={SPRINT_TIMETABLE_SUNDAY} sunday />

          <div className="card p-3.5 text-sm text-text-muted">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-text">
              <Icon name="target" size={13} />
              What to walk through each Sunday
            </p>
            <ul className="flex flex-col gap-1.5 leading-relaxed">
              <li>
                <span className="font-semibold text-text">Day {sun1}</span> — one or two GPP
                projects, out loud, end to end: the problem, the design decisions, the trade-offs.
              </li>
              <li>
                <span className="font-semibold text-text">Day {sun2}</span> — two different
                projects, and this time dwell on the hardest architectural call you made.
              </li>
              <li>
                <span className="font-semibold text-text">Day {sun3}</span> — your strongest two,
                pitched in under three minutes each.
              </li>
            </ul>
            <p className="mt-2.5 text-text-faint">
              Those are your Sundays because the sprint started on a {plan.days[0].weekday} — the
              schedule follows the real calendar week.
            </p>
          </div>
        </div>
      )}

      {/* Five rules, numbered because they genuinely are a fixed set the sprint
          refers to by number. */}
      {tab === "rules" && (
        <ol className="animate-fade-in mt-4 flex flex-col gap-2.5">
          {SPRINT_RULES.map((r) => (
            <li key={r.num} className="card flex items-start gap-3 p-3.5 sm:gap-4 sm:p-4">
              <span
                aria-hidden
                className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent"
              >
                {r.num}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-md font-semibold text-text">{r.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{r.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
