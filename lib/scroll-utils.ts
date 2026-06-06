const DESKTOP_EXTRA_OFFSET_PX = 24;
const MOBILE_EXTRA_OFFSET_PX = 32;
const MOBILE_BREAKPOINT_PX = 768;

const DEFAULT_HEADER_HEIGHT_PX = 64;
const DEFAULT_TAB_HEIGHT_PX = 52;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

function measureHeaderHeightPx(): number {
  const header = document.querySelector("header");
  if (!header) {
    return DEFAULT_HEADER_HEIGHT_PX;
  }
  return Math.ceil(header.getBoundingClientRect().height);
}

function measureAuditTabHeightPx(): number {
  const tabNav = document.querySelector('nav[aria-label="Scan report sections"]');
  if (!tabNav) {
    return DEFAULT_TAB_HEIGHT_PX;
  }
  return Math.ceil(tabNav.getBoundingClientRect().height);
}

/** Sticky header + audit tab bar + safe padding for scroll targets and scrollIntoView. */
export function getAuditScrollOffsetPx(): number {
  if (typeof window === "undefined") {
    return DEFAULT_HEADER_HEIGHT_PX + DEFAULT_TAB_HEIGHT_PX + DESKTOP_EXTRA_OFFSET_PX;
  }

  const extra = isMobileViewport() ? MOBILE_EXTRA_OFFSET_PX : DESKTOP_EXTRA_OFFSET_PX;
  return measureHeaderHeightPx() + measureAuditTabHeightPx() + extra;
}

export function scrollToElementWithOffset(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
): void {
  const offset = getAuditScrollOffsetPx();
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function scrollToHashWithOffset(
  hash: string,
  behavior: ScrollBehavior = "smooth",
): boolean {
  const id = hash.replace(/^#/, "");
  if (!id) {
    return false;
  }
  const element = document.getElementById(id);
  if (!element) {
    return false;
  }
  scrollToElementWithOffset(element, behavior);
  return true;
}

/** CSS class for audit section scroll-margin-top (pairs with globals.css). */
export const AUDIT_SECTION_SCROLL_CLASS = "audit-scroll-target";

export function scrollToElementById(
  id: string,
  behavior: ScrollBehavior = "smooth",
): void {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  scrollToElementWithOffset(element, behavior);
}

/** Scroll audit overview into view after a scan; retries while layout settles. */
export function scrollToAuditOverview(behavior: ScrollBehavior = "instant"): void {
  const performScroll = (): boolean => {
    const element = document.getElementById("overview");
    if (!element) {
      return false;
    }
    scrollToElementWithOffset(element, behavior);
    return true;
  };

  const scheduleRetries = () => {
    performScroll();
    window.setTimeout(performScroll, 0);
    window.setTimeout(performScroll, 50);
    window.setTimeout(performScroll, 150);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(scheduleRetries);
  });
}
