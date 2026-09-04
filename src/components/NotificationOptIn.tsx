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
import Icon from "./Icon";

/**
 * A settings row inside the profile dialog, so it takes that dialog's structure
 * — a section heading over one inset block — rather than bringing a card of its
 * own to sit inside another card.
 */
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
      <div className="flex items-center gap-2.5 rounded-xl border border-border-soft bg-surface-raised px-3.5 py-3">
        <Icon name="bellOff" size={15} className="shrink-0 text-text-faint" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text">Reminders aren&apos;t available</p>
          <p className="mt-0.5 text-xs text-text-muted">
            This browser doesn&apos;t support notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-muted">Daily reminder</h3>

      <div className="rounded-xl border border-border-soft bg-surface-raised p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-text">Nudge me every night</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
              One notification, at a time you pick.
            </p>
          </div>

          {/* Negative margin + padding grows the hit area to ~44px without
              changing the size of the track itself. */}
          <button
            type="button"
            onClick={handleToggle}
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Daily reminder"
            className="-m-2 grid shrink-0 place-items-center p-2"
          >
            {/* The knob is a flex item, not absolutely positioned: a button
                inherits `text-align: center`, which centres the static
                position of an `absolute` child with no `left` — that offset
                plus the translate pushed the knob off the end of the track.
                Flex also centres it vertically, so both states sit in a
                uniform 4px ring. */}
            <span
              aria-hidden
              className={`flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                settings.enabled ? "bg-accent" : "bg-border"
              }`}
            >
              {/* Both knob colours are chosen against their own track rather
                  than fixed to white: on the pale dark-mode accent a white knob
                  disappears, and dark `--border` is *lighter* than the surface
                  it sits on, so the off state needs a knob lighter still. */}
              <span
                className={`h-5 w-5 shrink-0 rounded-full transition-[transform,background-color] duration-200 ${
                  settings.enabled ? "translate-x-6 bg-on-fill" : "translate-x-1 bg-text-faint"
                }`}
              />
            </span>
          </button>
        </div>

        {settings.enabled && perm === "granted" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
            <label htmlFor="reminder-hour" className="text-sm text-text-muted">
              Remind me at
            </label>
            <select
              id="reminder-hour"
              value={settings.hour}
              onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), settings.minute)}
              className="num min-h-[40px] rounded-md border border-border bg-surface px-2 py-1 text-base text-text sm:min-h-0"
              aria-label="Reminder hour"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span aria-hidden className="text-text-faint">
              :
            </span>
            <select
              value={settings.minute}
              onChange={(e) => handleTimeChange(settings.hour, parseInt(e.target.value, 10))}
              className="num min-h-[40px] rounded-md border border-border bg-surface px-2 py-1 text-base text-text sm:min-h-0"
              aria-label="Reminder minute"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="w-full text-xs text-text-faint sm:ml-auto sm:w-auto">
              Repeats daily, in this device&apos;s time zone.
            </span>
          </div>
        )}

        {perm === "denied" && (
          <p className="mt-3 flex items-start gap-1.5 border-t border-border-soft pt-3 text-xs leading-relaxed text-warn">
            <Icon name="bellOff" size={13} className="mt-0.5 shrink-0" />
            Notifications are blocked for this site. Turn them back on in your browser settings.
          </p>
        )}
      </div>
    </div>
  );
}
