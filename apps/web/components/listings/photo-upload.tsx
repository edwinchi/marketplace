"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 24;

// Files travel to app/listings/actions.ts inside the same <form>'s FormData (Server Actions
// accept File values natively) — no separate upload endpoint or client-side Supabase call
// needed. This component only manages local selection, reordering, and preview.
export function PhotoUpload({ initialFiles, onFilesChange }: { initialFiles?: File[]; onFilesChange?: (files: File[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    onFilesChange?.(files);
    // onFilesChange is expected to be a stable callback (or the parent should useCallback it) —
    // including it would re-run this every render if the parent passes an inline arrow function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // initialFiles arrives asynchronously (the AI-assist draft's photo has to be fetched and decoded
  // from a data URL after mount — see new-listing-step2-form.tsx), so it can't just be the useState
  // initializer above. Seed exactly once, and only if the user hasn't already picked their own
  // photos in the meantime.
  const seededDraft = useRef(false);
  useEffect(() => {
    if (seededDraft.current || !initialFiles?.length) return;
    seededDraft.current = true;
    setFiles((prev) => (prev.length > 0 ? prev : initialFiles));
  }, [initialFiles]);

  // createObjectURL mints a new, distinct blob URL every time it's called — even for the same
  // File — so calling it inline during render would hand out a fresh unrevoked URL (and a real
  // memory leak) on every reorder/removal, not just when a file is actually added. Caching one
  // URL per File across renders, and revoking it once that File drops out of `files`, keeps it
  // to exactly one live URL per selected photo.
  const urlCache = useRef(new Map<File, string>());
  const previewUrls = files.map((file) => {
    let url = urlCache.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      urlCache.current.set(file, url);
    }
    return url;
  });
  useEffect(() => {
    for (const [file, url] of urlCache.current) {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
        urlCache.current.delete(file);
      }
    }
  }, [files]);
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
    };
  }, []);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    // Snapshot into a plain array *now* — newFiles is a live reference to the input's own .files,
    // and the onChange handler resets that input's value right after calling this (so the same
    // control can be reused for the next selection). That reset mutates the live FileList to
    // empty; reading it lazily inside the setState updater (as this used to) could see that empty
    // list instead of the original selection once React re-invokes the updater, silently dropping
    // every add after the first.
    const snapshot = Array.from(newFiles);
    setFiles((prev) => [...prev, ...snapshot].slice(0, MAX_PHOTOS));
  }

  function removeAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function moveTo(from: number, to: number) {
    if (from === to) return;
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {files.map((_file, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) moveTo(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "relative size-24 shrink-0 cursor-grab overflow-hidden rounded-md border active:cursor-grabbing",
              dragIndex === i && "opacity-40",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image */}
            <img src={previewUrls[i]} alt="" className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                Cover
              </span>
            )}
            <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground">
              <GripVertical className="size-3" />
            </span>
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <label className="flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground">
            <Camera className="size-5" />
            <span className="text-xs">Add photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {files.length}/{MAX_PHOTOS} photos used. Drag a photo to reorder — the first one becomes the cover.
      </p>
      {files.length > 0 && files.length < 4 && (
        <p className="mt-2 rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
          Listings with 4 or more photos, shot from a few angles, tend to get more views.
        </p>
      )}
      {/* The actual File objects need to reach the <form>'s FormData under a stable field name —
          a plain uncontrolled file input holding the current selection does that; we keep it in
          sync with `files` via a ref-less trick: a hidden input can't hold File objects, so this
          component instead exposes its own file input as the field the form submits. */}
      <PhotoFileList files={files} />
    </div>
  );
}

// A real <input type="file"> is the only element that can carry File objects into FormData, and
// its FileList is normally browser-managed (can't be set programmatically) — DataTransfer is the
// standard workaround to synthesize one from our own `files` state so removals/additions/reorders
// here are reflected in what actually submits. DataTransfer doesn't exist in Node — Next SSRs
// Client Components on first render too, so this must no-op server-side rather than throw.
function PhotoFileList({ files }: { files: File[] }) {
  if (typeof DataTransfer === "undefined") {
    return <input type="file" name="photos" multiple hidden />;
  }
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return <input type="file" name="photos" multiple hidden ref={(el) => { if (el) el.files = dt.files; }} />;
}
