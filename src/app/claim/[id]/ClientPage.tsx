"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Api, HttpError } from "@/lib/api";
import type { ClaimResponse, ClaimStatus } from "@/lib/types";
import { getClaimPassword, setClaimPassword } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ClaimFlowchart } from "@/components/ClaimFlowchart";

export default function ClientPage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || searchParams?.get("id") || "";
  const { t } = useI18n();

  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [effectivePassword, setEffectivePassword] = useState<string | undefined>(undefined);
  const [passwordChecked, setPasswordChecked] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  type DownUrl = { url: string; expiresAt?: string };
  const [downUrls, setDownUrls] = useState<Record<string, DownUrl>>({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const saved = getClaimPassword(id);
    setEffectivePassword(saved);
    setPasswordChecked(true);
  }, [id]);

  const lastLoadIdRef = useRef(0);
  const load = useCallback(async () => {
    if (!id || !passwordChecked) return;
    const thisLoadId = ++lastLoadIdRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const c = await Api.getClaim(id, effectivePassword || undefined);
      if (lastLoadIdRef.current !== thisLoadId) return;
      setClaim(c);
      // Fetch download URLs for each photo
      if (c.photos && c.photos.length) {
        const entries = await Promise.all(
          c.photos.map(async (p) => {
            try {
              const d = await Api.getPhotoDownloadUrl(p.id, 900);
              return [p.id, { url: d.url, expiresAt: d.expiresAt }] as const;
            } catch {
              return [p.id, { url: "" }] as const;
            }
          })
        );
        if (lastLoadIdRef.current !== thisLoadId) return;
        setDownUrls(Object.fromEntries(entries));
      } else {
        setDownUrls({});
      }
    } catch (e: unknown) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
        // Need or wrong password → open modal
        setAskPassword(true);
        // If we already tried with a password, mark error to display feedback
        setPasswordError(!!effectivePassword);
      } else {
        const msg = e instanceof Error ? e.message : '加载失败';
        setError(msg);
      }
      setClaim(null);
    } finally {
      if (lastLoadIdRef.current === thisLoadId) setLoading(false);
    }
  }, [id, effectivePassword, passwordChecked]);

  useEffect(() => {
    void load();
  }, [load]);

  function fmt(dt: string) {
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  }

  function isExpired(expiresAt?: string) {
    if (!expiresAt) return false;
    const t = Date.parse(expiresAt);
    if (Number.isNaN(t)) return false;
    // refresh slightly ahead of expiry
    return Date.now() > t - 30_000;
  }

  const ensureFreshUrl = useCallback(async (photoId: string) => {
    const current = downUrlsRef.current[photoId];
    if (!current || !current.url || isExpired(current.expiresAt)) {
      try {
        const d = await Api.getPhotoDownloadUrl(photoId, 900);
        setDownUrls((prev) => ({ ...prev, [photoId]: { url: d.url, expiresAt: d.expiresAt } }));
      } catch {
        // ignore
      }
    }
  }, []);

  // Periodically refresh nearing-expiry URLs while on page
  const downUrlsRef = useRef(downUrls);
  useEffect(() => {
    downUrlsRef.current = downUrls;
  }, [downUrls]);
  useEffect(() => {
    if (!claim?.photos?.length) return;
    const iv = setInterval(() => {
      for (const p of claim.photos!) {
        const entry = downUrlsRef.current[p.id];
        if (!entry || isExpired(entry.expiresAt)) {
          void ensureFreshUrl(p.id);
        }
      }
    }, 60_000);
    return () => clearInterval(iv);
  }, [claim?.photos, ensureFreshUrl]);

  async function updateStatus(newStatus: ClaimStatus) {
    if (!id) return;
    setUpdating(true);
    setError(undefined);
    try {
      const updated = await Api.patchClaim(id, { status: newStatus, password: effectivePassword || undefined });
      setClaim(updated);
    } catch (e: unknown) {
      if (e instanceof HttpError && e.status === 403) {
        setAskPassword(true);
        setPasswordError(!!effectivePassword);
      } else setError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setUpdating(false);
    }
  }

  function copyLink() {
    if (typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    u.searchParams.delete('password');
    navigator.clipboard?.writeText(u.toString()).catch(() => {});
  }

  // Require password: render only the password prompt, hide page content
  if (askPassword && passwordChecked) {
    return (
      <div className="w-full min-h-[50vh] flex items-center justify-center">
        <div className="w-full max-w-sm rounded bg-background p-4 border">
          <h3 className="font-medium mb-2">请输入访问密码</h3>
          <PasswordPrompt
            onSubmit={(pwd) => {
              if (!id) return;
              setClaimPassword(id, pwd);
              setEffectivePassword(pwd);
              setAskPassword(false);
              setPasswordError(false);
            }}
            onCancel={() => { setAskPassword(false); setPasswordError(false); }}
            error={passwordError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('detailTitle')}</h1>
        <div className="flex items-center gap-2">
          <CopyButton onCopy={copyLink} label={t('copy')} doneLabel={t('copied')} />
          <Link href="/claim/new" className="px-3 py-1.5 rounded border text-sm hover:bg-black/5 dark:hover:bg-white/10">{t('newClaim')}</Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <button onClick={load} className="px-3 py-2 rounded bg-foreground text-background">{t('refresh')}</button>
      </div>

      {loading && <div>加载中...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* When askPassword is true we early-return above, so no content leaks */}

      {claim && (
        <div className="space-y-4">
          {/* 流程图 */}
          <section className="space-y-2">
            <h3 className="font-medium">{t('process')}</h3>
            <ClaimFlowchart current={claim.status} />
          </section>

          <section className="border rounded p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{claim.title}</h2>
              <span className="text-xs rounded px-2 py-1 border">{t(`status_${claim.status}`)}</span>
            </div>
            <div className="mt-3 p-3 rounded border flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">{t('claimId')}</div>
                <div className="font-mono text-sm break-all">{claim.id}</div>
                <div className="text-xs text-black/60 dark:text-white/60">{t('claimIdNote')}</div>
              </div>
              <CopyButton onCopy={() => navigator.clipboard?.writeText(claim.id)} label={t('copy')} doneLabel={t('copied')} className="shrink-0" />
            </div>
            {claim.description && <p className="mt-2 text-sm whitespace-pre-wrap">{claim.description}</p>}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-black/60 dark:text-white/60">{t('amount')}：</span>
                <span>
                  {claim.amount} {claim.currency}
                </span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/60">{t('expenseAt')}：</span>
                <span>{fmt(claim.expenseAt)}</span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/60">{t('createdAt')}：</span>
                <span>{fmt(claim.createdAt)}</span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/60">{t('updatedAt')}：</span>
                <span>{fmt(claim.updatedAt)}</span>
              </div>
              {claim.recipient && (
                <div>
                  <span className="text-black/60 dark:text-white/60">{t('recipient')}：</span>
                  <span>{claim.recipient}</span>
                </div>
              )}
            </div>
            {claim.tags && claim.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {claim.tags.map((t) => (
                  <span key={t.id} className="text-xs rounded px-2 py-1 border" title={t.label} style={{ borderColor: t.color || undefined }}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </section>

          {claim.photos && claim.photos.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-medium">{t('attachmentsShort')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.photos.map((p) => {
                  const entry = downUrls[p.id];
                  const url = entry?.url || '';
                  return (
                    <a
                      key={p.id}
                      href={url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded overflow-hidden"
                      onMouseEnter={() => ensureFreshUrl(p.id)}
                      onFocus={() => ensureFreshUrl(p.id)}
                    >
                      {/* Use image if possible, otherwise show key */}
                      {url && p.key.toLowerCase().match(/\.(png|jpe?g|gif|webp|bmp|svg)$/) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={p.key} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="p-2 text-xs truncate">{p.key}</div>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-medium">{t('actions')}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={updating || claim.status !== 'SUBMITTED'}
                onClick={() => updateStatus('WITHDRAW')}
                className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
                title={claim.status !== 'SUBMITTED' ? 'Only from SUBMITTED' : undefined}
              >
                {t('withdraw')}
              </button>
              <button
                disabled={updating || claim.status !== 'PAID'}
                onClick={() => updateStatus('FINISHED')}
                className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
                title={claim.status !== 'PAID' ? 'Only from PAID' : undefined}
              >
                {t('confirmFinish')}
              </button>
            </div>
            
          </section>
        </div>
      )}
    </div>
  );
}

function PasswordPrompt({ onSubmit, onCancel, error }: { onSubmit: (pwd: string) => void; onCancel: () => void; error?: boolean }) {
  const [v, setV] = useState('');
  const { t } = useI18n();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onSubmit(v.trim());
      }}
      className="space-y-3"
    >
      {error && <div className="text-sm text-red-600">{t('passwordWrong')}</div>}
      <input autoFocus type="password" value={v} onChange={(e) => setV(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('enterPassword')} />
      <div className="flex justify-end gap-2">
        <button type="button" className="px-3 py-1.5 rounded border" onClick={onCancel}>{t('cancel')}</button>
        <button type="submit" className="px-3 py-1.5 rounded bg-foreground text-background">{t('confirm')}</button>
      </div>
    </form>
  );
}

function CopyButton({ onCopy, label, doneLabel, className }: { onCopy: () => void | Promise<void>; label: string; doneLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await onCopy(); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={(className ? className + ' ' : '') + "px-3 py-1.5 rounded border text-sm hover:bg-black/5 dark:hover:bg-white/10"}
    >
      {copied ? doneLabel : label}
    </button>
  );
}
