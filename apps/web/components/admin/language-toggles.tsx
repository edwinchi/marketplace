"use client";

import { useState, useTransition } from "react";
import { updateLocaleEnabled } from "@/app/admin/settings-actions";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { locale: "fr", label: "Français (French)" },
  { locale: "ar", label: "العربية (Arabic)" },
  { locale: "zh", label: "中文 (Chinese, Mandarin)" },
];

function LocaleSwitch({ locale, label, initialEnabled }: { locale: string; label: string; initialEnabled: boolean }) {
  const [checked, setChecked] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await updateLocaleEnabled(locale, next);
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={toggle}
        disabled={pending}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60", checked ? "bg-[#008200]" : "bg-muted")}
      >
        <span className={cn("absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-200", checked && "translate-x-5")} />
      </button>
    </div>
  );
}

// English isn't listed here -- it's i18n/request.ts's permanent DEFAULT_LOCALE and the fallback
// every disabled/invalid locale resolves to, so there's nothing meaningful to toggle for it.
export function LanguageToggles({ disabledLocales }: { disabledLocales: string[] }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#082040]">Languages</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        Turn a language off to hide it from the language switcher — anyone already using it falls back to English on their next page load. English itself is
        always on.
      </p>
      <div className="mt-3 divide-y">
        {LANGUAGES.map((l) => (
          <LocaleSwitch key={l.locale} locale={l.locale} label={l.label} initialEnabled={!disabledLocales.includes(l.locale)} />
        ))}
      </div>
    </div>
  );
}
