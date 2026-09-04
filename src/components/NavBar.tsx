"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { NAV_ITEMS } from "@/lib/nav";
import { buildSprintPlan } from "@/lib/plan";
import Icon from "./Icon";
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
          {/* Logo — the same ticked square as the app icon and the favicon, so
              the tab, the home screen and the header all show one mark. */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg text-on-fill"
              style={{ background: "var(--accent-gradient)" }}
            >
              <Icon name="check" size={17} strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg font-semibold text-text">Sprint Room</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Navigation pills — the mobile tab bar covers these below `md` */}
            {signedIn && (
              <nav className="hidden items-center gap-1 rounded-full border border-border-soft bg-surface-raised p-1 md:flex">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-full px-4 py-1.5 text-base font-medium transition-colors duration-200 ${
                      isActive(item.href)
                        ? "bg-accent text-on-fill"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Timetable & rules */}
            {signedIn && (
              <button
                onClick={() => setScheduleOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-base font-medium text-text-muted transition-colors duration-200 hover:border-accent hover:text-text"
                title="Timetable and sprint rules"
                aria-label="Timetable and sprint rules"
              >
                <Icon name="clock" size={17} />
                <span className="hidden lg:inline">Timetable</span>
              </button>
            )}

            {/* Profile */}
            {signedIn && (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-2 text-base text-text-muted transition-colors duration-200 hover:border-accent hover:text-text sm:px-2.5"
                title="Your profile"
                aria-label="Your profile"
              >
                <span aria-hidden className="avatar h-6 w-6 text-xs">
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
