"use client";

import { useTranslations } from "next-intl";
import { signInWithFacebook } from "@/app/login/facebook-action";
import { Button } from "@/components/ui/button";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 4C12.95 4 4 12.95 4 24c0 9.98 7.31 18.25 16.87 19.77V29.87h-4.6v-5.4h4.6v-4.02c0-4.55 2.71-7.06 6.85-7.06 1.98 0 4.05.35 4.05.35v4.9h-2.28c-2.25 0-2.95 1.4-2.95 2.83v3h5.06l-.81 5.4h-4.25v13.9C36.69 42.25 44 33.98 44 24 44 12.95 35.05 4 24 4z"
      />
    </svg>
  );
}

export function FacebookButton() {
  const t = useTranslations("Auth");
  return (
    <form action={signInWithFacebook}>
      <Button type="submit" variant="outline" className="w-full gap-2">
        <FacebookIcon />
        {t("continueWithFacebook")}
      </Button>
    </form>
  );
}
