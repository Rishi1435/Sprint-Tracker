"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/useClientValue";
import { isSupported, requestPermission, loadReminderSettings, saveReminderSettings } from "@/lib/notifications";

const BANNER_KEY = "sprintroom_reminder_banner_dismissed";
const VISIT_KEY = "sprintroom_dashboard_visits";
const MAX_VISITS = 3;

/** Pure read — decides whether this visit should see the prompt. */
function isEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (!isSupported()) return false;
  if (Notification.permission === "denied") return false;
  if (Notification.permission === "granted" && loadReminderSettings().enabled) return false;
  try {
    if (localStorage.getItem(BANNER_KEY) === "1") return false;
    const raw = localStorage.getItem(VISIT_KEY);
    return (raw ? parseInt(raw, 10) : 0) < MAX_VISITS;
  } catch {
    return false;
  }
}

let visitCounted = false;

function countVisit() {
  if (visitCounted) return;
  visitCounted = true;
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    localStorage.setItem(VISIT_KEY, String((raw ? parseInt(raw, 10) : 0) + 1));
  } catch {
    // ignore
  }
}

/**
 * Lightweight in-app prompt for daily study reminders. Shows up on the first
 * 3 dashboard visits (unless the user has already enabled/denied notifications).
 */
export default function NotificationBanner() {
  const hydrated = useHydrated();
  const [eligible] = useState(isEligible);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    countVisit();
  }, []);

  if (!hydrated || !eligible || dismissed) return null;

  async function enable() {
    const perm = await requestPermission();
    if (perm === "granted") {
      const s = loadReminderSettings();
      saveReminderSettings({ ...s, enabled: true });
    }
    dismiss();
  }

  function dismiss() {
    try {
      localStorage.setItem(BANNER_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px] text-text flex flex-wrap items-center justify-between gap-3 animate-fade-in sm:px-4"
      role="region"
      aria-label="Enable daily study reminder"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
        <span aria-hidden className="mt-0.5 text-lg leading-none sm:mt-0">🔔</span>
        <span className="leading-snug">
          Want a friendly nudge at 7:25 PM each day to start your study block? Enable browser notifications.
        </span>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
        <button
          onClick={enable}
          className="btn-primary min-h-[40px] flex-1 px-3 py-1.5 text-[12.5px] sm:min-h-0 sm:flex-none"
        >
          Enable
        </button>
        <button
          onClick={dismiss}
          className="min-h-[40px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-text-muted hover:text-text transition-colors sm:min-h-0 sm:flex-none"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
