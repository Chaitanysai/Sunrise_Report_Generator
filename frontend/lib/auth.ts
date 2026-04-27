/**
 * Placeholder authentication.
 *
 * Compares an entered password against `NEXT_PUBLIC_DEMO_PASSWORD` and
 * stores a flag in `sessionStorage`. Replace with NextAuth, Supabase Auth,
 * or your SSO of choice before going live.
 */

const STORAGE_KEY = "csp.demo-auth";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "changeme";

export function login(password: string): boolean {
  if (typeof window === "undefined") return false;
  if (password === DEMO_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY, "1");
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}
