// Local notification scheduling. Uses Notification API + setTimeout to fire
// a single local reminder at a user-specified time each day. No VAPID required.

const STORAGE_KEY = "sprintroom_reminder";

export interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

const DEFAULT: ReminderSettings = { enabled: false, hour: 19, minute: 25 };

export function loadReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

export function saveReminderSettings(s: ReminderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  scheduleReminder(s);
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

let currentTimer: ReturnType<typeof setTimeout> | null = null;

function clear() {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
}

function showNotification() {
  if (!isSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification("📚 Time to study", {
      body: "Your Sprint Room study block starts in 5 minutes. Open the app and tick your first task!",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: "sprint-room-daily",
    });
    n.onclick = () => {
      window.focus();
      // A hard navigation on purpose: this fires from a Notification handler
      // that lives outside React, so there is no router to push onto. Absolute
      // URL keeps it out of Next's relative-destination lint rule.
      window.location.assign(new URL("/dashboard", window.location.origin).toString());
      n.close();
    };
  } catch {
    // ignore
  }
}

export function scheduleReminder(s: ReminderSettings) {
  clear();
  if (!s.enabled) return;
  if (!isSupported() || Notification.permission !== "granted") return;

  function scheduleNext() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(s.hour, s.minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    const ms = next.getTime() - now.getTime();
    currentTimer = setTimeout(() => {
      showNotification();
      scheduleNext();
    }, ms);
  }
  scheduleNext();
}

export function cancelReminder() {
  clear();
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
