"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/useClientValue";
import {
  loadReminderSettings,
  saveReminderSettings,
  isSupported,
  requestPermission,
  scheduleReminder,
  type ReminderSettings,
} from "@/lib/notifications";

export default function NotificationOptIn() {
  const hydrated = useHydrated();
  // Lazy initialisers read localStorage / Notification.permission on the client
  // only. The component renders nothing until `hydrated` flips, so the server
  // markup and the hydration pass still agree.
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    isSupported() ? Notification.permission : "unsupported"
  );

  // Re-arm the daily timer for this tab when the page loads.
  useEffect(() => {
    if (!isSupported()) return;
    const saved = loadReminderSettings();
    if (saved.enabled && Notification.permission === "granted") {
      scheduleReminder(saved);
    }
  }, []);

  if (!hydrated) return null;

  async function handleToggle() {
    if (!isSupported()) return;
    if (!settings.enabled) {
      // Turning on: ask for permission if needed
      let p = Notification.permission;
      if (p === "default") p = await requestPermission();
      setPerm(p);
      if (p !== "granted") return;
      const next = { ...settings, enabled: true };
      setSettings(next);
      saveReminderSettings(next);
    } else {
      // Turning off
      const next = { ...settings, enabled: false };
      setSettings(next);
      saveReminderSettings(next);
    }
  }

  function handleTimeChange(hour: number, minute: number) {
    const next = { enabled: settings.enabled, hour, minute };
    setSettings(next);
    saveReminderSettings(next);
  }

  if (perm === "unsupported") {
    return (
      <div className="mt-5 rounded-xl border border-border bg-surface p-3.5 sm:p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl leading-none">🔕</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text">Notifications not supported</p>
            <p className="mt-0.5 text-[12px] text-text-muted">Your browser doesn&apos;t support the Notification API.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-3.5 sm:p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl leading-none">🔔</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-text">Daily study reminder</p>
              <p className="mt-0.5 text-[12px] leading-snug text-text-muted">
                Nudge yourself to start tomorrow&apos;s block.
              </p>
            </div>
            {/* Negative margin + padding grows the hit area to ~40px without
                changing the size of the track itself. */}
            <button
              type="button"
              onClick={handleToggle}
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Daily study reminder"
              className="-m-2 grid shrink-0 place-items-center p-2"
            >
              <span
                aria-hidden
                className={`relative block h-6 w-11 rounded-full transition-colors ${
                  settings.enabled ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    settings.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          {settings.enabled && perm === "granted" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="reminder-hour" className="text-[12px] text-text-muted">
                Time
              </label>
              <select
                id="reminder-hour"
                value={settings.hour}
                onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), settings.minute)}
                className="min-h-[40px] rounded-md border border-border bg-surface px-2 py-1 text-[13px] text-text sm:min-h-0"
                aria-label="Reminder hour"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span aria-hidden className="text-text-faint">:</span>
              <select
                value={settings.minute}
                onChange={(e) => handleTimeChange(settings.hour, parseInt(e.target.value, 10))}
                className="min-h-[40px] rounded-md border border-border bg-surface px-2 py-1 text-[13px] text-text sm:min-h-0"
                aria-label="Reminder minute"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {m.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="w-full text-[11px] text-text-faint sm:ml-auto sm:w-auto">
                Fires daily at this local time.
              </span>
            </div>
          )}

          {perm === "denied" && (
            <p className="mt-2 text-[12px] leading-snug text-warn">
              Browser notifications are blocked. Enable them in your browser settings to allow reminders.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
