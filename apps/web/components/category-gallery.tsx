import Image from "next/image";
import { resolveCategoryPhotoUrl } from "@/lib/media";

type GalleryImage = { id: string; storage_key: string };

// A category browse page opening on plain text/links reads as an unfinished directory listing --
// this gives it a real cover photo instead, using the FIRST sourced image (scripts/source-
// category-photos.mjs / source-subcategory-photos.mjs) as a wide, moderately tall banner rather
// than a small thumbnail; most categories only have exactly one image (avg 1.13/category as of
// this writing), so a horizontal thumbnail strip mostly showed one lonely square. Any additional
// images (a handful of categories have up to 9) render as a secondary row of smaller thumbnails
// underneath, still worth surfacing rather than discarding. Renders nothing when a category has no
// gallery rows yet -- roughly 70% of the ~2,666 leaf categories, since subcategory sourcing hasn't
// covered all of them.
export function CategoryGallery({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) return null;
  const [cover, ...rest] = images;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="mb-6">
      <div className="relative h-40 w-full overflow-hidden rounded-2xl sm:h-56">
        <Image
          src={resolveCategoryPhotoUrl(cover.storage_key, supabaseUrl)}
          alt=""
          fill
          sizes="(min-width: 1600px) 1600px, 100vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent" />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {rest.map((img) => (
            <div key={img.id} className="relative size-16 shrink-0 overflow-hidden rounded-lg border transition-transform duration-200 hover:scale-[1.05] sm:size-20">
              <Image src={resolveCategoryPhotoUrl(img.storage_key, supabaseUrl)} alt="" fill sizes="80px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
