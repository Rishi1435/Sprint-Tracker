"use client";

interface Props {
  label: string;
  description: string;
  timing?: { time: string; duration: string };
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function ChecklistItem({
  label,
  description,
  timing,
  checked,
  onToggle,
  disabled,
  readOnly,
}: Props) {
  if (readOnly) {
    return (
      <div
        className="stagger-item flex w-full items-start gap-4 rounded-xl border border-border/80 bg-surface/70 p-4 text-left opacity-85 transition-all"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* Read-Only Lock Indicator */}
        <span
          aria-hidden
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-[12px] text-text-faint"
          title="Future day task (Read-Only preview)"
        >
          🔒
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="block text-[11.5px] font-bold uppercase tracking-wider text-text-muted">
              {label}
            </span>
            {timing && (
              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10.5px] font-semibold text-text-faint flex items-center gap-1 border border-border-soft">
                <span>⏰</span>
                <span>{timing.time}</span>
                <span className="text-text-muted">({timing.duration})</span>
              </span>
            )}
          </div>

          <span className="mt-1.5 block text-[15px] leading-snug text-text">
            {description}
          </span>
        </div>

        {/* Read-only tag */}
        <span className="mt-1 shrink-0 rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text-faint border border-border-soft">
          Future Day
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={`stagger-item group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 disabled:cursor-wait disabled:opacity-60 ${
        checked
          ? "border-done/40 bg-done-soft"
          : "border-border bg-surface hover:border-accent/40 hover:scale-[1.003]"
      }`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Checkbox */}
      <span
        aria-hidden
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all duration-200 ${
          checked
            ? "animate-check-pop border-done bg-done text-white shadow-sm"
            : "border-border text-transparent group-hover:border-accent/60"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2.5 7.2L5.5 10.5L11.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`block text-[11.5px] font-bold uppercase tracking-wider ${
              checked ? "text-done" : "text-accent"
            }`}
          >
            {label}
          </span>
          {timing && (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10.5px] font-semibold text-text-faint flex items-center gap-1 border border-border-soft">
              <span>⏰</span>
              <span>{timing.time}</span>
              <span className="text-text-muted">({timing.duration})</span>
            </span>
          )}
        </div>

        <span
          className={`mt-1.5 block text-[15px] leading-snug transition-colors ${
            checked
              ? "text-text-muted line-through decoration-done/40 decoration-2"
              : "text-text"
          }`}
        >
          {description}
        </span>
      </div>

      {/* Status indicator */}
      {checked ? (
        <span className="mt-1 shrink-0 text-[12px] font-semibold text-done flex items-center gap-1">
          <span>✓</span> Done
        </span>
      ) : (
        <span className="mt-1 shrink-0 text-[11.5px] font-medium text-text-faint group-hover:text-accent transition-colors">
          Mark done →
        </span>
      )}
    </button>
  );
}
