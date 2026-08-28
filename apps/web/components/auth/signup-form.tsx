"use client";

import { useActionState, useState } from "react";
import { signup, type SignupFormState } from "@/app/signup/actions";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: SignupFormState = { error: null, checkEmail: false };

export function SignupForm({ next = "/" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [password, setPassword] = useState("");

  if (state.checkEmail) {
    return (
      <p className="text-sm">
        Check your email for a confirmation link to finish creating your account.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton />

      <div className="relative flex items-center justify-center text-xs text-muted-foreground">
        <Separator className="absolute inset-x-0" />
        <span className="relative bg-card px-2">Or use your email</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">Your name on AfroDeals</Label>
          <Input id="display_name" name="display_name" required maxLength={30} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordRequirements password={password} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password_confirm">Repeat new password</Label>
          <Input id="password_confirm" name="password_confirm" type="password" required autoComplete="new-password" />
        </div>

        <p className="text-xs text-muted-foreground">
          By creating an account you agree to our <a href="/terms" className="underline">Terms of Use</a>.
        </p>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
