"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { setClaimPassword } from "@/lib/auth";

export default function Home() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialId = searchParams?.get('id') || '';
  const errorKey = searchParams?.get('error');
  const [claimId, setClaimId] = useState(initialId);
  const [pwd, setPwd] = useState("");

  function openClaim(e: React.FormEvent) {
    e.preventDefault();
    const id = claimId.trim();
    if (!id) return alert("请输入报销单ID");
    try {
      if (pwd.trim()) setClaimPassword(id, pwd.trim());
    } catch {}
    window.location.href = `/claim/${encodeURIComponent(id)}?origin=entry`;
  }
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md border rounded p-6 bg-background space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-center">{t('brand')}</h1>
        </div>
        <div className="grid gap-4">
          {errorKey === 'idOrPassword' && (
            <div className="text-sm rounded border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200 px-3 py-2">
              {t('idOrPasswordError')}
            </div>
          )}
          <form onSubmit={openClaim} className="grid gap-3">
            <div>
              <label className="block text-sm mb-1">{t('claimId')}</label>
              <input value={claimId} onChange={(e) => setClaimId(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('claimId')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('passwordOptional')}</label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('passwordOptional')} />
            </div>
            <button type="submit" className="w-full px-4 py-2 rounded border hover:bg-black/5 dark:hover:bg-white/10">{t('openExisting')}</button>
          </form>
          <div>{t('newClaimPrompt')}</div>
          <Link href="/claim/new" className="w-full inline-flex items-center justify-center px-4 py-2 rounded bg-foreground text-background font-medium">
            {t('newClaim')}
          </Link>
        </div>
      </div>
    </div>
  );
}
