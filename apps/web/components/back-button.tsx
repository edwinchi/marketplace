"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const t = useTranslations("Common");
  return (
    <Button variant="outline" size="sm" className="gap-1.5 transition-transform duration-150 hover:-translate-x-0.5" onClick={() => router.back()}>
      <ArrowLeft className="size-4" />
      {t("back")}
    </Button>
  );
}
