import Icon from "@/components/Icon";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-2 text-center">
      <span
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-raised text-text-faint"
      >
        <Icon name="cloudOff" size={26} />
      </span>
      <h1 className="font-display text-2xl font-semibold leading-tight text-text sm:text-3xl">
        You&apos;re offline
      </h1>
      <p className="max-w-[42ch] text-md leading-relaxed text-text-muted">
        Sprint Room keeps working once it&apos;s been opened online — your cached checklist is
        still here. Reconnect and tonight&apos;s ticks sync back to the squad.
      </p>
      <a href="/dashboard" className="btn-primary mt-2 min-h-[48px]">
        Back to your checklist
      </a>
    </div>
  );
}
