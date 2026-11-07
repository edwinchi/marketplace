import introVideos from "./intro-videos.json";

// The owner's 10-second intro video per site language (scripts/gen-intro-videos.mjs writes the
// files and intro-videos.json). Languages without their own video (zh) get the English one.
export type IntroVideo = { video: string; poster: string };
const VIDEOS: Record<string, IntroVideo> = introVideos;

export function introVideoFor(locale: string): IntroVideo {
  return VIDEOS[locale] ?? VIDEOS.en;
}

// sessionStorage key: the intro plays once per visit (browser session), not on every page.
export const INTRO_SEEN_KEY = "mkn-intro-seen";
