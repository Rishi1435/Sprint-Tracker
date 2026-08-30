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
  const height = size === "md" ? "h-2.5" : "h-1.5";

  return (
    <div className="flex items-center gap-2">
      <div className={`${height} flex-1 overflow-hidden rounded-full bg-border`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out`}
          style={{
            width: `${clamped}%`,
            background: color || "var(--accent-gradient)",
          }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-muted">
          {clamped}%
        </span>
      )}
    </div>
  );
}
