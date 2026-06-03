"use client";

import {
  getScanActivityPollIntervalMs,
  isActivityFeedEnabled,
  isRecentActivityEvent,
} from "@/lib/scan-activity-config";
import type { RecentScanRecord, ScanActivityResponse } from "@/lib/scan-activity";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRecentScans(options?: {
  limit?: number;
  poll?: boolean;
  pollIntervalMs?: number;
  onNewScan?: (entry: RecentScanRecord) => void;
}) {
  const limit = options?.limit ?? 5;
  const poll = options?.poll ?? false;
  const pollIntervalMs = options?.pollIntervalMs ?? getScanActivityPollIntervalMs();
  const activityFeedEnabled = isActivityFeedEnabled();
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
  const latestScanKeyRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const skipNextNotificationRef = useRef(false);

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

        const latestKey = `${latestScan.id}-${latestScan.scannedAt}`;

        if (!initializedRef.current) {
          latestScanKeyRef.current = latestKey;
          initializedRef.current = true;
          return;
        }

        if (
          activityFeedEnabled &&
          poll &&
          latestKey !== latestScanKeyRef.current &&
          !skipNextNotificationRef.current &&
          isRecentActivityEvent(latestScan.scannedAt)
        ) {
          onNewScanRef.current?.(latestScan);
        }

        skipNextNotificationRef.current = false;
        latestScanKeyRef.current = latestKey;
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

    if (!poll || !activityFeedEnabled) {
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
  }, [limit, poll, pollIntervalMs, activityFeedEnabled]);

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
        latestScanKeyRef.current = `${latestScan.id}-${latestScan.scannedAt}`;
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

  const markOwnScan = useCallback((_scanId?: string) => {
    skipNextNotificationRef.current = true;
    initializedRef.current = true;
  }, []);

  return {
    activity,
    loading,
    error,
    refresh,
    markOwnScan,
  };
}
