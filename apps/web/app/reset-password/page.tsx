"use client";

import { useActionState, useState } from "react";
import { resetPassword, type ResetPasswordState } from "./actions";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ResetPasswordState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
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
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
