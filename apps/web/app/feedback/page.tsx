"use client";

import { useActionState } from "react";
import { submitFeedback, type FeedbackState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FeedbackState = { sent: false, error: null };

export default function FeedbackPage() {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Send us feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {state.sent ? (
            <p className="text-sm">Thanks — your feedback has been sent. We read every message.</p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Your feedback</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="What's working, what's not, what would make AfroDeals better?"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email (optional — so we can reply)</Label>
                <Input id="email" name="email" type="email" autoComplete="email" />
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send feedback"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
