"use client";

import {
  readTelemetrySuppression,
  subscribeTelemetrySuppression,
  TELEMETRY_DIRECTIVE_PARAM,
  TELEMETRY_DIRECTIVE_RESUME,
  TELEMETRY_DIRECTIVE_SUPPRESS,
} from "@/lib/telemetry-context";
import { DomainReviewQueueSection } from "@/components/domain-review-queue-section";
import { StorefrontReviewRequestsSection } from "@/components/storefront-review-requests-section";
import type { DomainReviewRecord, DomainReviewType } from "@/lib/domain-review-types";
import type {
  StorefrontReviewRequest,
  StorefrontReviewRequestStatus,
} from "@/lib/storefront-review-types";
import {
  trackDomainReviewCreated,
  trackDomainReviewReclassified,
  trackDomainReviewUpdated,
  trackDomainReviewWhitelisted,
  trackStorefrontReviewCompleted,
} from "@/lib/analytics-events";
import {
  adminBodyClass,
  adminCodeClass,
  adminHeadingClass,
  adminInputClass,
  adminLabelClass,
  adminNestedPanelClass,
  adminSecondaryButtonClass,
  adminSectionClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeaderCellClass,
  adminTableRowClass,
  adminTableWrapClass,
  adminTextareaClass,
  adminTextareaMonoClass,
} from "@/lib/admin-theme-classes";
import { cardSurfaceClass, textPrimaryClass, textSecondaryClass } from "@/lib/theme-classes";
import { useCallback, useEffect, useState } from "react";

const ADMIN_TOKEN_SESSION_KEY = "aco-admin-token";

function readStoredAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY)?.trim() ?? "";
}

function storeAdminToken(value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, trimmed);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  }
}

function adminHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.trim()}`,
  };
}

async function verifyAdminToken(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();

  if (!trimmed) {
    return { ok: false, error: "Token is required." };
  }

  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: adminHeaders(trimmed),
    body: JSON.stringify({ token: trimmed }),
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return {
      ok: false,
      error:
        data.error ??
        (response.status === 503
          ? "Admin token is not configured on the server."
          : "Unauthorized. Token does not match server ADMIN_RESET_TOKEN."),
    };
  }

  return { ok: true };
}

function StatusMessage({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error" | "info";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100"
      : tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-100"
        : "border-card-border bg-card-muted text-text-secondary";

  return (
    <pre className={`mt-4 overflow-x-auto rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap ${classes}`}>
      {message}
    </pre>
  );
}

export default function AdminClient() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [checkingStoredToken, setCheckingStoredToken] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [deleteDomain, setDeleteDomain] = useState("");
  const [domainReviewDomains, setDomainReviewDomains] = useState<DomainReviewRecord[]>([]);
  const [domainReviewSearch, setDomainReviewSearch] = useState("");
  const [domainReviewAddDomain, setDomainReviewAddDomain] = useState("");
  const [loadingDomainReview, setLoadingDomainReview] = useState(false);
  const [storefrontReviewRequests, setStorefrontReviewRequests] = useState<
    StorefrontReviewRequest[]
  >([]);
  const [storefrontReviewSearch, setStorefrontReviewSearch] = useState("");
  const [loadingStorefrontReview, setLoadingStorefrontReview] = useState(false);
  const [contributorsIntro, setContributorsIntro] = useState("");
  const [contributorsText, setContributorsText] = useState("");
  const [subscriberEmails, setSubscriberEmails] = useState<string[]>([]);
  const [platformFeedback, setPlatformFeedback] = useState<
    Array<{
      domain: string;
      platform: string | null;
      comments: string | null;
      timestamp: string;
    }>
  >([]);
  const [reclassifyDomain, setReclassifyDomain] = useState("");
  const [reclassifyPlatform, setReclassifyPlatform] = useState("Magento");
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [founderModeActive, setFounderModeActive] = useState(false);
  const [founderModeExampleOrigin, setFounderModeExampleOrigin] = useState("");

  const buildFounderModeUrl = useCallback((directive: string) => {
    const origin = founderModeExampleOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    if (!origin) {
      return `/?${TELEMETRY_DIRECTIVE_PARAM}=${directive}`;
    }

    const url = new URL(origin);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    url.searchParams.set(TELEMETRY_DIRECTIVE_PARAM, directive);
    return url.href;
  }, [founderModeExampleOrigin]);

  const clearToken = useCallback(() => {
    setToken("");
    setTokenInput("");
    storeAdminToken("");
    setStatus(null);
  }, []);

  const loadDomainReviewQueue = useCallback(async (adminToken: string, search?: string) => {
    setLoadingDomainReview(true);
    setStatus(null);

    try {
      const trimmed = adminToken.trim();
      const query = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(
        `/api/admin/domain-review?token=${encodeURIComponent(trimmed)}${query}`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as {
        domains?: DomainReviewRecord[];
        error?: string;
        redisConfigured?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load Domain Review Queue");
      }

      setDomainReviewDomains(data.domains ?? []);

      if (!data.redisConfigured) {
        setStatus({
          tone: "info",
          message: "Redis is not configured. Domain Review Queue requires Redis.",
        });
      }
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load Domain Review Queue",
      });
    } finally {
      setLoadingDomainReview(false);
    }
  }, []);

  async function handleDomainReviewAction(
    action: "add" | "remove" | "block_scans" | "allow_scans" | "notes" | "reclassify",
    domain: string,
    extra?: { notes?: string | null; type?: DomainReviewType },
  ) {
    if (!token) {
      return;
    }

    const apiAction =
      action === "allow_scans"
        ? "allow_scans"
        : action === "block_scans"
          ? "block_scans"
          : action;

    const silent = action === "notes" || action === "reclassify";
    if (!silent) {
      setBusy(`review-${domain}-${action}`);
    }
    setStatus(null);

    try {
      const response = await fetch("/api/admin/domain-review", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({
          token,
          action: apiAction,
          domain,
          notes: extra?.notes ?? null,
          type: extra?.type,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        domain?: DomainReviewRecord;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Action failed");
      }

      if (data.domain) {
        const analyticsContext = {
          domain: data.domain.domain,
          reviewType: data.domain.type,
          reviewStatus: data.domain.status,
        };

        switch (action) {
          case "add":
            trackDomainReviewCreated(analyticsContext);
            break;
          case "allow_scans":
            trackDomainReviewWhitelisted(analyticsContext);
            break;
          case "reclassify":
            trackDomainReviewReclassified(analyticsContext);
            break;
          case "remove":
            break;
          default:
            trackDomainReviewUpdated(analyticsContext);
        }
      }

      await loadDomainReviewQueue(token, domainReviewSearch);
      if (!silent) {
        setStatus({ tone: "success", message: `Updated ${domain}.` });
      }
    } catch (actionError) {
      setStatus({
        tone: "error",
        message:
          actionError instanceof Error ? actionError.message : "Action failed unexpectedly",
      });
    } finally {
      if (!silent) {
        setBusy(null);
      }
    }
  }

  const loadStorefrontReviewRequests = useCallback(async (adminToken: string, search?: string) => {
    setLoadingStorefrontReview(true);
    setStatus(null);

    try {
      const trimmed = adminToken.trim();
      const query = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(
        `/api/admin/storefront-review?token=${encodeURIComponent(trimmed)}${query}`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as {
        requests?: StorefrontReviewRequest[];
        error?: string;
        redisConfigured?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load Storefront Review Requests");
      }

      setStorefrontReviewRequests(data.requests ?? []);

      if (!data.redisConfigured) {
        setStatus({
          tone: "info",
          message: "Redis is not configured. Storefront Review Requests require Redis.",
        });
      }
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load Storefront Review Requests",
      });
    } finally {
      setLoadingStorefrontReview(false);
    }
  }, []);

  async function handleStorefrontReviewAction(
    action: "status" | "notes" | "mark_supported" | "mark_not_supported" | "close",
    id: string,
    extra?: { status?: StorefrontReviewRequestStatus; reviewNotes?: string | null },
  ) {
    if (!token) {
      return;
    }

    const silent = action === "notes";
    if (!silent) {
      setBusy(id);
    }
    setStatus(null);

    try {
      const response = await fetch("/api/admin/storefront-review", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({
          token,
          action,
          id,
          status: extra?.status,
          reviewNotes: extra?.reviewNotes ?? null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        request?: StorefrontReviewRequest;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Action failed");
      }

      if (
        data.request &&
        (action === "mark_supported" ||
          action === "mark_not_supported" ||
          action === "close" ||
          (action === "status" &&
            (extra?.status === "SUPPORTED" ||
              extra?.status === "NOT_SUPPORTED" ||
              extra?.status === "CLOSED")))
      ) {
        trackStorefrontReviewCompleted({
          domain: data.request.normalizedDomain,
          failureType: data.request.failureType,
          relationship: data.request.relationship,
          status: data.request.status,
        });
      }

      await loadStorefrontReviewRequests(token, storefrontReviewSearch);
      if (!silent) {
        setStatus({ tone: "success", message: "Updated storefront review request." });
      }
    } catch (actionError) {
      setStatus({
        tone: "error",
        message:
          actionError instanceof Error ? actionError.message : "Action failed unexpectedly",
      });
    } finally {
      if (!silent) {
        setBusy(null);
      }
    }
  }

  const loadContributors = useCallback(async (adminToken: string) => {
    try {
      const trimmed = adminToken.trim();
      const response = await fetch(
        `/api/admin/contributors?token=${encodeURIComponent(trimmed)}`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as {
        intro?: string;
        contributors?: {
          name: string;
          linkedinUrl: string;
          companyName?: string;
          companyUrl?: string;
          note?: string;
          active?: boolean;
        }[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load contributors");
      }

      setContributorsIntro(data.intro ?? "");
      setContributorsText(
        (data.contributors ?? [])
          .map(
            (entry) =>
              [
                entry.name,
                entry.linkedinUrl ?? "",
                entry.companyName ?? "",
                entry.companyUrl ?? "",
                entry.note ?? "",
                entry.active === false ? "false" : "true",
              ].join(" | "),
          )
          .join("\n"),
      );
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load contributors",
      });
    }
  }, []);

  const loadEmailSubscribers = useCallback(async (adminToken: string) => {
    try {
      const trimmed = adminToken.trim();
      const response = await fetch(
        `/api/admin/email-subscribers?token=${encodeURIComponent(trimmed)}`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as { emails?: string[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load email subscribers");
      }

      setSubscriberEmails(data.emails ?? []);
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load email subscribers",
      });
    }
  }, []);

  const loadPlatformFeedback = useCallback(async (adminToken: string) => {
    try {
      const trimmed = adminToken.trim();
      const response = await fetch(
        `/api/admin/platform-feedback?token=${encodeURIComponent(trimmed)}&limit=100`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as {
        feedback?: Array<{
          domain: string;
          platform: string | null;
          comments: string | null;
          timestamp: string;
        }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load platform feedback");
      }

      setPlatformFeedback(data.feedback ?? []);
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load platform feedback",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = readStoredAdminToken();

      if (!stored) {
        if (!cancelled) {
          setCheckingStoredToken(false);
        }
        return;
      }

      const verification = await verifyAdminToken(stored);

      if (cancelled) {
        return;
      }

      if (verification.ok) {
        setToken(stored);
        await Promise.all([
          loadDomainReviewQueue(stored),
          loadStorefrontReviewRequests(stored),
          loadContributors(stored),
          loadEmailSubscribers(stored),
          loadPlatformFeedback(stored),
        ]);
      } else {
        storeAdminToken("");
        setStatus({ tone: "error", message: verification.error });
      }

      setCheckingStoredToken(false);
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [loadContributors, loadEmailSubscribers, loadDomainReviewQueue, loadPlatformFeedback, loadStorefrontReviewRequests]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setFounderModeExampleOrigin(window.location.origin);
    setFounderModeActive(readTelemetrySuppression());

    return subscribeTelemetrySuppression(() => {
      setFounderModeActive(readTelemetrySuppression());
    });
  }, [token]);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();

    if (!nextToken) {
      setStatus({ tone: "error", message: "Token is required." });
      return;
    }

    setUnlocking(true);
    setStatus(null);

    const verification = await verifyAdminToken(nextToken);

    if (!verification.ok) {
      setStatus({ tone: "error", message: verification.error });
      setUnlocking(false);
      return;
    }

    storeAdminToken(nextToken);
    setToken(nextToken);
    await Promise.all([
      loadDomainReviewQueue(nextToken),
      loadStorefrontReviewRequests(nextToken),
      loadContributors(nextToken),
      loadEmailSubscribers(nextToken),
      loadPlatformFeedback(nextToken),
    ]);
    setUnlocking(false);
  }

  async function handleReset() {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      "Reset all Commerce Optimizer Redis data? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setBusy("reset");
    setStatus(null);

    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = (await response.json()) as {
        status?: string;
        deletedKeys?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Reset failed");
      }

      setStatus({
        tone: "success",
        message: JSON.stringify(data, null, 2),
      });
    } catch (resetError) {
      setStatus({
        tone: "error",
        message:
          resetError instanceof Error ? resetError.message : "Reset failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteAudit() {
    if (!token || !deleteDomain.trim()) {
      return;
    }

    setBusy("delete");
    setStatus(null);

    try {
      const response = await fetch("/api/admin/delete-audit", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({
          token: token.trim(),
          domain: deleteDomain.trim(),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        deletedKeys?: number;
        removedRecentAudit?: boolean;
        hostname?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Delete failed");
      }

      setStatus({
        tone: "success",
        message: JSON.stringify(data, null, 2),
      });
      setDeleteDomain("");
    } catch (deleteError) {
      setStatus({
        tone: "error",
        message:
          deleteError instanceof Error ? deleteError.message : "Delete failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveContributors() {
    if (!token) {
      return;
    }

    setBusy("contributors");
    setStatus(null);

    const contributors = contributorsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [
          name,
          linkedinUrl = "",
          companyName = "",
          companyUrl = "",
          note = "",
          activeRaw = "true",
        ] = line.split("|").map((part) => part.trim());
        const active = !["false", "0", "no", "inactive"].includes(
          activeRaw.toLowerCase(),
        );
        return {
          name,
          linkedinUrl,
          companyName: companyName || undefined,
          companyUrl: companyUrl || undefined,
          note: note || undefined,
          active,
        };
      })
      .filter((entry) => entry.name);

    try {
      const response = await fetch("/api/admin/contributors", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({
          token: token.trim(),
          intro: contributorsIntro,
          contributors,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        intro?: string;
        contributors?: {
          name: string;
          linkedinUrl: string;
          companyName?: string;
          companyUrl?: string;
          note?: string;
          active?: boolean;
        }[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      setContributorsIntro(data.intro ?? contributorsIntro);
      setContributorsText(
        (data.contributors ?? contributors)
          .map(
            (entry) =>
              [
                entry.name,
                entry.linkedinUrl ?? "",
                entry.companyName ?? "",
                entry.companyUrl ?? "",
                entry.note ?? "",
                entry.active === false ? "false" : "true",
              ].join(" | "),
          )
          .join("\n"),
      );
      setStatus({
        tone: "success",
        message: JSON.stringify(data, null, 2),
      });
    } catch (saveError) {
      setStatus({
        tone: "error",
        message:
          saveError instanceof Error ? saveError.message : "Save failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleReclassifyPlatform(domain?: string, platform?: string) {
    const nextDomain = (domain ?? reclassifyDomain).trim();
    const nextPlatform = platform ?? reclassifyPlatform;

    if (!token || !nextDomain || !nextPlatform) {
      return;
    }

    setBusy("reclassify");
    setStatus(null);

    try {
      const response = await fetch("/api/admin/reclassify-platform", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({
          token: token.trim(),
          domain: nextDomain,
          platform: nextPlatform,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        domain?: string;
        platform?: string;
        updatedRecentScan?: boolean;
        updatedHistoryRecords?: number;
        updatedBenchmarkSamples?: number;
        updatedCachedAudit?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Reclassification failed");
      }

      setStatus({
        tone: "success",
        message: JSON.stringify(data, null, 2),
      });
      setReclassifyDomain("");
      await Promise.all([loadPlatformFeedback(token), loadEmailSubscribers(token)]);
    } catch (reclassifyError) {
      setStatus({
        tone: "error",
        message:
          reclassifyError instanceof Error
            ? reclassifyError.message
            : "Reclassification failed",
      });
    } finally {
      setBusy(null);
    }
  }

  if (checkingStoredToken) {
    return (
      <div className={`${cardSurfaceClass} px-6 py-10 text-center text-sm ${textSecondaryClass}`}>
        Verifying admin session…
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`max-w-lg ${adminSectionClass}`}>
        <h2 className={adminHeadingClass}>Admin access</h2>
        <p className={adminBodyClass}>
          Enter your server-side admin token to unlock maintenance tools. The
          token is verified on the server before any tools are shown, then stored
          in this browser session only.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleUnlock(event)}>
          <label className={`block text-sm font-medium ${textPrimaryClass}`}>
            Admin token
            <input
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className={`mt-2 w-full ${adminInputClass}`}
              placeholder="Paste ADMIN_RESET_TOKEN"
            />
          </label>
          <button
            type="submit"
            disabled={unlocking}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {unlocking ? "Verifying…" : "Unlock admin tools"}
          </button>
        </form>
        {status && <StatusMessage message={status.message} tone={status.tone} />}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={`flex flex-wrap items-center justify-between gap-4 ${adminSectionClass}`}>
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Admin session active
          </p>
          <p className={`mt-1 text-sm ${textSecondaryClass}`}>
            Token verified with the server and stored in sessionStorage for this tab only.
          </p>
        </div>
        <button
          type="button"
          onClick={clearToken}
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-card-muted"
        >
          Lock admin tools
        </button>
      </div>

      <section className={adminSectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={adminHeadingClass}>Founder Mode</h2>
            <p className={adminBodyClass}>
              Excludes GA4 and PostHog tracking in this browser only. Use it while
              testing or validating scans so internal activity does not affect analytics
              reporting. The setting persists across refreshes, tabs, and return visits.
            </p>
          </div>
          <span
            className={
              founderModeActive
                ? "inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                : "inline-flex rounded-full bg-card-muted px-3 py-1 text-xs font-semibold text-text-secondary"
            }
          >
            {founderModeActive ? "Active in this browser" : "Inactive in this browser"}
          </span>
        </div>

        <div className={adminNestedPanelClass}>
          <p className={`text-sm font-medium ${textPrimaryClass}`}>Enable or disable via query string</p>
          <p className={adminBodyClass}>
            Visit any page on this site with one of the query parameters below. The
            parameter is removed from the address bar immediately after it is applied.
            You can append it to the homepage or any other route.
          </p>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className={`font-medium ${textPrimaryClass}`}>Enable Founder Mode</dt>
              <dd className={`mt-1 break-all font-mono ${textSecondaryClass}`}>
                ?{TELEMETRY_DIRECTIVE_PARAM}={TELEMETRY_DIRECTIVE_SUPPRESS}
              </dd>
              <dd className={`mt-2 break-all font-mono text-xs ${textSecondaryClass}`}>
                {buildFounderModeUrl(TELEMETRY_DIRECTIVE_SUPPRESS)}
              </dd>
            </div>
            <div>
              <dt className={`font-medium ${textPrimaryClass}`}>Disable Founder Mode</dt>
              <dd className={`mt-1 break-all font-mono ${textSecondaryClass}`}>
                ?{TELEMETRY_DIRECTIVE_PARAM}={TELEMETRY_DIRECTIVE_RESUME}
              </dd>
              <dd className={`mt-2 break-all font-mono text-xs ${textSecondaryClass}`}>
                {buildFounderModeUrl(TELEMETRY_DIRECTIVE_RESUME)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={buildFounderModeUrl(TELEMETRY_DIRECTIVE_SUPPRESS)}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Enable Founder Mode
            </a>
            <a
              href={buildFounderModeUrl(TELEMETRY_DIRECTIVE_RESUME)}
              className={adminSecondaryButtonClass}
            >
              Disable Founder Mode
            </a>
            <a href="/analytics-status" className={adminSecondaryButtonClass}>
              Open analytics status
            </a>
          </div>
        </div>

        <p className={`mt-4 text-sm leading-6 ${textSecondaryClass}`}>
          When active, a small &ldquo;Founder Mode Active&rdquo; indicator appears in the
          bottom-right corner of every page in this browser.
        </p>
      </section>

      <DomainReviewQueueSection
        token={token}
        domains={domainReviewDomains}
        search={domainReviewSearch}
        addDomain={domainReviewAddDomain}
        loading={loadingDomainReview}
        busy={busy}
        onSearchChange={setDomainReviewSearch}
        onAddDomainChange={setDomainReviewAddDomain}
        onLoad={() => void loadDomainReviewQueue(token, domainReviewSearch)}
        onAction={(action, domain, extra) => {
          if (action === "add") {
            setDomainReviewAddDomain("");
          }
          void handleDomainReviewAction(action, domain, extra);
        }}
      />

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>
          Reset All Commerce Optimizer Data
        </h2>
        <p className={adminBodyClass}>
          Deletes all Redis keys under the Commerce Optimizer prefixes (scan
          activity, audit cache, rate limits, and admin overrides).
        </p>
        <button
          type="button"
          disabled={busy === "reset"}
          onClick={() => void handleReset()}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
        >
          {busy === "reset" ? "Resetting…" : "Reset All Commerce Optimizer Data"}
        </button>
      </section>

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>Delete Audit</h2>
        <p className={adminBodyClass}>
          Remove cached audit data and the matching recent audit entry for a
          single hostname.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={deleteDomain}
            onChange={(event) => setDeleteDomain(event.target.value)}
            placeholder="allbirds.com or https://www.allbirds.com"
            className={`min-w-0 flex-1 ${adminInputClass}`}
          />
          <button
            type="button"
            disabled={busy === "delete" || !deleteDomain.trim()}
            onClick={() => void handleDeleteAudit()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy === "delete" ? "Deleting…" : "Delete Audit"}
          </button>
        </div>
      </section>

      <StorefrontReviewRequestsSection
        requests={storefrontReviewRequests}
        search={storefrontReviewSearch}
        loading={loadingStorefrontReview}
        busy={busy}
        onSearchChange={setStorefrontReviewSearch}
        onLoad={() => void loadStorefrontReviewRequests(token, storefrontReviewSearch)}
        onAction={(action, id, extra) => {
          void handleStorefrontReviewAction(action, id, extra);
        }}
      />

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>Community Contributors</h2>
        <p className={adminBodyClass}>
          Edit the public page at{" "}
          <code className={adminCodeClass}>/contributors</code>.
          One line per contributor:{" "}
          <code className={adminCodeClass}>
            Name | LinkedIn | Company | Company URL | Note | active
          </code>
          . Set active to <code className="text-xs">false</code> to hide on the public page.
        </p>
        <label className={`mt-4 ${adminLabelClass}`}>
          Intro text
          <textarea
            value={contributorsIntro}
            onChange={(event) => setContributorsIntro(event.target.value)}
            rows={3}
            className={adminTextareaClass}
          />
        </label>
        <label className={`mt-4 ${adminLabelClass}`}>
          Contributors
          <textarea
            value={contributorsText}
            onChange={(event) => setContributorsText(event.target.value)}
            rows={8}
            placeholder={
              "Jane Doe | https://www.linkedin.com/in/jane | Acme Corp | https://acme.com | Helped test audits | true"
            }
            className={adminTextareaMonoClass}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "contributors"}
            onClick={() => void loadContributors(token)}
            className={adminSecondaryButtonClass}
          >
            Reload Contributors
          </button>
          <button
            type="button"
            disabled={busy === "contributors"}
            onClick={() => void handleSaveContributors()}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {busy === "contributors" ? "Saving…" : "Save Contributors"}
          </button>
        </div>
      </section>

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>Newsletter Signups</h2>
        <p className={adminBodyClass}>
          Email addresses collected from the header and Contact page signup forms.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "subscribers"}
            onClick={() => void loadEmailSubscribers(token)}
            className={adminSecondaryButtonClass}
          >
            Reload signups
          </button>
        </div>
        <textarea
          readOnly
          value={subscriberEmails.join("\n")}
          rows={8}
          placeholder="No signups yet"
          className={`mt-4 w-full font-mono ${adminInputClass}`}
        />
        <p className={`mt-2 text-sm ${textSecondaryClass}`}>{subscriberEmails.length} subscriber(s)</p>
      </section>

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>Platform Detection Feedback</h2>
        <p className={adminBodyClass}>
          User-submitted corrections when platform detection is unknown or low confidence.
          Apply a platform override to update recent audits, history, benchmark samples, and cached audits.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "feedback"}
            onClick={() => void loadPlatformFeedback(token)}
            className={adminSecondaryButtonClass}
          >
            Reload feedback
          </button>
        </div>
        <div className={`${adminTableWrapClass} max-h-80 overflow-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className={adminTableHeaderCellClass}>When</th>
                <th className={adminTableHeaderCellClass}>Domain</th>
                <th className={adminTableHeaderCellClass}>Suggested</th>
                <th className={adminTableHeaderCellClass}>Comments</th>
                <th className={adminTableHeaderCellClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {platformFeedback.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-3 py-4 ${textSecondaryClass}`}>
                    No feedback submitted yet.
                  </td>
                </tr>
              ) : (
                platformFeedback.map((entry) => (
                  <tr key={`${entry.timestamp}-${entry.domain}`} className={adminTableRowClass}>
                    <td className={`${adminTableCellClass} whitespace-nowrap`}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className={`${adminTableCellClass} font-medium text-text-primary`}>
                      {entry.domain}
                    </td>
                    <td className={adminTableCellClass}>{entry.platform ?? "-"}</td>
                    <td className={`max-w-xs ${adminTableCellClass}`}>
                      {entry.comments ?? "-"}
                    </td>
                    <td className={adminTableCellClass}>
                      <button
                        type="button"
                        disabled={busy === "reclassify"}
                        onClick={() => {
                          setReclassifyDomain(entry.domain);
                          if (entry.platform) {
                            setReclassifyPlatform(entry.platform);
                          }
                        }}
                        className="text-sm font-medium text-blue-900 hover:underline"
                      >
                        Use
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminSectionClass}>
        <h2 className={adminHeadingClass}>Reclassify Platform</h2>
        <p className={adminBodyClass}>
          Change a domain from Other Platforms (or any incorrect label) to the correct commerce platform.
          Sets a persistent override for future audits.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={reclassifyDomain}
            onChange={(event) => setReclassifyDomain(event.target.value)}
            placeholder="zadig-et-voltaire.com"
            className={`min-w-0 flex-1 ${adminInputClass}`}
          />
          <select
            value={reclassifyPlatform}
            onChange={(event) => setReclassifyPlatform(event.target.value)}
            className={adminInputClass}
          >
            <option value="Shopify">Shopify</option>
            <option value="BigCommerce">BigCommerce</option>
            <option value="Salesforce Commerce Cloud">Salesforce Commerce Cloud</option>
            <option value="Magento">Adobe Commerce</option>
            <option value="VTEX">VTEX</option>
            <option value="Fenicio">Fenicio</option>
            <option value="WooCommerce">WooCommerce</option>
            <option value="Squarespace">Squarespace</option>
            <option value="Wix">Wix</option>
            <option value="CommerceTools">commercetools</option>
            <option value="Unknown">Other Platforms</option>
          </select>
          <button
            type="button"
            disabled={busy === "reclassify" || !reclassifyDomain.trim()}
            onClick={() => void handleReclassifyPlatform()}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {busy === "reclassify" ? "Applying…" : "Apply Platform"}
          </button>
        </div>
      </section>

      {status && <StatusMessage message={status.message} tone={status.tone} />}
    </div>
  );
}
