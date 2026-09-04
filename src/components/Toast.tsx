"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  ttl?: number; // ms
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastList({ toasts, onDismiss }: Props) {
  return (
    /* Inset from both edges on phones — anchoring only the right edge with `w-full`
       would push a 384px card off the left of a 360px screen. Sits clear of the
       sticky header, notch included. */
    <div
      className="pointer-events-none fixed left-3 right-3 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
      style={{ top: "calc(4.75rem + env(safe-area-inset-top))" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 10);
    const ttl = toast.ttl ?? 4500;
    const exit = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, ttl);
    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
    };
  }, [toast.id, toast.ttl, onDismiss]);

  return (
    <div
      className={`pointer-events-auto rounded-xl border border-border bg-surface p-3 shadow-lg transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      }`}
      style={{ boxShadow: "var(--shadow-lg)" }}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-xl leading-none">{toast.icon || "🔔"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text">{toast.title}</p>
          {toast.body && (
            <p className="mt-0.5 text-[12px] leading-snug text-text-muted">{toast.body}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="-m-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
