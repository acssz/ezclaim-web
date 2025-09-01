"use client";

// Utilities to persist per-claim password in cookies (with localStorage fallback for legacy)

const cookieName = (id: string) => `claim_pwd_${encodeURIComponent(id)}`;

export function setClaimPassword(id: string, password: string) {
  const name = cookieName(id);
  const value = encodeURIComponent(password);
  // 365 days, Lax for safety; do not set Secure to support http://localhost
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try { localStorage.setItem(`claim:${id}:password`, password); } catch {}
}

export function getClaimPassword(id: string): string | undefined {
  const name = cookieName(id) + '=';
  const parts = document.cookie.split(';');
  for (let p of parts) {
    p = p.trim();
    if (p.startsWith(name)) {
      try { return decodeURIComponent(p.substring(name.length)); } catch { return p.substring(name.length); }
    }
  }
  // Fallback to legacy localStorage
  try {
    const saved = localStorage.getItem(`claim:${id}:password`) || '';
    return saved || undefined;
  } catch {}
  return undefined;
}

export function clearClaimPassword(id: string) {
  const name = cookieName(id);
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  try { localStorage.removeItem(`claim:${id}:password`); } catch {}
}

