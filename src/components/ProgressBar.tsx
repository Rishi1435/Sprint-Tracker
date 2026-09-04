interface Props {
  percent: number;
  color?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function ProgressBar({
  percent,
  color,
  size = "sm",
  showLabel = false,
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const height = size === "md" ? "h-2" : "h-1.5";

  return (
    <div className="flex items-center gap-2">
      <div className={`${height} flex-1 overflow-hidden rounded-full bg-border`}>
        <div
          className={`${height} rounded-full transition-[width] duration-500 ease-out`}
          style={{
            // A sliver of fill for any non-zero progress. At 1% of a narrow bar
            // the rounded ends would otherwise cancel each other out and the
            // first tick of the day would look like it did nothing.
            width: clamped > 0 ? `max(${clamped}%, 0.5rem)` : "0%",
            background: color || "var(--accent-gradient)",
          }}
        />
      </div>
      {showLabel && (
        <span className="num shrink-0 text-xs font-semibold text-text-muted">{clamped}%</span>
      )}
    </div>
  );
}
