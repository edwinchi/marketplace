"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { backfillLocationCoordinates } from "@/app/admin/backfill-coordinates-action";
import { Button } from "@/components/ui/button";

// Same shape as BackfillEmbeddingsButton: each click runs one batch (see backfillLocationCoordinates);
// click again while `remaining` is above 0. Safe to repeat -- only locations still missing
// coordinates are touched.
export function BackfillCoordinatesButton({ initialRemaining }: { initialRemaining: number }) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [lastRun, setLastRun] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await backfillLocationCoordinates();
        setRemaining(result.remaining);
        setLastRun({ processed: result.processed, failed: result.failed });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't run the backfill.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Distance search coordinates</p>
      <p className="mt-1 text-xs text-muted-foreground">
        New listings get coordinates when posted — this fills in older locations so they show up in distance
        (&quot;within X km&quot;) searches. Non-Dutch places are looked up about once a second, so a batch can take a while.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={run} disabled={pending || remaining === 0} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Running…" : remaining === 0 ? "All caught up" : `Backfill (${remaining} left)`}
        </Button>
        {lastRun && !pending && (
          <span className="text-xs text-muted-foreground">
            Last run: {lastRun.processed} located{lastRun.failed > 0 ? `, ${lastRun.failed} failed` : ""}.
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
