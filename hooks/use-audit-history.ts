"use client";

import {
  getAuditHistory,
  getTotalAuditCount,
  recordAuditFromResponse,
} from "@/lib/audit-history";
import type { AuditHistoryEntry } from "@/lib/audit-history";
import type { AuditApiResponse } from "@/lib/types";
import { useCallback, useSyncExternalStore } from "react";

type AuditHistorySnapshot = {
  history: AuditHistoryEntry[];
  totalCount: number;
};

const emptySnapshot: AuditHistorySnapshot = {
  history: [],
  totalCount: 0,
};

let listeners: Array<() => void> = [];
let cachedSnapshot: AuditHistorySnapshot = emptySnapshot;
let cachedSnapshotKey = "0:";

function buildSnapshotKey(history: AuditHistoryEntry[], totalCount: number): string {
  return `${totalCount}:${history.map((entry) => entry.id).join("|")}`;
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): AuditHistorySnapshot {
  const history = getAuditHistory();
  const totalCount = getTotalAuditCount();
  const nextKey = buildSnapshotKey(history, totalCount);

  if (nextKey === cachedSnapshotKey) {
    return cachedSnapshot;
  }

  cachedSnapshotKey = nextKey;
  cachedSnapshot =
    history.length === 0 && totalCount === 0
      ? emptySnapshot
      : { history, totalCount };

  return cachedSnapshot;
}

function getServerSnapshot(): AuditHistorySnapshot {
  return emptySnapshot;
}

function subscribeNoop(): () => void {
  return () => {};
}

export function useAuditHistory() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const recordAudit = useCallback((audit: AuditApiResponse) => {
    recordAuditFromResponse(audit);
    emitChange();
  }, []);

  const refresh = useCallback(() => {
    emitChange();
  }, []);

  return {
    history: snapshot.history,
    totalCount: snapshot.totalCount,
    hydrated,
    recordAudit,
    refresh,
  };
}
