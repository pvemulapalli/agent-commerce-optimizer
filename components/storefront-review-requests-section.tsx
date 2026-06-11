"use client";

import type {
  StorefrontReviewRequest,
  StorefrontReviewRequestStatus,
} from "@/lib/storefront-review-types";
import {
  STOREFRONT_REVIEW_RELATIONSHIP_LABELS,
  STOREFRONT_REVIEW_STATUSES,
} from "@/lib/storefront-review-requests";
import {
  adminBodyClass,
  adminHeadingClass,
  adminInputClass,
  adminSectionClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeaderCellClass,
  adminTableRowClass,
  adminTableWrapClass,
} from "@/lib/admin-theme-classes";
import { useState, Fragment } from "react";

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function StorefrontReviewRequestsSection({
  requests,
  search,
  loading,
  busy,
  onSearchChange,
  onLoad,
  onAction,
}: {
  requests: StorefrontReviewRequest[];
  search: string;
  loading: boolean;
  busy: string | null;
  onSearchChange: (value: string) => void;
  onLoad: () => void;
  onAction: (
    action: "status" | "notes" | "mark_supported" | "mark_not_supported" | "close",
    id: string,
    extra?: { status?: StorefrontReviewRequestStatus; reviewNotes?: string | null },
  ) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  return (
    <section className={adminSectionClass}>
      <h2 className={adminHeadingClass}>Storefront Review Requests</h2>
      <p className={adminBodyClass}>
        User-submitted requests for storefronts Merchant Signals could not scan successfully.
        Emails are stored for future notification when support improves.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search domain, email, status, or failure type"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
        <button
          type="button"
          disabled={loading}
          onClick={onLoad}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </div>

      <div className="mt-4 max-h-[32rem] overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Relationship</th>
              <th className="px-3 py-2">Request Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-slate-500">
                  No storefront review requests yet.
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const expanded = expandedId === request.id;
                const notesValue = notesDraft[request.id] ?? request.reviewNotes ?? "";

                return (
                  <Fragment key={request.id}>
                    <tr className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {request.normalizedDomain}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{request.email}</td>
                      <td className="px-3 py-2 text-slate-700">{request.companyName ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {STOREFRONT_REVIEW_RELATIONSHIP_LABELS[request.relationship]}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {formatTimestamp(request.requestDate)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={request.status}
                          disabled={busy === request.id}
                          onChange={(event) =>
                            onAction("status", request.id, {
                              status: event.target.value as StorefrontReviewRequestStatus,
                            })
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
                        >
                          {STOREFRONT_REVIEW_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {formatTimestamp(request.lastUpdated)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : request.id)}
                            className="text-left text-xs font-medium text-blue-900 hover:underline"
                          >
                            {expanded ? "Hide" : "View"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() => onAction("mark_supported", request.id)}
                            className="text-left text-xs font-medium text-emerald-800 hover:underline disabled:opacity-60"
                          >
                            Mark Supported
                          </button>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() => onAction("mark_not_supported", request.id)}
                            className="text-left text-xs font-medium text-amber-800 hover:underline disabled:opacity-60"
                          >
                            Mark Not Supported
                          </button>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() => onAction("close", request.id)}
                            className="text-left text-xs font-medium text-slate-700 hover:underline disabled:opacity-60"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <td colSpan={8} className="px-3 py-4">
                          <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="font-medium text-slate-700">Storefront URL</dt>
                              <dd className="mt-1 break-all text-slate-900">{request.domain}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-slate-700">Failure Type</dt>
                              <dd className="mt-1 text-slate-900">{request.failureType}</dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="font-medium text-slate-700">User Comments</dt>
                              <dd className="mt-1 text-slate-900">{request.comments ?? "—"}</dd>
                            </div>
                          </dl>
                          <label className="mt-4 block text-sm font-medium text-slate-700">
                            Review Notes
                            <textarea
                              rows={3}
                              value={notesValue}
                              onChange={(event) =>
                                setNotesDraft((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() =>
                              onAction("notes", request.id, {
                                reviewNotes: notesValue.trim() || null,
                              })
                            }
                            className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                          >
                            Save Notes
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
