"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setLocale } from "@/app/actions/set-locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<string, string> = { en: "EN", fr: "FR", ar: "AR", zh: "ZH" };
const ALL_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
];

// disabledLocales comes from the admin-flippable language_settings table (see
// lib/language-settings.ts) -- English is never in it (it's the permanent fallback every disabled
// locale resolves to, see i18n/request.ts), so it always renders regardless.
export function LanguageSwitcher({ locale, disabledLocales = [] }: { locale: string; disabledLocales?: string[] }) {
  const [pending, startTransition] = useTransition();
  const options = ALL_OPTIONS.filter((o) => o.value === "en" || !disabledLocales.includes(o.value));

  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(async () => {
          await setLocale(value);
          // router.refresh() alone left stale English content behind in testing (a Router Cache
          // staleness quirk) — a real reload guarantees every Server Component re-reads the new
          // locale cookie, which matters more here than avoiding one extra full page load.
          window.location.reload();
        });
      }}
    >
      {/* bg-transparent: opts this compact nav control out of SelectTrigger's default light-green
          "form field" background -- it's meant to blend into the header, not read as a form field. */}
      <SelectTrigger size="sm" className="gap-1 border-none bg-transparent shadow-none">
        <Globe className="size-4 text-muted-foreground" />
        <SelectValue>{(value: string | null) => LABELS[value ?? "en"]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
