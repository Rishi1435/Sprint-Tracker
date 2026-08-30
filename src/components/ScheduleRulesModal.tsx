"use client";

import { useEffect, useState } from "react";
import {
  SPRINT_TIMETABLE_WEEKDAYS,
  SPRINT_TIMETABLE_SUNDAY,
  SPRINT_RULES,
} from "@/lib/plan";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleRulesModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<"weekdays" | "sunday" | "rules">("weekdays");

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="glass-card relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-soft">
          <div>
            <h2 className="font-display text-[22px] font-bold text-text flex items-center gap-2">
              <span>📅</span> Sprint Timetable & Rules
            </h2>
            <p className="text-[12.5px] text-text-muted mt-0.5">
              Strict 3-Week Job-Ready Schedule with GPP Project Walkthroughs
            </p>
          </div>

          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
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

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-2 p-1 rounded-xl bg-surface-raised border border-border-soft">
          <button
            onClick={() => setTab("weekdays")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === "weekdays"
                ? "bg-accent text-white shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            🗓️ Mon – Sat Schedule
          </button>
          <button
            onClick={() => setTab("sunday")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === "sunday"
                ? "bg-accent text-white shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            ☀️ Sunday (Study + Rest)
          </button>
          <button
            onClick={() => setTab("rules")}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === "rules"
                ? "bg-accent text-white shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            ⚡ 5 Strict Rules
          </button>
        </div>

        {/* TAB 1: Weekday Schedule */}
        {tab === "weekdays" && (
          <div className="mt-5 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between p-3 rounded-xl border border-accent/30 bg-accent-soft text-[13px] text-accent">
              <span>⏰ Daily 3h30m Study Chain (7:30 PM – 11:45 PM)</span>
              <span className="font-semibold">7 Blocks Back-to-Back</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-surface-raised text-[11px] font-bold uppercase tracking-wider text-text-faint border-b border-border-soft">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Subject / Activity</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {SPRINT_TIMETABLE_WEEKDAYS.map((slot, idx) => (
                    <tr
                      key={idx}
                      className={
                        slot.type === "study"
                          ? "bg-surface hover:bg-surface-raised/40 transition-colors"
                          : slot.type === "break"
                          ? "bg-warn-soft/40 text-warn"
                          : "bg-surface-raised/50 text-text-muted"
                      }
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-[12.5px]">
                        {slot.time}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-text">
                        {slot.type === "study" && <span className="mr-2 text-accent">●</span>}
                        {slot.type === "break" && <span className="mr-2 text-warn">🍽️</span>}
                        {slot.type === "rest" && <span className="mr-2 text-text-faint">💤</span>}
                        {slot.title}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-text-muted text-[12px]">
                        {slot.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface text-[12px] text-text-muted">
              <p className="font-semibold text-text mb-1">💡 College Timing Shifts:</p>
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
            <div className="flex items-center justify-between p-3 rounded-xl border border-done/30 bg-done-soft text-[13px] text-done">
              <span>☀️ Sunday Study Total: ~4h30m (9:00 AM – 1:30 PM)</span>
              <span className="font-semibold">1:30 PM onward: 100% Free Reset</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-surface-raised text-[11px] font-bold uppercase tracking-wider text-text-faint border-b border-border-soft">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Subject / Activity</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {SPRINT_TIMETABLE_SUNDAY.map((slot, idx) => (
                    <tr
                      key={idx}
                      className={
                        slot.title.includes("GPP")
                          ? "bg-accent-soft text-accent font-semibold"
                          : slot.type === "study"
                          ? "bg-surface hover:bg-surface-raised/40 transition-colors"
                          : slot.type === "break"
                          ? "bg-warn-soft/40 text-warn"
                          : "bg-surface-raised/50 text-text-muted"
                      }
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-[12.5px]">
                        {slot.time}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-text">
                        {slot.title.includes("GPP") && <span className="mr-2">🚀</span>}
                        {!slot.title.includes("GPP") && slot.type === "study" && (
                          <span className="mr-2 text-accent">●</span>
                        )}
                        {slot.type === "break" && <span className="mr-2 text-warn">☕</span>}
                        {slot.type === "rest" && <span className="mr-2 text-done">🌴</span>}
                        {slot.title}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-text-muted text-[12px]">
                        {slot.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface text-[12px] text-text-muted flex flex-col gap-1">
              <p className="font-semibold text-text">🚀 Sunday GPP Project Walkthrough Theme:</p>
              <p>• <strong>Week 1 (Day 7):</strong> Revise 1–2 GPP projects — full walkthrough out loud (problem, design decisions, trade-offs).</p>
              <p>• <strong>Week 2 (Day 14):</strong> Revise 1–2 different GPP projects — focus on the trickiest architectural decision.</p>
              <p>• <strong>Week 3 (Day 21):</strong> Revise your strongest 1–2 GPP projects — tighten pitch to under 3 minutes each.</p>
            </div>
          </div>
        )}

        {/* TAB 3: 5 Strict Rules */}
        {tab === "rules" && (
          <div className="mt-5 flex flex-col gap-3 animate-fade-in">
            {SPRINT_RULES.map((r) => (
              <div
                key={r.num}
                className="p-4 rounded-xl border border-border bg-surface flex items-start gap-4 transition-all hover:border-accent/40"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <span className="text-2xl mt-0.5">{r.icon}</span>
                <div className="flex-1">
                  <h4 className="text-[15px] font-bold text-text">
                    Rule {r.num}: {r.title}
                  </h4>
                  <p className="mt-1 text-[13.5px] text-text-muted leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border-soft flex justify-between items-center">
          <span className="text-[12px] text-text-faint">
            Stay consistent across all 21 days!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-[13px] px-5 py-2"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
