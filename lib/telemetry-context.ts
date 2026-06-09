const STORAGE_KEY = "aco:ctx:v2";
const CHANGE_EVENT = "aco:ctx:change";

export const TELEMETRY_DIRECTIVE_PARAM = "_vctx";
export const TELEMETRY_DIRECTIVE_SUPPRESS = "s";
export const TELEMETRY_DIRECTIVE_RESUME = "r";

export function readTelemetrySuppression(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTelemetrySuppression(active: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (active) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function subscribeTelemetrySuppression(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function applyTelemetryDirectiveFromLocation(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const directive = url.searchParams.get(TELEMETRY_DIRECTIVE_PARAM);

  if (directive !== TELEMETRY_DIRECTIVE_SUPPRESS && directive !== TELEMETRY_DIRECTIVE_RESUME) {
    return null;
  }

  const active = directive === TELEMETRY_DIRECTIVE_SUPPRESS;
  writeTelemetrySuppression(active);

  url.searchParams.delete(TELEMETRY_DIRECTIVE_PARAM);
  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);

  return active;
}
