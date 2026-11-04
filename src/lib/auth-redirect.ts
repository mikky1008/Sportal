/** Only follow in-app paths after login, so a crafted link cannot send people to another site. */
export function safeRedirectPath(raw: unknown, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  if (raw === "/login" || raw.startsWith("/login?")) return fallback;
  return raw;
}
