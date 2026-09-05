"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 24;

export type ExistingPhoto = { id: string; url: string };
type Item = { key: string } & ({ kind: "existing"; mediaId: string; url: string } | { kind: "new"; file: File });

// Edit's own photo manager, separate from components/listings/photo-upload.tsx (the create-flow
// one) rather than retrofitting it -- that component only ever deals with fresh, not-yet-uploaded
// File objects, and new-listing-step2-form.tsx's AI-draft handoff and use-count logic depend on
// that File[]-only shape. Edit needs a genuinely different thing: a single reorderable list mixing
// already-uploaded photos (identified by their listing_media row id) with brand new files, where
// removing an "existing" item means deleting a real row/storage object on save, not just dropping
// it from local state.
//
// Submits two form fields alongside whatever <form> this sits in: a `photo_manager_present` marker
// (so updateListing can tell "the manager was rendered and submitted zero photos" apart from "this
// caller doesn't use it at all -- leave photos untouched"), and one `photo_order` hidden input per
// surviving item in final order (`existing:<id>` or `new`), so the server can reconstruct exactly
// what changed without guessing from before/after diffs. New files travel in the same `photos`
// input name uploadPhotos() already reads, in the same relative order as their "new" tokens.
export type CoverPhoto = { kind: "existing"; url: string } | { kind: "new"; file: File; previewUrl: string };

export function EditPhotoManager({ initialPhotos, onCoverChange }: { initialPhotos: ExistingPhoto[]; onCoverChange?: (cover: CoverPhoto | null) => void }) {
  const [items, setItems] = useState<Item[]>(() => initialPhotos.map((p) => ({ key: p.id, kind: "existing", mediaId: p.id, url: p.url })));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const newKeyCounter = useRef(0);

  // Building this as a memoized lookup rather than a ref cache mutated inline during render (the
  // previous version) -- reading and writing a ref during render isn't safe under React's rules,
  // since a render that gets thrown away/retried could commit an inconsistent cache. useMemo keyed
  // on `items` recomputes the whole map on every reorder/removal (setItems always produces a new
  // array), which is some redundant create+revoke churn, but it's a plain side-effect-free lookup
  // and the paired cleanup effect below still guarantees exactly one live batch of URLs at a time.
  const previewUrlByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.kind === "new") map.set(item.key, URL.createObjectURL(item.file));
    }
    return map;
  }, [items]);
  useEffect(() => {
    return () => {
      for (const url of previewUrlByKey.values()) URL.revokeObjectURL(url);
    };
  }, [previewUrlByKey]);
  function previewUrl(item: Item): string {
    return item.kind === "existing" ? item.url : previewUrlByKey.get(item.key)!;
  }

  // AI analysis (in listing-form.tsx) always targets whichever photo is currently first -- the
  // one already visible as "Cover" below -- so it needs a ready-to-use preview URL for a "new"
  // item too, not just the File, reusing this component's own object-URL cache rather than making
  // the parent mint a second one for the same file.
  useEffect(() => {
    const cover = items[0];
    if (!cover) onCoverChange?.(null);
    else if (cover.kind === "existing") onCoverChange?.({ kind: "existing", url: cover.url });
    else onCoverChange?.({ kind: "new", file: cover.file, previewUrl: previewUrl(cover) });
    // onCoverChange is expected to be a stable callback (useState setter or useCallback) -- see
    // the identical reasoning in photo-upload.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const snapshot = Array.from(newFiles).map((file) => ({ key: `new-${newKeyCounter.current++}`, kind: "new" as const, file }));
    setItems((prev) => [...prev, ...snapshot].slice(0, MAX_PHOTOS));
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveTo(from: number, to: number) {
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <div
            key={item.key}
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
            {/* eslint-disable-next-line @next/next/no-img-element -- mix of remote (existing) and local blob (new) previews, neither optimizable */}
            <img src={previewUrl(item)} alt="" className="size-full object-cover" />
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
        {items.length < MAX_PHOTOS && (
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
        {items.length}/{MAX_PHOTOS} photos used. Drag a photo to reorder — the first one becomes the cover.
      </p>
      <input type="hidden" name="photo_manager_present" value="1" />
      {items.map((item) => (
        <input key={item.key} type="hidden" name="photo_order" value={item.kind === "existing" ? `existing:${item.mediaId}` : "new"} />
      ))}
      <NewPhotoFileList files={items.filter((it): it is Item & { kind: "new" } => it.kind === "new").map((it) => it.file)} />
    </div>
  );
}

// Same DataTransfer synthesis trick as photo-upload.tsx's PhotoFileList -- see that file's comment
// for why a real <input type="file"> is the only way to carry File objects into this <form>'s
// FormData. Only the "new" subset travels this way; existing photos are referenced by id via the
// photo_order hidden inputs above, not re-uploaded.
function NewPhotoFileList({ files }: { files: File[] }) {
  if (typeof DataTransfer === "undefined") {
    return <input type="file" name="photos" multiple hidden />;
  }
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return <input type="file" name="photos" multiple hidden ref={(el) => { if (el) el.files = dt.files; }} />;
}
