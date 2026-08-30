"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import ThemeToggle from "./ThemeToggle";
import ProfileModal from "./ProfileModal";
import ScheduleRulesModal from "./ScheduleRulesModal";

export default function NavBar() {
  const pathname = usePathname();
  const { user, loading, setSession } = useCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const displayName = user?.nickname || user?.name || "";
  const initial = (user?.nickname || user?.name || "?").slice(0, 1).toUpperCase();

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-border-soft"
        style={{
          background: "var(--surface-glass)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 sm:px-8 xl:px-12 py-3.5">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg text-[13px] font-bold text-white transition-transform duration-300 group-hover:scale-110"
              style={{ background: "var(--accent-gradient)" }}
            >
              21
            </span>
            <span className="font-display text-[16px] font-semibold tracking-tight text-text">
              Sprint Room
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            {/* Navigation pills */}
            {!loading && user && (
              <nav className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm">
                <Link
                  href="/dashboard"
                  className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive("/dashboard")
                      ? "text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                  style={isActive("/dashboard") ? { background: "var(--accent-gradient)" } : {}}
                >
                  My Plan
                </Link>
                <Link
                  href="/squad"
                  className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive("/squad")
                      ? "text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                  style={isActive("/squad") ? { background: "var(--accent-gradient)" } : {}}
                >
                  Squad
                </Link>
              </nav>
            )}

            {/* Schedule & Rules Button */}
            {!loading && user && (
              <button
                onClick={() => setScheduleOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-text-muted transition-all duration-200 hover:border-accent hover:text-text hover:shadow-sm"
                title="View Daily Timetable & Sprint Rules"
              >
                <span>⏰</span>
                <span className="hidden md:inline font-medium">Timetable & Rules</span>
              </button>
            )}

            {/* Profile button */}
            {!loading && user && (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text-muted transition-all duration-200 hover:border-accent hover:text-text hover:shadow-sm"
                title="View Profile"
              >
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {initial}
                </span>
                <span className="hidden sm:inline font-medium">{displayName}</span>
              </button>
            )}

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Schedule & Rules Modal */}
      <ScheduleRulesModal
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
