"use client";

import { buildAllFixPrompts } from "@/lib/fix-prompts";
import type { CommercePlatform, Finding } from "@/lib/types";
import { CopyToast, useCopyToast } from "@/components/copy-toast";
import { useEffect, useRef } from "react";

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function ImproveScoreModal({
  open,
  onClose,
  findings,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  findings: Finding[];
  platform: CommercePlatform;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { toastMessage, clearToast, copyWithToast } = useCopyToast();
  const issueCount = findings.length;
  const allPrompts = buildAllFixPrompts(findings, platform);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="improve-score-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <div className="border-b border-card-border bg-card-muted px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="improve-score-title" className="text-xl font-semibold text-text-primary">
                How to improve your score
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Copy the instructions below and paste them into your AI coding assistant (Cursor,
                Claude Code, Windsurf, Copilot, etc.) to address the gaps identified in this scan.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-card-border px-2 py-1 text-sm text-text-secondary hover:bg-card"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <pre className="whitespace-pre-wrap rounded-xl border border-card-border bg-card-muted p-4 font-mono text-sm leading-7 text-text-primary">
            {allPrompts}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={() => void copyWithToast(allPrompts, "All fix prompts copied.")}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <CopyIcon />
            Copy all instructions
          </button>
          <p className="text-sm text-text-secondary">
            {issueCount} issue{issueCount === 1 ? "" : "s"} found
          </p>
        </div>
      </div>

      {toastMessage ? <CopyToast message={toastMessage} onDone={clearToast} /> : null}
    </div>
  );
}

function CountBadge({ count, tone }: { count: number; tone: "blue" | "violet" }) {
  const classes =
    tone === "violet"
      ? "bg-violet-200/90 text-violet-900 dark:bg-violet-800/80 dark:text-violet-100"
      : "bg-blue-200/90 text-blue-900 dark:bg-blue-800/80 dark:text-blue-100";

  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${classes}`}
    >
      {count}
    </span>
  );
}

export function ImproveScoreButton({
  issueCount,
  onClick,
  size = "default",
}: {
  issueCount: number;
  onClick: () => void;
  size?: "default" | "sm";
}) {
  const classes =
    size === "sm"
      ? "inline-flex shrink-0 items-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950/70"
      : "inline-flex shrink-0 items-center rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600";

  return (
    <button type="button" onClick={onClick} className={`${classes} gap-2`}>
      <span>Improve the score</span>
      <CountBadge count={issueCount} tone="blue" />
    </button>
  );
}

export function DownloadAssetsButton({
  assetCount,
  href,
  size = "default",
}: {
  assetCount: number;
  href: string;
  size?: "default" | "sm";
}) {
  const classes =
    size === "sm"
      ? "inline-flex shrink-0 items-center rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950/70"
      : "inline-flex shrink-0 items-center rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950/70";

  return (
    <a href={href} className={`${classes} gap-2`}>
      <span>Download assets</span>
      <CountBadge count={assetCount} tone="violet" />
    </a>
  );
}
