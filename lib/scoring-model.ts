/** Versioned readiness scoring — stamp on new reports; never rewrite historical stored scores. */

export const SCORING_MODEL_LEGACY = "legacy";
export const SCORING_MODEL_EVIDENCE_V1 = "2026-11-evidence-v1";

export type ScoringModelVersion =
  | typeof SCORING_MODEL_LEGACY
  | typeof SCORING_MODEL_EVIDENCE_V1;

/** Active model for newly computed reports. */
export const CURRENT_SCORING_MODEL_VERSION: ScoringModelVersion =
  SCORING_MODEL_EVIDENCE_V1;

/** Optional signals that should not hard-zero a dimension when only weakly reviewed. */
export const OPTIONAL_STOREFRONT_FINDING_IDS = new Set([
  "return-portal",
  "faq-page",
  "faq-schema",
  "api-developer-docs",
  "help-center",
  "search-action-schema",
  "item-list-schema",
  "breadcrumb-schema",
  "website-schema",
]);

export function scoringModelLabel(version: ScoringModelVersion | string | null | undefined): string {
  if (!version || version === SCORING_MODEL_LEGACY) {
    return "Legacy scoring model";
  }
  if (version === SCORING_MODEL_EVIDENCE_V1) {
    return "Evidence scoring model (2026-11)";
  }
  return `Scoring model: ${version}`;
}
