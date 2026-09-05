"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { backfillListingEmbeddings } from "@/app/admin/backfill-embeddings-action";
import { Button } from "@/components/ui/button";

// Each click only processes one batch (see the action's own BACKFILL_BATCH_SIZE comment) -- click
// again while `remaining` is still above 0 to keep going. Safe to click repeatedly or leave at any
// point: every run only ever touches listings still missing an embedding.
export function BackfillEmbeddingsButton({ initialRemaining }: { initialRemaining: number }) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [lastRun, setLastRun] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await backfillListingEmbeddings();
        setRemaining(result.remaining);
        setLastRun({ processed: result.processed, failed: result.failed });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't run the backfill.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Semantic search embeddings</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Listings only get an embedding when posted or edited from here on — this backfills existing ones so they can
        show up in "Related to your search" too.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={run} disabled={pending || remaining === 0} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Running…" : remaining === 0 ? "All caught up" : `Backfill (${remaining} left)`}
        </Button>
        {lastRun && !pending && (
          <span className="text-xs text-muted-foreground">
            Last run: {lastRun.processed} embedded{lastRun.failed > 0 ? `, ${lastRun.failed} failed` : ""}.
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
