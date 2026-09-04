export default function OfflinePage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-2 text-center">
      <span aria-hidden className="text-5xl">📡</span>
      <h1 className="font-display text-[24px] font-bold text-text sm:text-[28px]">
        You&apos;re offline
      </h1>
      <p className="max-w-sm text-[13.5px] leading-relaxed text-text-muted sm:text-[14px]">
        Sprint Room works offline once it&apos;s been opened online. Your cached checklist is still
        here — connect to the internet to sync new progress with your squad.
      </p>
      <a
        href="/dashboard"
        className="btn-primary mt-2 inline-flex min-h-[48px] items-center text-[13px]"
      >
        Open Dashboard
      </a>
    </div>
  );
}
