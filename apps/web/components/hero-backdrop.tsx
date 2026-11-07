import Image from "next/image";

// The photo behind the homepage and category heroes. It used to be a CSS background-image on a
// ::before, which meant: the browser found it late (only after the stylesheet), always fetched the
// full JPEG whatever the screen size, and the whole photo sat under a flat 45% white wash, which
// is what made it look faded. Now:
// - next/image serves AVIF/WebP at the width the screen needs, fetched eagerly (it's above the fold)
// - Tailwind mask utilities dissolve the photo into the site header (top), the page (bottom) and
//   both sides, instead of a hard rectangle
// - the wash is a gradient: light at the top where the photo is meant to be seen, heavier at the
//   bottom where the breadcrumb and category row sit on top of it.
// The parent must be `relative isolate` (isolate keeps the -z-10 here above the parent's own box).
export function HeroBackdrop({ src }: { src: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 mask-x-from-88% mask-t-from-94% mask-b-from-55% select-none"
    >
      <Image src={src} alt="" fill sizes="100vw" quality={85} loading="eager" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-b from-background/25 via-background/35 to-background/70" />
      {/* The headline sits on the left: lift the photo there so the text stays crisp, and leave
          the right side vivid. */}
      <div className="absolute inset-0 bg-linear-to-r from-background/85 via-background/40 via-35% to-transparent to-65%" />
    </div>
  );
}
