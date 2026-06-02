import { enforceScanRateLimit } from "./rate-limit";
import { verifyTurnstileToken } from "./turnstile";

export async function enforceScanRequestGuards(
  request: Request,
  turnstileToken: string | undefined,
): Promise<Response | null> {
  const rateLimitResponse = await enforceScanRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken, request);
  if (!turnstileResult.ok) {
    return new Response(JSON.stringify({ error: turnstileResult.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
