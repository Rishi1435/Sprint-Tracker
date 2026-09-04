"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** One line under the title, in muted type. Skip it rather than pad it. */
  subtitle?: ReactNode;
  /** Sits left of the title — an avatar or a status disc. */
  lead?: ReactNode;
  /** Pinned below the scroll area, on its own hairline. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const WIDTHS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
} as const;

/**
 * Every dialog in the app. Escape closes it, the scrim closes it, the page
 * behind stops scrolling while it's open, and focus goes to the panel and comes
 * back to whatever opened it — behaviour that was previously reimplemented, and
 * half-implemented, per modal.
 *
 * The header and footer are fixed; only the middle scrolls. On a phone the panel
 * is a bottom sheet, because a centred dialog on a 375px screen is all margin.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  lead,
  footer,
  size = "md",
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement as HTMLElement | null;
    // Focusing the panel itself, rather than the first control, means Escape and
    // the scroll keys work immediately without landing the user on "Close".
    panelRef.current?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-scrim"
      // A press that starts on the panel and drifts onto the scrim shouldn't
      // close anything, so this checks the target is the scrim itself.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-panel outline-none ${WIDTHS[size]}`}
      >
        <div className="flex items-start gap-3 border-b border-border-soft px-4 py-3.5 sm:px-5 sm:py-4">
          {lead}
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="truncate font-display text-lg font-semibold leading-tight text-text"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-border-soft px-4 py-3 sm:px-5">{footer}</div>
        )}
      </div>
    </div>
  );
}
