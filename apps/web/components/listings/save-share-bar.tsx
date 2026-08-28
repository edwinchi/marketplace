"use client";

import { useState, useTransition } from "react";
import { Heart, Share2, Check } from "lucide-react";
import { toggleFavorite } from "@/app/listings/favorite-actions";
import { cn } from "@/lib/utils";

export function SaveShareBar({
  listingId,
  title,
  initialFavorited,
  signedIn,
}: {
  listingId: string;
  title: string;
  initialFavorited: boolean;
  signedIn: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-4 text-sm">
      <button
        type="button"
        aria-pressed={favorited}
        disabled={pending}
        className={cn("flex items-center gap-1.5 hover:underline", favorited && "text-destructive")}
        onClick={() => {
          if (!signedIn) {
            window.location.href = "/login";
            return;
          }
          const next = !favorited;
          setFavorited(next);
          startTransition(async () => {
            const { error } = await toggleFavorite(listingId, !next);
            if (error) setFavorited(!next);
          });
        }}
      >
        <Heart className={cn("size-4", favorited && "fill-destructive")} />
        {favorited ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 hover:underline"
        onClick={async () => {
          const url = window.location.href;
          if (navigator.share) {
            try {
              await navigator.share({ title, url });
              return;
            } catch {
              // user cancelled the share sheet — fall through to clipboard as a no-op
            }
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
