"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/listings/favorite-actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({ listingId, initialFavorited, signedIn }: { listingId: string; initialFavorited: boolean; signedIn: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      aria-pressed={favorited}
      disabled={pending}
      className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur transition-colors hover:bg-background"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
      <Heart className={cn("size-4", favorited && "fill-destructive text-destructive")} />
    </button>
  );
}
