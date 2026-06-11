import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from "undici";

/** Node's default HTTP header limit (16 KiB) is too small for some SFCC/CDN storefronts. */
export const STOREFRONT_FETCH_MAX_HEADER_SIZE = 65_536;

const storefrontFetchAgent = new Agent({
  maxHeaderSize: STOREFRONT_FETCH_MAX_HEADER_SIZE,
});

export type StorefrontFetchInit = Omit<UndiciRequestInit, "dispatcher">;

/** Server-side fetch for storefront crawls with an enlarged response header limit. */
export async function storefrontFetch(
  input: string | URL,
  init?: StorefrontFetchInit,
): Promise<Response> {
  return undiciFetch(input, {
    ...init,
    dispatcher: storefrontFetchAgent,
  }) as unknown as Response;
}
