import Image from "next/image";
import type { ReactNode } from "react";

// A category page's hero: the category's blended photo background (public/category-backgrounds/,
// scripts/gen-category-heroes.mjs) shown WHOLE, as built (owner, 2026-11-07: "all of this image
// should be visible as it is"). The box has the image's own 3:1 shape, so object-cover crops
// nothing, and there's no white wash and no category row covering it. The only change is a thin
// fade at the edges (Tailwind mask utilities) so it sits in the page without a hard rectangle.
// The headline goes in the image's light left corner (the generator keeps that area calm) from sm
// up. On phones a 3:1 image is too short for text, so the headline goes underneath and the image
// stays complete.
export function CategoryHero({ src, children }: { src: string; children: ReactNode }) {
  return (
    <section className="relative mx-auto w-full max-w-[1600px]">
      <div className="relative aspect-[3/1] w-full overflow-hidden mask-x-from-97% mask-b-from-94% sm:mask-x-from-95%">
        <Image src={src} alt="" fill preload sizes="(min-width: 1600px) 1600px, 100vw" quality={85} className="object-cover" />
      </div>
      <div className="hero-enter px-4 pt-4 sm:absolute sm:inset-x-0 sm:top-0 sm:max-w-xl sm:px-6 sm:pt-[clamp(1.25rem,3.5vw,3rem)] lg:px-8">
        {children}
      </div>
    </section>
  );
}
