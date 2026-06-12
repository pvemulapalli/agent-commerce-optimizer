"use client";

import { readStoredAdminToken, storeAdminToken, verifyAdminToken } from "@/lib/admin-client-auth";
import { adminPageHref } from "@/lib/admin-route";
import {
  adminBodyClass,
  adminHeadingClass,
  adminInputClass,
  adminSecondaryButtonClass,
  adminSectionClass,
} from "@/lib/admin-theme-classes";
import { cardSurfaceClass, textPrimaryClass, textSecondaryClass } from "@/lib/theme-classes";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function AdminAuthGate({
  adminRoutePath,
  title,
  description,
  unlockLabel = "Unlock admin tools",
  children,
}: {
  adminRoutePath: string;
  title: string;
  description: string;
  unlockLabel?: string;
  children: ReactNode;
}) {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [checkingStoredToken, setCheckingStoredToken] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      const stored = readStoredAdminToken();

      if (!stored) {
        setCheckingStoredToken(false);
        return;
      }

      const verification = await verifyAdminToken(stored);

      if (verification.ok) {
        setToken(stored);
      } else {
        storeAdminToken("");
        setError(verification.error);
      }

      setCheckingStoredToken(false);
    }

    void restoreSession();
  }, []);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setError(null);

    const verification = await verifyAdminToken(tokenInput);

    if (!verification.ok) {
      setError(verification.error);
      setUnlocking(false);
      return;
    }

    storeAdminToken(tokenInput);
    setToken(tokenInput.trim());
    setTokenInput("");
    setUnlocking(false);
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
        <h2 className={adminHeadingClass}>{title}</h2>
        <p className={adminBodyClass}>{description}</p>
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
            {unlocking ? "Verifying…" : unlockLabel}
          </button>
        </form>
        <p className="mt-6">
          <Link
            href={adminPageHref(undefined, adminRoutePath)}
            className="text-sm font-medium text-blue-900 hover:underline dark:text-blue-300"
          >
            ← Back to admin tools
          </Link>
        </p>
        {error ? <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return <>{children}</>;
}
