"use client";

import { useEffect, useMemo, useState } from "react";
import { Api } from "@/lib/api";
import type {
  ClaimRequest,
  PhotoResponse,
  TagResponse,
  Currency,
  PayoutInfo,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { setClaimPassword } from "@/lib/auth";

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type UploadItem = {
  file: File;
  key: string;
  status: "idle" | "signing" | "uploading" | "creating" | "done" | "error";
  error?: string;
  photo?: PhotoResponse;
};

const currencies: Currency[] = ["CHF", "USD", "EUR", "CNY", "GBP"];

function makeObjectKey(file: File): string {
  const today = new Date().toISOString().slice(0, 10);
  const uuid = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `uploads/${today}/${uuid}_${safeName}`;
}

export default function NewClaimPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [successId, setSuccessId] = useState<string | undefined>();

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [expenseAt, setExpenseAt] = useState<string>(""); // yyyy-MM-ddTHH:mm
  const [recipient, setRecipient] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [payout, setPayout] = useState<PayoutInfo>({});

  useEffect(() => {
    Api.listTags().then(setTags).catch(() => setTags([]));
  }, []);

  const uploadedPhotos = useMemo(() => uploads.filter((u) => u.status === "done" && !!u.photo).map((u) => u.photo as PhotoResponse), [uploads]);

  async function handleFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    const items: UploadItem[] = Array.from(files).map((file) => ({ file, key: makeObjectKey(file), status: "idle" }));
    setUploads((prev) => [...prev, ...items]);

    for (const item of items) {
      try {
        setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, status: "signing", error: undefined } : u)));
        const presign = await Api.presignUpload({ contentType: item.file.type || "application/octet-stream", key: item.key });
        setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, status: "uploading" } : u)));
        await Api.uploadToPresignedUrl(presign.url, item.file, presign.headers);
        setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, status: "creating" } : u)));
        const photo = await Api.createPhotoRecord({ key: item.key });
        setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, status: "done", photo } : u)));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, status: "error", error: msg } : u)));
      }
    }
  }

  function validate(): string | undefined {
    if (!title.trim()) return "请填写报销标题";
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return "报销金额需为正数";
    if (!expenseAt) return "请选择消费发生时间";
    // minimal payout validation
    if (!payout.iban && !payout.accountNumber) return "请至少填写 IBAN 或 账户号";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const req: ClaimRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        currency,
        expenseAt: new Date(expenseAt).toISOString(),
        payout,
        recipient: recipient.trim() || undefined,
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
        photoIds: uploadedPhotos.length ? uploadedPhotos.map((p) => p.id) : undefined,
        password: password.trim() || undefined,
      };
      const created = await Api.createClaim(req);
      setSuccessId(created.id);
      // Persist password locally for later detail view
      try {
        if (req.password) {
          setClaimPassword(created.id, req.password);
        }
      } catch {}
      // Navigate to detail without exposing password in URL
      router.push(`/claim/view?id=${encodeURIComponent(created.id)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('createTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">{t('fieldTitle')} *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('fieldTitle')} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">{t('fieldDescription')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" rows={3} placeholder={t('fieldDescription')} />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('fieldAmount')} *</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('fieldCurrency')}</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-full rounded border px-3 py-2 bg-transparent">
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('fieldExpenseAt')} *</label>
            <input type="datetime-local" value={expenseAt} onChange={(e) => setExpenseAt(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('fieldRecipient')}</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('fieldRecipient')} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('payoutInfo')} *</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">{t('payoutIban')}</label>
              <input value={payout.iban || ''} onChange={(e) => setPayout((p) => ({ ...p, iban: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('payoutAccount')}</label>
              <input value={payout.accountNumber || ''} onChange={(e) => setPayout((p) => ({ ...p, accountNumber: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('payoutBankName')}</label>
              <input value={payout.bankName || ''} onChange={(e) => setPayout((p) => ({ ...p, bankName: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('payoutSwift')}</label>
              <input value={payout.swift || ''} onChange={(e) => setPayout((p) => ({ ...p, swift: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('payoutRouting')}</label>
              <input value={payout.routingNumber || ''} onChange={(e) => setPayout((p) => ({ ...p, routingNumber: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">{t('payoutBankAddress')}</label>
              <input value={payout.bankAddress || ''} onChange={(e) => setPayout((p) => ({ ...p, bankAddress: e.target.value }))} className="w-full rounded border px-3 py-2 bg-transparent" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('tags')}</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const active = selectedTagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagIds((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))
                  }
                  className={classNames(
                    "px-3 py-1 rounded border text-sm",
                    active ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                  style={{ borderColor: t.color || undefined }}
                  title={t.label}
                >
                  {t.label}
                </button>
              );
            })}
            {!tags.length && <div className="text-sm text-black/60 dark:text-white/60">无可用标签</div>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('attachments')}</h2>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => handleFilesChosen(e.target.files)}
            className="block"
          />
          <ul className="space-y-2">
            {uploads.map((u) => (
              <li key={u.key} className="text-sm flex items-center justify-between gap-2 border rounded p-2">
                <div className="truncate">{u.file.name}</div>
                <div className="text-xs text-black/60 dark:text-white/60">
                  {u.status === "idle" && "等待中"}
                  {u.status === "signing" && "获取上传地址..."}
                  {u.status === "uploading" && "上传中..."}
                  {u.status === "creating" && "保存记录..."}
                  {u.status === "done" && "已上传"}
                  {u.status === "error" && <span className="text-red-600">失败: {u.error}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('password')}</h2>
          <p className="text-sm text-black/60 dark:text-white/60">{t('passwordHint')}</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2 bg-transparent" placeholder={t('password')} />
        </section>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className={classNames(
              "px-4 py-2 rounded bg-foreground text-background font-medium",
              submitting && "opacity-70 cursor-not-allowed"
            )}
          >
            {submitting ? "..." : t('submit')}
          </button>
          {successId && <span className="text-sm">已创建：{successId}</span>}
        </div>
      </form>
    </div>
  );
}
