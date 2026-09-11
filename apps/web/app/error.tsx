"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { TriangleAlert, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

// Diagnosed from a real report: a user's tab left open across a deploy tried to submit a Server
// Action (e.g. saving an edited listing) and got this generic error repeatedly, retrying every
// ~20s via the old "Try again" button with no server-side error ever logged -- because reset()
// only clears the React error-boundary state, it doesn't fetch the new deployment's JS bundle, so
// every retry re-ran the exact same stale action reference and failed the exact same way forever.
// Next.js's own runtime throws a specific, recognizable message for this ("Failed to find Server
// Action ... This request might be from an older or newer deployment") -- detected here to show
// the one thing that actually fixes it (a real page reload, not a state reset) instead of a button
// that looked like it should help but couldn't.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  const isStaleDeployment = useMemo(
    () => /failed to find server action|older or newer deployment/i.test(error.message),
    [error.message],
  );

  if (isStaleDeployment) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#e89818]/10 text-[#e89818]">
          <RefreshCw className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold">A new version of AfroDeals is ready</h1>
        <p className="text-sm text-muted-foreground">
          This page was open from before an update — refresh to load the latest version and continue where you left off.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-2 gap-1.5">
          <RefreshCw className="size-4" />
          Refresh the page
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        That's on us, not you — try again, and let us know if it keeps happening.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/feedback" className={buttonVariants({ variant: "outline" })}>
          Report this
        </Link>
      </div>
    </div>
  );
}
