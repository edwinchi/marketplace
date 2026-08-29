"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Lock, LogIn, Mail } from "lucide-react";
import { login, type AuthFormState } from "@/app/login/actions";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthField } from "@/components/auth/auth-field";
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
        <AuthField icon={Mail} id="email" name="email" type="email" required autoComplete="email" label={t("email")} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <a href="/forgot-password" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
              {t("forgotPassword")}
            </a>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-10 pl-9" />
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          {/* UI only for now — not yet wired to a different session length. */}
          <input type="checkbox" name="remember" defaultChecked className="mt-0.5 accent-primary" />
          Stay signed in on this device
        </label>

        {state.error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending}
          size="lg"
          className="h-11 gap-2 rounded-xl text-[0.95rem] shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
        >
          <LogIn className="size-4" />
          {pending ? t("signingIn") : t("logIn")}
        </Button>
      </form>
    </div>
  );
}
