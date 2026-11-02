/** Client-safe Shopify hostname helpers (no Node fetch / undici imports). */

export function isMyshopifyHostname(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".myshopify.com");
}

export function isShopifyStorefrontPasswordPage(input: {
  html: string;
  url?: string | null;
}): boolean {
  const html = input.html;
  const url = input.url ?? "";

  if (!html.trim()) {
    return false;
  }

  if (/form_type[^>]*storefront_password|value=["']storefront_password["']/i.test(html)) {
    return true;
  }

  const shopifyMarkers =
    /cdn\.shopify\.com|shopify\.theme|Shopify\.shop|myshopify\.com/i.test(html);
  const passwordCopy =
    /password protected|enter store using password|enter store password|storefront.password|storefront-password|this store is protected/i.test(
      html,
    );

  if (shopifyMarkers && passwordCopy) {
    return true;
  }

  if (shopifyMarkers && /action=["']\/password["']/i.test(html)) {
    return true;
  }

  if (/\/password(?:\?|$)/i.test(url) && shopifyMarkers) {
    return true;
  }

  return false;
}
