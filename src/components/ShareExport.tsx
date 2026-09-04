"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgressRow, UserRow } from "@/lib/types";
import { buildSprintSummary } from "@/lib/summary";
import { renderShareCardPng, type CardTheme } from "@/lib/shareCard";
import { buildSprintReport, reportFileName } from "@/lib/report";

interface Props {
  user: UserRow;
  rows: ProgressRow[];
}

type Busy = "card" | "pdf" | null;

/** Push a blob at the browser as a download without leaking the object URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari needs the URL to outlive the click by a tick.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Read the live theme at click time — doing it during render would mismatch SSR. */
function currentTheme(): CardTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ShareExport({ user, rows }: Props) {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const previewUrl = useRef<string | null>(null);

  // One object URL is alive at a time; revoke the old one whenever it's replaced
  // and on unmount, so a few share taps don't pin megabytes of PNG in memory.
  useEffect(() => {
    previewUrl.current = preview?.url ?? null;
  }, [preview]);
  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  const closePreview = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setNote(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, closePreview]);

  const makeCard = async () => {
    setError(null);
    setNote(null);
    setBusy("card");
    try {
      const summary = buildSprintSummary(user, rows);
      const blob = await renderShareCardPng(summary, { theme: currentTheme(), scale: 2 });
      const name = reportFileName(summary, "png");
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), blob, name };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the share card.");
    } finally {
      setBusy(null);
    }
  };

  const makePdf = () => {
    setError(null);
    setBusy("pdf");
    try {
      const summary = buildSprintSummary(user, rows);
      const doc = buildSprintReport(summary);
      saveBlob(doc.toBlob(), reportFileName(summary, "pdf"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the report.");
    } finally {
      setBusy(null);
    }
  };

  const shareCard = async () => {
    if (!preview) return;
    const file = new File([preview.blob], preview.name, { type: "image/png" });
    // `canShare` is the only reliable gate — plenty of desktop browsers expose
    // `navigator.share` but refuse file payloads.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "My Sprint Room progress",
          text: "My 21-day job-prep sprint progress.",
        });
        return;
      } catch (e) {
        // A user-cancelled share is not an error worth surfacing.
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    saveBlob(preview.blob, preview.name);
    setNote("Saved the card to your downloads — sharing isn't available in this browser.");
  };

  const copyCard = async () => {
    if (!preview) return;
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("unsupported");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": preview.blob })]);
      setNote("Card copied to your clipboard.");
    } catch {
      setNote("This browser won't allow copying images — use Download instead.");
    }
  };

  return (
    <section
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold text-text sm:text-[16px]">
            Export &amp; share
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-text-muted sm:text-[12.5px]">
            Grab a progress card for your status, or the full sprint report as a PDF.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={makeCard}
            disabled={busy !== null}
            className="btn-primary min-h-[44px] flex-1 px-4 text-[13px] disabled:opacity-60 sm:min-h-0 sm:flex-none"
          >
            {busy === "card" ? "Drawing…" : "Share card"}
          </button>
          <button
            type="button"
            onClick={makePdf}
            disabled={busy !== null}
            className="min-h-[44px] flex-1 rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-text transition-colors hover:border-accent/40 disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-2.5"
          >
            {busy === "pdf" ? "Building…" : "Download report"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-warn">
          {error}
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share your progress card"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={closePreview}
            aria-hidden="true"
          />
          <div className="glass-card relative z-10 max-h-[88dvh] w-full max-w-2xl overflow-y-auto overscroll-contain p-4 animate-fade-in-up sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-[16px] font-bold text-text sm:text-[18px]">
                  Your progress card
                </h3>
                <p className="mt-0.5 text-[12px] text-text-muted">
                  1200 × 630 PNG — sized for WhatsApp, LinkedIn and X.
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL can't go through next/image */}
            <img
              src={preview.url}
              alt="Your sprint progress card"
              width={1200}
              height={630}
              className="w-full rounded-xl border border-border"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={shareCard}
                className="btn-primary min-h-[44px] flex-1 px-4 text-[13px] sm:flex-none"
              >
                Share
              </button>
              <button
                type="button"
                onClick={() => saveBlob(preview.blob, preview.name)}
                className="min-h-[44px] flex-1 rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-text transition-colors hover:border-accent/40 sm:flex-none"
              >
                Download
              </button>
              <button
                type="button"
                onClick={copyCard}
                className="min-h-[44px] flex-1 rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-text-muted transition-colors hover:text-text sm:flex-none"
              >
                Copy
              </button>
            </div>

            {note && (
              <p role="status" className="mt-3 text-[12px] leading-snug text-text-muted">
                {note}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
