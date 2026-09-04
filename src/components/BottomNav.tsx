"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { NAV_ITEMS } from "@/lib/nav";
import Icon from "./Icon";

/**
 * Thumb-reachable tab bar for phones. The header keeps the same destinations as
 * pills from `md` up, so this is hidden there. Height is mirrored by the
 * `--bottom-nav-h` custom property so `<main>` and the floating study timer can
 * stay clear of it.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();

  if (loading || !user) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft md:hidden"
      style={{
        background: "var(--surface-glass)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  active ? "text-accent" : "text-text-faint"
                }`}
              >
                <span
                  aria-hidden
                  className="grid h-7 w-12 place-items-center rounded-full transition-colors duration-200"
                  style={active ? { background: "var(--accent-soft)" } : undefined}
                >
                  <Icon name={item.icon} size={18} strokeWidth={active ? 2 : 1.75} />
                </span>
                <span className="text-2xs font-semibold">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
