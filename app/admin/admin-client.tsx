"use client";

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
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-slate-200 bg-slate-50 text-slate-800";

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
  const [bannedDomainsText, setBannedDomainsText] = useState("");
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
  const [loadingBanned, setLoadingBanned] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const clearToken = useCallback(() => {
    setToken("");
    setTokenInput("");
    storeAdminToken("");
    setStatus(null);
  }, []);

  const loadBannedDomains = useCallback(async (adminToken: string) => {
    setLoadingBanned(true);
    setStatus(null);

    try {
      const trimmed = adminToken.trim();
      const response = await fetch(
        `/api/admin/banned-domains?token=${encodeURIComponent(trimmed)}`,
        { headers: adminHeaders(trimmed) },
      );
      const data = (await response.json()) as {
        domains?: string[];
        error?: string;
        redisConfigured?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load banned domains");
      }

      setBannedDomainsText((data.domains ?? []).join("\n"));

      if (!data.redisConfigured) {
        setStatus({
          tone: "info",
          message:
            "Redis is not configured. Banned domains are read from BANNED_SCAN_DOMAINS env vars. Saving requires Redis.",
        });
      }
    } catch (loadError) {
      setStatus({
        tone: "error",
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load banned domains",
      });
    } finally {
      setLoadingBanned(false);
    }
  }, []);

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
          loadBannedDomains(stored),
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
  }, [loadBannedDomains, loadContributors, loadEmailSubscribers, loadPlatformFeedback]);

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
      loadBannedDomains(nextToken),
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

  async function handleSaveBannedDomains() {
    if (!token) {
      return;
    }

    setBusy("banned");
    setStatus(null);

    const domains = bannedDomainsText
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/admin/banned-domains", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ token: token.trim(), domains }),
      });
      const data = (await response.json()) as {
        status?: string;
        domains?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      setBannedDomainsText((data.domains ?? domains).join("\n"));
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
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
        Verifying admin session…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Admin access</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter your server-side admin token to unlock maintenance tools. The
          token is verified on the server before any tools are shown, then stored
          in this browser session only.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleUnlock(event)}>
          <label className="block text-sm font-medium text-slate-700">
            Admin token
            <input
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Paste ADMIN_RESET_TOKEN"
            />
          </label>
          <button
            type="submit"
            disabled={unlocking}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-emerald-700">Admin session active</p>
          <p className="mt-1 text-sm text-slate-600">
            Token verified with the server and stored in sessionStorage for this tab only.
          </p>
        </div>
        <button
          type="button"
          onClick={clearToken}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Lock admin tools
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Reset All Commerce Optimizer Data
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Delete Audit</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Remove cached audit data and the matching recent audit entry for a
          single hostname.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={deleteDomain}
            onChange={(event) => setDeleteDomain(event.target.value)}
            placeholder="allbirds.com or https://www.allbirds.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Banned Domains</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Default list comes from BANNED_SCAN_DOMAINS. When Redis is configured,
          saving here stores a production override that takes priority.
        </p>
        <textarea
          value={bannedDomainsText}
          onChange={(event) => setBannedDomainsText(event.target.value)}
          rows={8}
          disabled={loadingBanned}
          placeholder="amazon.com&#10;walmart.com"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loadingBanned}
            onClick={() => void loadBannedDomains(token)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingBanned ? "Loading…" : "Load Banned Domains"}
          </button>
          <button
            type="button"
            disabled={busy === "banned" || loadingBanned}
            onClick={() => void handleSaveBannedDomains()}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {busy === "banned" ? "Saving…" : "Save Banned Domains"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Community Contributors</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edit the public page at{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/contributors</code>.
          One line per contributor:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            Name | LinkedIn | Company | Company URL | Note | active
          </code>
          . Set active to <code className="text-xs">false</code> to hide on the public page.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Intro text
          <textarea
            value={contributorsIntro}
            onChange={(event) => setContributorsIntro(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Contributors
          <textarea
            value={contributorsText}
            onChange={(event) => setContributorsText(event.target.value)}
            rows={8}
            placeholder={
              "Jane Doe | https://www.linkedin.com/in/jane | Acme Corp | https://acme.com | Helped test audits | true"
            }
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "contributors"}
            onClick={() => void loadContributors(token)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Newsletter Signups</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Email addresses collected from the header and Contact page signup forms.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "subscribers"}
            onClick={() => void loadEmailSubscribers(token)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Reload signups
          </button>
        </div>
        <textarea
          readOnly
          value={subscriberEmails.join("\n")}
          rows={8}
          placeholder="No signups yet"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
        />
        <p className="mt-2 text-sm text-slate-600">{subscriberEmails.length} subscriber(s)</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Platform Detection Feedback</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          User-submitted corrections when platform detection is unknown or low confidence.
          Apply a platform override to update recent audits, history, benchmark samples, and cached audits.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy === "feedback"}
            onClick={() => void loadPlatformFeedback(token)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Reload feedback
          </button>
        </div>
        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Suggested</th>
                <th className="px-3 py-2">Comments</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {platformFeedback.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-500">
                    No feedback submitted yet.
                  </td>
                </tr>
              ) : (
                platformFeedback.map((entry) => (
                  <tr key={`${entry.timestamp}-${entry.domain}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{entry.domain}</td>
                    <td className="px-3 py-2 text-slate-700">{entry.platform ?? "-"}</td>
                    <td className="max-w-xs px-3 py-2 text-slate-600">
                      {entry.comments ?? "-"}
                    </td>
                    <td className="px-3 py-2">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Reclassify Platform</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Change a domain from Other Platforms (or any incorrect label) to the correct commerce platform.
          Sets a persistent override for future audits.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={reclassifyDomain}
            onChange={(event) => setReclassifyDomain(event.target.value)}
            placeholder="zadig-et-voltaire.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
          <select
            value={reclassifyPlatform}
            onChange={(event) => setReclassifyPlatform(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
