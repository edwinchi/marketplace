"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Lock, Mail, User, UserPlus } from "lucide-react";
import { signup, type SignupFormState } from "@/app/signup/actions";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: SignupFormState = { error: null, checkEmail: false };

export function SignupForm({ next = "/" }: { next?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [password, setPassword] = useState("");

  if (state.checkEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Check your email for a confirmation link to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton />

      <div className="relative flex items-center justify-center text-xs text-muted-foreground">
        <Separator className="absolute inset-x-0" />
        <span className="relative bg-card px-2">{t("orUseEmail")}</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <AuthField icon={User} id="display_name" name="display_name" required maxLength={30} autoComplete="name" label={t("yourName")} />
        <AuthField icon={Mail} id="email" name="email" type="email" required autoComplete="email" label={t("email")} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <PasswordRequirements password={password} />
        </div>
        <AuthField
          icon={Lock}
          id="password_confirm"
          name="password_confirm"
          type="password"
          required
          autoComplete="new-password"
          label={t("repeatPassword")}
        />

        <p className="text-xs text-muted-foreground">
          {t("termsAgreement")}{" "}
          <a href="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
            {t("termsOfUse")}
          </a>
          .
        </p>

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
          <UserPlus className="size-4" />
          {pending ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>
    </div>
  );
}
