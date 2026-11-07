"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Play, Volume2, VolumeX, X } from "lucide-react";
import { INTRO_SEEN_KEY, introVideoFor } from "@/lib/intro-video";

// The owner's intro video in the visitor's language (owner's design, 2026-11-07): on the first
// page of a visit it pops up centred, loops until the visitor closes it, and the site behind it
// is slightly blurred. A native <dialog> opened with showModal(): it sits above everything
// (cookie banner included), keeps keyboard focus inside, and Esc closes it; so do the close
// button and a click on the blurred page.
//
// It opens only after the page has loaded, so it never slows the page itself. It starts muted,
// because browsers block autoplay with sound; the sound button turns it on. Visitors who ask for
// reduced motion or data saving get the poster and a play button instead of autoplay. Not shown
// on admin pages.

function readSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage blocked (private mode): it may show again on the next full page load.
  }
}

export function IntroVideo() {
  const t = useTranslations("IntroVideo");
  const locale = useLocale();
  const pathname = usePathname();
  const { video, poster } = introVideoFor(locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const excluded = pathname.startsWith("/admin");

  // Open once per visit, a moment after the page has finished loading.
  useEffect(() => {
    if (open || done || excluded || readSeen()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      timer = setTimeout(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
        setAutoplay(!reduce && !saveData);
        markSeen();
        setOpen(true);
      }, 800);
    };
    if (document.readyState === "complete") show();
    else window.addEventListener("load", show, { once: true });
    return () => {
      window.removeEventListener("load", show);
      clearTimeout(timer);
    };
  }, [open, done, excluded]);

  // Show as a modal, stop the page behind it scrolling, and start the (muted) video.
  useEffect(() => {
    const dialog = dialogRef.current;
    const v = videoRef.current;
    if (!open || !dialog || !v) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    v.muted = true; // set before play(): React's `muted` prop doesn't reliably do it
    if (autoplay) v.play().catch(() => setPlaying(false));
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [open, autoplay, video]);

  if (!open || excluded) return null;

  const play = () => {
    videoRef.current?.play().catch(() => setPlaying(false));
  };
  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) play();
  };
  // Every way of closing (button, Esc, click outside) ends here.
  const finish = () => {
    videoRef.current?.pause();
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
    setDone(true);
  };

  const button =
    "flex size-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("label")}
      data-intro-video={locale}
      onClose={finish}
      onClick={(e) => {
        if (e.target === e.currentTarget) finish(); // the blurred page around the video
      }}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 transition-[opacity,scale] duration-300 ease-out starting:scale-95 starting:opacity-0 backdrop:bg-black/25 backdrop:backdrop-blur-[3px] motion-reduce:transition-none print:hidden"
    >
      <div className="relative aspect-9/16 h-[min(86dvh,calc(92vw*16/9))] overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/15">
        <video
          key={video}
          ref={videoRef}
          src={video}
          poster={poster}
          muted
          loop
          playsInline
          preload={autoplay ? "auto" : "none"}
          aria-label={t("label")}
          className="size-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {!playing && (
          <button
            type="button"
            onClick={play}
            aria-label={t("play")}
            className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Play className="size-7 translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </button>
        )}
        <div className="absolute inset-x-3 top-3 flex justify-between">
          <button type="button" onClick={toggleSound} aria-label={muted ? t("soundOn") : t("soundOff")} className={button}>
            {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
          </button>
          <button type="button" onClick={finish} aria-label={t("close")} className={button} autoFocus>
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </dialog>
  );
}
