export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Which sprint day (1..totalDays) a user is on, given the date they started. */
export function dayNumberFor(startDateISO: string, totalDays: number): number {
  const [sy, sm, sd] = startDateISO.split("-").map(Number);
  const start = new Date(sy, (sm ?? 1) - 1, sd ?? 1);
  const now = new Date();
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowMid.getTime() - start.getTime()) / 86400000);
  const day = diffDays + 1;
  return Math.min(Math.max(day, 1), totalDays);
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
