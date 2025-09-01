"use client";

import { useI18n, type Lang } from "@/lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const options: Array<{ code: Lang; label: string }> = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'de-CH', label: 'Deutsch (CH)' },
    { code: 'fr', label: 'Français' },
  ];
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="text-sm rounded border bg-transparent px-2 py-1"
      aria-label="Language"
    >
      {options.map(o => (
        <option key={o.code} value={o.code}>{o.label}</option>
      ))}
    </select>
  );
}

