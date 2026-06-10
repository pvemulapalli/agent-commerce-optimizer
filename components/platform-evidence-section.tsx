"use client";

import {
  getPlatformDetectionSummary,
  getPlatformEvidenceForDisplay,
} from "@/lib/platform-evidence-display";
import type { PlatformAnalysis } from "@/lib/types";

export function PlatformEvidenceSection({
  platform,
  showInternalEvidence = false,
}: {
  platform: PlatformAnalysis;
  showInternalEvidence?: boolean;
}) {
  const evidence = getPlatformEvidenceForDisplay(platform, showInternalEvidence);

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-text-secondary">
        {showInternalEvidence ? "Evidence (internal)" : "Evidence Detected"}
      </h3>

      {showInternalEvidence && platform.signalBreakdown ? (
        <dl className="mt-3 grid gap-2 rounded-xl border border-card-border bg-card-muted px-4 py-3 text-xs text-text-secondary sm:grid-cols-2">
          <div>
            <dt>Storefront assets</dt>
            <dd className="font-medium text-text-primary">
              {platform.signalBreakdown.storefrontAssets}
            </dd>
          </div>
          <div>
            <dt>JS bundles</dt>
            <dd className="font-medium text-text-primary">{platform.signalBreakdown.jsBundles}</dd>
          </div>
          <div>
            <dt>URL patterns</dt>
            <dd className="font-medium text-text-primary">{platform.signalBreakdown.urlPatterns}</dd>
          </div>
          <div>
            <dt>Hosting support</dt>
            <dd className="font-medium text-text-primary">{platform.signalBreakdown.ipHosting}</dd>
          </div>
        </dl>
      ) : null}

      <ul className="mt-3 space-y-2 text-sm text-text-primary">
        {evidence.map((item) => (
          <li key={item} className="flex gap-2 break-words">
            {!showInternalEvidence ? (
              <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                ✓
              </span>
            ) : (
              <span className="mt-0.5 shrink-0 text-text-secondary" aria-hidden>
                •
              </span>
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformDetectionIntro({
  showInternalEvidence = false,
}: {
  showInternalEvidence?: boolean;
}) {
  return (
    <p className="mt-2 text-sm text-text-secondary">
      {getPlatformDetectionSummary(showInternalEvidence)}
    </p>
  );
}
