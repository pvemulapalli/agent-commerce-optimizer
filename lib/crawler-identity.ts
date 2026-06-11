/** Official Merchant Signals storefront crawler identity. */
export const CRAWLER_BOT_NAME = "MerchantSignalsBot";

export const CRAWLER_BOT_VERSION = "1.0";

export const CRAWLER_PAGE_URL = "https://www.merchantsignals.com/crawler";

export const CRAWLER_PAGE_PATH = "/crawler";

/** Fixed production URL in User-Agent per crawler transparency best practices. */
export const MERCHANT_SIGNALS_CRAWLER_USER_AGENT = `${CRAWLER_BOT_NAME}/${CRAWLER_BOT_VERSION} (+${CRAWLER_PAGE_URL})`;

export const CRAWLER_CONTACT_EMAIL = "crawler@merchantsignals.com";

export const SITE_CONTACT_EMAIL = "contact@merchantsignals.com";
