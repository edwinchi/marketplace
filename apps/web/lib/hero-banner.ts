// 9 vetted, blurred/scrimmed collage banners (public/hero-banner-1.jpg .. -9.jpg) -- picked fresh
// per request so the homepage and category pages don't show the same banner every visit. Each page
// that renders .brand-lattice calls this once and passes the result down as the --hero-bg-image
// custom property (see globals.css's .brand-lattice::before), rather than hardcoding one file.
const HERO_BANNER_COUNT = 9;

export function getRandomHeroBanner(): string {
  const n = Math.floor(Math.random() * HERO_BANNER_COUNT) + 1;
  return `/hero-banner-${n}.jpg`;
}
