/** Lightweight prototype session stored in the browser (no backend auth yet). */
export type Role = "passenger" | "driver" | "admin";

export type Session = {
  phone: string;
  role: Role;
  busId?: string | null;
};

const KEY = "bussync.session";

const listeners = new Set<() => void>();

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage unavailable — session is optional context only
  }
  listeners.forEach((listener) => listener());
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Prototype OTP: a deterministic-looking random 6 digit code kept in memory. */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalisePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function isValidPhone(value: string): boolean {
  const digits = normalisePhone(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
