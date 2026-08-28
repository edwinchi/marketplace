"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, ZoomIn, X, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";

export function PhotoGallery({
  images,
  title,
  listingId,
  initialFavorited,
  signedIn,
  favoriteCount,
}: {
  images: string[];
  title: string;
  listingId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  favoriteCount: number;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="size-10" />
      </div>
    );
  }

  const goTo = (i: number) => setActive((i + images.length) % images.length);

  return (
    <div>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
        <Image
          src={images[active]}
          alt={title}
          fill
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="cursor-zoom-in object-cover"
          onClick={() => setLightboxOpen(true)}
          priority
        />
        <FavoriteButton listingId={listingId} initialFavorited={initialFavorited} signedIn={signedIn} />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => goTo(active - 1)}
              className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur hover:bg-background"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => goTo(active + 1)}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur hover:bg-background"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
              {active + 1}/{images.length}
            </span>
          </>
        )}

        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
          {favoriteCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
              <Heart className="size-3 fill-destructive text-destructive" />
              {favoriteCount}
            </span>
          )}
          <button
            type="button"
            aria-label="View full size"
            onClick={() => setLightboxOpen(true)}
            className="flex size-8 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur hover:bg-background"
          >
            <ZoomIn className="size-4" />
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === active ? "border-primary" : "border-transparent"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-background/20 text-white hover:bg-background/30"
          >
            <X className="size-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(active - 1);
                }}
                className="absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-white hover:bg-background/30"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(active + 1);
                }}
                className="absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-white hover:bg-background/30"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div className="relative h-full max-h-[85vh] w-full max-w-4xl">
            <Image src={images[active]} alt={title} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
