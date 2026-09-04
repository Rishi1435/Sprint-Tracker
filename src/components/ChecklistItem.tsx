"use client";

import Icon from "./Icon";

interface Props {
  label: string;
  description: string;
  timing?: { time: string; duration: string };
  checked: boolean;
  /** Omitted by read-only rows, which have nothing to toggle. */
  onToggle?: () => void;
  disabled?: boolean;
  /** Renders the row as a `div` with no tap target — someone else's day, or your own future one. */
  readOnly?: boolean;
  /**
   * Whether the day has arrived. Defaults to `!readOnly`, since your own
   * read-only rows are the future ones; the squad view passes it explicitly
   * because there a read-only row is usually a day already lived.
   */
  locked?: boolean;
}

/**
 * One task, one tap. The work itself is the largest text in the row; the subject
 * it belongs to and the slot it occupies sit underneath in small type — you
 * scan these rows to find out *what to do*, not which bucket it came from.
 *
 * Everything inside is phrasing content (spans, not divs), because the whole row
 * is a `<button>` and a block element inside one is invalid markup.
 */
export default function ChecklistItem({
  label,
  description,
  timing,
  checked,
  onToggle,
  disabled,
  readOnly,
  locked,
}: Props) {
  const isLocked = (locked ?? Boolean(readOnly)) && !checked;

  const meta = (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`text-xs font-semibold ${
          isLocked ? "text-text-faint" : checked ? "text-done" : "text-accent"
        }`}
      >
        {label}
      </span>
      {timing && (
        <span className="flex items-center gap-1 rounded-full border border-border-soft bg-surface-raised px-1.5 py-0.5 text-2xs font-medium text-text-faint">
          <Icon name="clock" size={10} />
          <span className="num">{timing.time}</span>
          <span className="num">({timing.duration})</span>
        </span>
      )}
    </span>
  );

  if (readOnly) {
    return (
      <div
        className={`stagger-item flex w-full items-start gap-3 rounded-xl border p-3.5 text-left sm:gap-3.5 sm:p-4 ${
          checked ? "border-done/35 bg-done-soft" : "border-border-soft bg-surface"
        }`}
      >
        <span
          aria-hidden
          className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
            checked
              ? "border-done bg-done text-on-fill"
              : isLocked
                ? "border-border bg-surface-raised text-text-faint"
                : "border-border text-transparent"
          }`}
          title={isLocked ? "This day hasn't arrived yet" : undefined}
        >
          <Icon
            name={isLocked ? "lock" : "check"}
            size={isLocked ? 13 : 14}
            strokeWidth={isLocked ? 1.75 : 2.6}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block text-md leading-snug ${
              checked
                ? "text-text-muted line-through decoration-done/40 decoration-2"
                : isLocked
                  ? "text-text-muted"
                  : "text-text"
            }`}
          >
            {description}
          </span>
          {meta}
        </span>

        <span
          className={`mt-0.5 shrink-0 text-xs font-semibold ${
            checked ? "flex items-center gap-1 text-done" : "hidden font-medium text-text-faint sm:block"
          }`}
        >
          {checked ? (
            <>
              <Icon name="check" size={13} strokeWidth={2.4} />
              <span className="hidden sm:inline">Done</span>
            </>
          ) : isLocked ? (
            "Upcoming"
          ) : (
            "Not done"
          )}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={`stagger-item group flex min-h-[64px] w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 sm:gap-3.5 sm:p-4 ${
        checked
          ? "border-done/35 bg-done-soft"
          : "border-border-soft bg-surface hover:border-accent/45"
      }`}
    >
      <span
        aria-hidden
        className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors duration-200 ${
          checked
            ? "animate-check-pop border-done bg-done text-on-fill"
            : "border-border text-transparent group-hover:border-accent/60"
        }`}
      >
        <Icon name="check" size={14} strokeWidth={2.6} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-md leading-snug transition-colors ${
            checked ? "text-text-muted line-through decoration-done/40 decoration-2" : "text-text"
          }`}
        >
          {description}
        </span>
        {meta}
      </span>

      {checked ? (
        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-semibold text-done">
          <Icon name="check" size={13} strokeWidth={2.4} />
          <span className="hidden sm:inline">Done</span>
        </span>
      ) : (
        <span className="mt-0.5 hidden shrink-0 text-xs font-medium text-text-faint transition-colors group-hover:text-accent sm:block">
          Mark done
        </span>
      )}
    </button>
  );
}
