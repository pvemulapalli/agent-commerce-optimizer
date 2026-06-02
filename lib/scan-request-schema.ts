import { z } from "zod";

export const scanUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (value) => {
        try {
          const normalized =
            value.startsWith("http://") || value.startsWith("https://")
              ? value
              : `https://${value}`;
          const parsed = new URL(normalized);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "Enter a valid website URL" },
    ),
  turnstileToken: z.string().trim().min(1).optional(),
});
