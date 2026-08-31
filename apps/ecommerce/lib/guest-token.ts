/**
 * Guest token persistence — localStorage + cookie fallback.
 * Used for anonymous cart before auth_user_id merge (Q8).
 * Cookie name must match X-Guest-Token expectation of public API.
 */

const GUEST_TOKEN_KEY = "ecommerce_guest_token";
const GUEST_TOKEN_COOKIE = "ecommerce_guest_token";

function generateGuestToken(): string {
  // crypto.randomUUID is available in modern browsers
  try {
    return crypto.randomUUID();
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = localStorage.getItem(GUEST_TOKEN_KEY);
    if (ls) return ls;
    // Fallback to cookie
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${GUEST_TOKEN_COOKIE}=([^;]*)`)
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function ensureGuestToken(): string {
  const existing = getGuestToken();
  if (existing) return existing;
  const token = generateGuestToken();
  setGuestToken(token);
  return token;
}

export function setGuestToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
    // Also set cookie for server components / middleware reading
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `${GUEST_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore storage errors (private mode)
  }
}

export function clearGuestToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
    document.cookie = `${GUEST_TOKEN_COOKIE}=; path=/; max-age=0`;
  } catch {
    // ignore
  }
}
