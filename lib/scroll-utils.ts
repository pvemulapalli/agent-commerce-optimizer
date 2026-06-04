/** Offset from viewport top when scrolling to audit sections (header + sticky nav + padding). */
export const AUDIT_SCROLL_OFFSET_PX = 28;

export function scrollToElementById(
  elementId: string,
  behavior: ScrollBehavior = "smooth",
  offsetPx = AUDIT_SCROLL_OFFSET_PX,
): void {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  const top =
    element.getBoundingClientRect().top + window.scrollY - offsetPx;

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
}
