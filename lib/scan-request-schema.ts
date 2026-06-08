import { normalizeAuditUrl } from "./cache";
import { isValidAuditUrlInput } from "./audit-url-validation";
import { z } from "zod";

export function normalizeScanUrlInput(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return trimmed;
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  return normalizeAuditUrl(withProtocol);
}

function isValidScanUrlInput(value: string): boolean {
  return isValidAuditUrlInput(value);
}

export const scanUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .refine(isValidScanUrlInput, { message: "Enter a valid website URL or domain" })
    .transform(normalizeScanUrlInput),
  turnstileToken: z.string().trim().min(1).optional(),
});
