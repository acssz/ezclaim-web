"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { setClaimPassword } from "@/lib/auth";

export default function Home() {
  const { t } = useI18n();
  const [claimId, setClaimId] = useState("");
  const [pwd, setPwd] = useState("");

  function openClaim(e: React.FormEvent) {
    e.preventDefault();
    const id = claimId.trim();
    if (!id) return alert("请输入报销单ID");
    try {
      if (pwd.trim()) setClaimPassword(id, pwd.trim());
    } catch {}
    window.location.href = `/claim/${id}`;
  }
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t('welcome')}</h1>
        <p className="text-black/70 dark:text-white/70">{t('tagline')}</p>
        <div className="flex gap-3">
          <Link href="/claim/new" className="px-4 py-2 rounded bg-foreground text-background font-medium">{t('newClaim')}</Link>
          <a href="#" className="px-4 py-2 rounded border" onClick={(e) => { e.preventDefault(); alert(t('adminSoon')); }}>{t('adminSoon')}</a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('openExisting')}</h2>
        <form onSubmit={openClaim} className="grid gap-3 sm:grid-cols-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">{t('claimId')}</label>
            <input value={claimId} onChange={(e) => setClaimId(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('claimId')} />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm mb-1">{t('passwordOptional')}</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('passwordOptional')} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="px-4 py-2 rounded bg-foreground text-background">{t('openClaim')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
