"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setLocale } from "@/app/actions/set-locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<string, string> = { en: "EN", fr: "FR" };

export function LanguageSwitcher({ locale }: { locale: string }) {
  const [pending, startTransition] = useTransition();

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
      <SelectTrigger size="sm" className="gap-1 border-none shadow-none">
        <Globe className="size-4 text-muted-foreground" />
        <SelectValue>{(value: string | null) => LABELS[value ?? "en"]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
      </SelectContent>
    </Select>
  );
}
