"use client";

import {
  getScanActivityPollIntervalMs,
  isScanActivityToastEnabled,
} from "@/lib/scan-activity-config";
import type { ScanActivityResponse } from "@/lib/scan-activity";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRecentScans(options?: {
  limit?: number;
  poll?: boolean;
  pollIntervalMs?: number;
  onNewScan?: (hostname: string) => void;
}) {
  const limit = options?.limit ?? 5;
  const poll = options?.poll ?? false;
  const pollIntervalMs = options?.pollIntervalMs ?? getScanActivityPollIntervalMs();
  const toastEnabled = isScanActivityToastEnabled();
  const onNewScanRef = useRef(options?.onNewScan);

  useEffect(() => {
    onNewScanRef.current = options?.onNewScan;
  }, [options?.onNewScan]);

  const [activity, setActivity] = useState<ScanActivityResponse>({
    totalScans: 0,
    recentScans: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestScanIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const skipNextToastForScanIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      try {
        const response = await fetch(`/api/recent-scans?limit=${limit}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as ScanActivityResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load recent scans");
        }

        if (cancelled) {
          return;
        }

        setActivity(data);
        setError(null);
        setLoading(false);

        const latestScan = data.recentScans[0];
        if (!latestScan) {
          initializedRef.current = true;
          return;
        }

        if (!initializedRef.current) {
          latestScanIdRef.current = latestScan.id;
          initializedRef.current = true;
          return;
        }

        if (
          toastEnabled &&
          latestScan.id !== latestScanIdRef.current &&
          latestScan.id !== skipNextToastForScanIdRef.current
        ) {
          onNewScanRef.current?.(latestScan.hostname);
        }

        skipNextToastForScanIdRef.current = null;
        latestScanIdRef.current = latestScan.id;
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load recent scans",
        );
        setLoading(false);
      }
    }

    void fetchActivity();

    if (!poll) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(() => {
      void fetchActivity();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [limit, poll, pollIntervalMs, toastEnabled]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/recent-scans?limit=${limit}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ScanActivityResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load recent scans");
      }

      setActivity(data);
      setError(null);

      const latestScan = data.recentScans[0];
      if (latestScan) {
        latestScanIdRef.current = latestScan.id;
        initializedRef.current = true;
      }

      return data;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load recent scans",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const markOwnScan = useCallback((scanId: string | undefined) => {
    if (scanId) {
      skipNextToastForScanIdRef.current = scanId;
      latestScanIdRef.current = scanId;
      initializedRef.current = true;
    }
  }, []);

  return {
    activity,
    loading,
    error,
    refresh,
    markOwnScan,
  };
}
