import Image from "next/image";
import { resolveCategoryPhotoUrl } from "@/lib/media";

type GalleryImage = { id: string; storage_key: string };

// Purely decorative — a photo strip so a category browse page doesn't open on plain text. Renders
// nothing when a category has no gallery rows yet (most categories, since these were sourced only
// for ones with real listings — see lib/categories.ts's getCategoryGallery).
export function CategoryGallery({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
      {images.map((img) => (
        <div
          key={img.id}
          className="relative size-24 shrink-0 overflow-hidden rounded-lg border transition-transform duration-200 hover:scale-[1.03] sm:size-28"
        >
          <Image
            src={resolveCategoryPhotoUrl(img.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!)}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
