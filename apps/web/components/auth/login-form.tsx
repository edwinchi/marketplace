"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login, type AuthFormState } from "@/app/login/actions";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: AuthFormState = { error: null };

export function LoginForm({ next = "/" }: { next?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton />

      <div className="relative flex items-center justify-center text-xs text-muted-foreground">
        <Separator className="absolute inset-x-0" />
        <span className="relative bg-card px-2">{t("orUseEmail")}</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <a href="/forgot-password" className="text-xs underline">
              {t("forgotPassword")}
            </a>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          {/* UI only for now — not yet wired to a different session length. */}
          <input type="checkbox" name="remember" defaultChecked className="mt-0.5" />
          Stay signed in on this device
        </label>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? t("signingIn") : t("logIn")}
        </Button>
      </form>
    </div>
  );
}
