"use client";

import { useCallback, useState } from "react";

const ADMIN_TOKEN_SESSION_KEY = "aco-admin-token";

function readStoredAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) ?? "";
}

function useAdminToken() {
  const [token, setTokenState] = useState(readStoredAdminToken);

  const setToken = useCallback((value: string) => {
    setTokenState(value);
    if (value.trim()) {
      sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, value.trim());
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
    }
  }, []);

  const clearToken = useCallback(() => {
    setTokenState("");
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  }, []);

  return { token, setToken, clearToken };
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
  const { token, setToken, clearToken } = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [deleteDomain, setDeleteDomain] = useState("");
  const [bannedDomainsText, setBannedDomainsText] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [loadingBanned, setLoadingBanned] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadBannedDomains = useCallback(async (adminToken: string) => {
    setLoadingBanned(true);
    setStatus(null);

    try {
      const response = await fetch(
        `/api/admin/banned-domains?token=${encodeURIComponent(adminToken)}`,
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

  function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    setToken(nextToken);
    setStatus(null);

    if (nextToken) {
      void loadBannedDomains(nextToken);
    }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, domain: deleteDomain.trim() }),
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, domains }),
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

  if (!token) {
    return (
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Admin access</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter your server-side admin token to unlock maintenance tools. The
          token is stored in this browser session only and is never embedded in
          client-side code.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleUnlock}>
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Unlock admin tools
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-emerald-700">Admin session active</p>
          <p className="mt-1 text-sm text-slate-600">
            Token stored in sessionStorage for this tab only.
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

      {status && <StatusMessage message={status.message} tone={status.tone} />}
    </div>
  );
}
