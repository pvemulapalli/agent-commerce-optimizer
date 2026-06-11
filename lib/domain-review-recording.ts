import { BotVerificationBlockedError } from "./bot-verification";
import {
  classifyDomainReviewTypeFromFullAuditFailure,
  classifyDomainReviewTypeFromScanFailureCode,
} from "./domain-review-classification";
import { DomainUnreachableError } from "./domain-reachability";
import { recordDomainReviewFailure } from "./domain-review-queue";
import type { DomainReviewType } from "./domain-review-types";
import type { FullAuditFailureReason } from "./types";

export async function recordScanFailureForDomainReview(input: {
  url: string;
  error: unknown;
}): Promise<void> {
  const type = classifyScanFailureForReview(input.error);
  const reason = extractReviewReason(input.error, type);

  await recordDomainReviewFailure({
    url: input.url,
    type,
    reason,
  });
}

function classifyScanFailureForReview(error: unknown): DomainReviewType {
  if (error instanceof BotVerificationBlockedError) {
    return "BOT_BLOCKED";
  }

  if (error instanceof DomainUnreachableError) {
    return classifyDomainReviewTypeFromScanFailureCode(error.diagnostic?.code);
  }

  const fullAuditReason = tryFullAuditReason(error);
  if (fullAuditReason) {
    return classifyDomainReviewTypeFromFullAuditFailure(fullAuditReason);
  }

  return "UNKNOWN";
}

function tryFullAuditReason(error: unknown): FullAuditFailureReason | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const reason = (error as { reason?: FullAuditFailureReason }).reason;
  return reason ?? null;
}

function extractReviewReason(error: unknown, type: DomainReviewType): string {
  if (error instanceof DomainUnreachableError) {
    return error.diagnostic?.code ?? type.toLowerCase();
  }

  if (error instanceof BotVerificationBlockedError) {
    return "bot_verification";
  }

  if (error instanceof Error) {
    return error.message.slice(0, 200) || type.toLowerCase();
  }

  return type.toLowerCase();
}

export async function recordPartialAuditFailureForDomainReview(input: {
  url: string;
  reason: FullAuditFailureReason;
}): Promise<void> {
  await recordDomainReviewFailure({
    url: input.url,
    type: classifyDomainReviewTypeFromFullAuditFailure(input.reason),
    reason: input.reason,
  });
}

export async function recordEcommerceIneligibleForDomainReview(input: {
  url: string;
  reason: string;
}): Promise<void> {
  await recordDomainReviewFailure({
    url: input.url,
    type: "NON_ECOMMERCE",
    reason: input.reason,
  });
}
