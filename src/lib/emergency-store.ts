import type { EmergencyRequest } from "./emergency";

/**
 * Tiny shared store for the active emergency request so the passenger map and
 * the admin fleet view agree on which ambulance is busy. Persisted in
 * localStorage and synced across tabs.
 */
const KEY = "bussync.emergency";
const EVENT = "bussync:emergency";

export function readEmergency(): EmergencyRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EmergencyRequest) : null;
  } catch {
    return null;
  }
}

export function writeEmergency(request: EmergencyRequest | null) {
  if (typeof window === "undefined") return;
  try {
    if (request) window.localStorage.setItem(KEY, JSON.stringify(request));
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore quota/private-mode failures
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeEmergency(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
