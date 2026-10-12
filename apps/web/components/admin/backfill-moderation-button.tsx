"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { backfillListingModeration } from "@/app/admin/backfill-moderation-action";
import { Button } from "@/components/ui/button";

// Same click-to-run-a-batch shape as BackfillEmbeddingsButton. A listing whose AI check fails stays
// pending and is retried on the next click, so `remaining` only reaches 0 once every listing has
// genuinely been screened.
export function BackfillModerationButton({ initialRemaining }: { initialRemaining: number }) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [lastRun, setLastRun] = useState<{ processed: number; flagged: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await backfillListingModeration();
        setRemaining(result.remaining);
        setLastRun({ processed: result.processed, flagged: result.flagged, failed: result.failed });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't run the pre-screen.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Content pre-screen</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Every new or edited listing is screened automatically. This screens existing listings that never were; anything
        flagged goes to the moderation queue.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={run} disabled={pending || remaining === 0} className="gap-1.5">
          <ShieldCheck className={`size-3.5 ${pending ? "animate-pulse" : ""}`} />
          {pending ? "Screening…" : remaining === 0 ? "All screened" : `Screen listings (${remaining} left)`}
        </Button>
        {lastRun && !pending && (
          <span className="text-xs text-muted-foreground">
            Last run: {lastRun.processed} screened, {lastRun.flagged} flagged
            {lastRun.failed > 0 ? `, ${lastRun.failed} couldn't be checked` : ""}.
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
