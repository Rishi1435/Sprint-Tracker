"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { NAV_ITEMS } from "@/lib/nav";
import { buildSprintPlan } from "@/lib/plan";
import ThemeToggle from "./ThemeToggle";
import ProfileModal from "./ProfileModal";
import ScheduleRulesModal from "./ScheduleRulesModal";

export default function NavBar() {
  const pathname = usePathname();
  const { user, loading, setSession } = useCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const plan = useMemo(() => buildSprintPlan(user?.start_date), [user?.start_date]);

  const displayName = user?.nickname || user?.name || "";
  const initial = (user?.nickname || user?.name || "?").slice(0, 1).toUpperCase();
  const signedIn = !loading && Boolean(user);

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-border-soft"
        style={{
          background: "var(--surface-glass)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-4 sm:px-8 xl:px-12 py-3">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg text-[13px] font-bold text-white transition-transform duration-300 group-hover:scale-110"
              style={{ background: "var(--accent-gradient)" }}
            >
              21
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-text sm:text-[16px]">
              Sprint Room
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Navigation pills — the mobile tab bar covers these below `md` */}
            {signedIn && (
              <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm md:flex">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? "text-white shadow-sm"
                        : "text-text-muted hover:text-text"
                    }`}
                    style={isActive(item.href) ? { background: "var(--accent-gradient)" } : {}}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Schedule & Rules Button */}
            {signedIn && (
              <button
                onClick={() => setScheduleOpen(true)}
                className="grid h-10 min-w-[40px] place-items-center rounded-full border border-border bg-surface px-2.5 text-[13px] font-semibold text-text-muted transition-all duration-200 hover:border-accent hover:text-text hover:shadow-sm md:flex md:h-auto md:items-center md:gap-1.5 md:py-1.5"
                title="View Daily Timetable & Sprint Rules"
                aria-label="View daily timetable and sprint rules"
              >
                <span aria-hidden>⏰</span>
                <span className="hidden lg:inline font-medium">Timetable &amp; Rules</span>
              </button>
            )}

            {/* Profile button */}
            {signedIn && (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex min-h-[40px] items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5 text-[13px] text-text-muted transition-all duration-200 hover:border-accent hover:text-text hover:shadow-sm sm:px-2.5"
                title="View Profile"
                aria-label="View your profile"
              >
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {initial}
                </span>
                <span className="hidden max-w-[10ch] truncate font-medium sm:inline">
                  {displayName}
                </span>
              </button>
            )}

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Schedule & Rules Modal — the timetable follows the signed-in user's
          own calendar, so which sprint days are Sundays depends on their start. */}
      <ScheduleRulesModal
        plan={plan}
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          user={user}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onUserUpdated={(updatedUser) => setSession(updatedUser)}
        />
      )}
    </>
  );
}
