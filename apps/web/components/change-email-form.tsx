"use client";

import { useActionState } from "react";
import { changeEmail, type ChangeEmailState } from "@/app/identity/v2/change-email/initiate/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangeEmailState = { error: null, sent: false };

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(changeEmail, initialState);

  if (state.sent) {
    return (
      <p className="text-sm">
        Check your new inbox for a confirmation link — your email won&apos;t change until you click it.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Current email</Label>
        <Input value={currentEmail} disabled />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new_email">New email</Label>
        <Input id="new_email" name="new_email" type="email" required autoComplete="email" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Sending…" : "Send confirmation link"}
      </Button>
    </form>
  );
}
