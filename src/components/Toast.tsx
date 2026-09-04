"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

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
      className={`panel pointer-events-auto p-3 transition-[opacity,transform] duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
      }`}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        {/* A reaction emoji *is* the message here, so it gets a disc of its own
            instead of being repeated inside the sentence. */}
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-lg leading-none"
        >
          {toast.icon ? toast.icon : <Icon name="bell" size={15} className="text-accent" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-text">{toast.title}</p>
          {toast.body && (
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{toast.body}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
          aria-label="Dismiss"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}
