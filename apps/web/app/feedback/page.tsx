"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitFeedback, type FeedbackState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FeedbackState = { sent: false, error: null };

export default function FeedbackPage() {
  const t = useTranslations("Feedback");
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {state.sent ? (
            <p className="text-sm">{t("sentMessage")}</p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">{t("messageLabel")}</Label>
                <Textarea id="message" name="message" required rows={5} placeholder={t("messagePlaceholder")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input id="email" name="email" type="email" autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="photos">{t("photosLabel")}</Label>
                <Input id="photos" name="photos" type="file" accept="image/*" multiple />
                <p className="text-xs text-muted-foreground">{t("photosHint")}</p>
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? t("sending") : t("send")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
