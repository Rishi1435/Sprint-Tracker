"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgressRow, UserRow } from "@/lib/types";
import { buildSprintSummary } from "@/lib/summary";
import { renderShareCardPng, type CardTheme } from "@/lib/shareCard";
import { buildSprintReport, reportFileName } from "@/lib/report";
import Icon from "./Icon";
import Modal from "./Modal";

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
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight text-text">
            Export and share
          </h2>
          <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-text-muted">
            A progress card for your status, or the whole sprint as a PDF.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={makeCard}
            disabled={busy !== null}
            className="btn-primary min-h-[44px] flex-1 sm:min-h-0 sm:flex-none"
          >
            <Icon name="share" size={14} />
            {busy === "card" ? "Drawing…" : "Share card"}
          </button>
          <button
            type="button"
            onClick={makePdf}
            disabled={busy !== null}
            className="btn-ghost min-h-[44px] flex-1 text-text sm:min-h-0 sm:flex-none"
          >
            <Icon name="download" size={14} />
            {busy === "pdf" ? "Building…" : "Download report"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-warn">
          <Icon name="cloudOff" size={14} />
          {error}
        </p>
      )}

      {preview && (
        <Modal
          isOpen
          onClose={closePreview}
          size="lg"
          title="Your progress card"
          footer={
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={shareCard}
                  className="btn-primary min-h-[44px] flex-1 sm:flex-none"
                >
                  <Icon name="share" size={14} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => saveBlob(preview.blob, preview.name)}
                  className="btn-ghost min-h-[44px] flex-1 text-text sm:flex-none"
                >
                  <Icon name="download" size={14} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={copyCard}
                  className="btn-ghost min-h-[44px] flex-1 sm:flex-none"
                >
                  Copy
                </button>
              </div>
              {note && (
                <p role="status" className="text-sm leading-relaxed text-text-muted">
                  {note}
                </p>
              )}
            </div>
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL can't go through next/image */}
          <img
            src={preview.url}
            alt="Your sprint progress card"
            width={1200}
            height={630}
            className="w-full rounded-xl border border-border-soft"
          />
          <p className="mt-2.5 text-sm text-text-faint">
            1200 × 630 PNG, sized for WhatsApp, LinkedIn and X.
          </p>
        </Modal>
      )}
    </section>
  );
}
