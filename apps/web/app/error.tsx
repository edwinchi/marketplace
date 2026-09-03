"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        That's on us, not you — try again, and let us know if it keeps happening.
      </p>
      <div className="mt-2 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/feedback" className={buttonVariants({ variant: "outline" })}>
          Report this
        </Link>
      </div>
    </div>
  );
}
