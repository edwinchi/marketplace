"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Play, Volume2, VolumeX, X } from "lucide-react";
import { introVideoFor } from "@/lib/intro-video";

// The owner's intro video in the visitor's language (owner's design, 2026-11-07): on every full
// page load (arriving, refreshing, and changing language, since the language switcher reloads the
// page) it pops up centred, loops until the visitor closes it, and the site behind it is slightly
// blurred. Moving between pages inside the site doesn't reopen it (the root layout stays mounted). A native <dialog> opened with showModal(): it sits above everything
// (cookie banner included), keeps keyboard focus inside, and Esc closes it; so do the close
// button and a click on the blurred page.
//
// It opens only after the page has loaded, so it never slows the page itself. It plays with sound
// (owner's request). Browsers often refuse sound before the visitor has touched the page; then it
// plays muted and the sound comes on at the visitor's first tap, click or key press. Visitors who
// ask for reduced motion or data saving get the poster and a play button instead of autoplay.
// Not shown on admin pages, nor to automated browsers (navigator.webdriver: test robots, which it
// would block on every page load; tests/browser/intro-video.mjs turns that flag off to test it).

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
  // Not on admin pages, nor on /tiktok (those visitors have just watched it on TikTok).
  const excluded = pathname.startsWith("/admin") || pathname.startsWith("/tiktok") || (typeof navigator !== "undefined" && navigator.webdriver === true);

  // Open a moment after the page has finished loading.
  useEffect(() => {
    if (open || done || excluded) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      timer = setTimeout(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
        setAutoplay(!reduce && !saveData);
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

  // Show as a modal, stop the page behind it scrolling, and start the video with sound.
  useEffect(() => {
    const dialog = dialogRef.current;
    const v = videoRef.current;
    if (!open || !dialog || !v) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    v.volume = 1;
    const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;
    let cancelled = false;
    // Sound was refused: unmute on the first interaction. The sound button handles its own
    // click (unmuting here first would make that click mute it again).
    const unmuteOnGesture = (e: Event) => {
      stopListening();
      if ((e.target as Element | null)?.closest?.("[data-intro-sound]")) return;
      v.muted = false;
      setMuted(false);
      if (v.paused) v.play().catch(() => setPlaying(false));
    };
    const stopListening = () => GESTURES.forEach((g) => document.removeEventListener(g, unmuteOnGesture, true));
    if (autoplay) {
      v.muted = false;
      v.play().then(
        () => setMuted(false),
        () => {
          if (cancelled) return;
          v.muted = true;
          setMuted(true);
          v.play().catch(() => setPlaying(false));
          GESTURES.forEach((g) => document.addEventListener(g, unmuteOnGesture, true));
        },
      );
    }
    return () => {
      cancelled = true;
      stopListening();
      root.style.overflow = previousOverflow;
    };
  }, [open, autoplay, video]);

  if (!open || excluded) return null;

  // A tap on play is an interaction, so the sound can come on with it.
  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play().catch(() => setPlaying(false));
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
          <button type="button" data-intro-sound onClick={toggleSound} aria-label={muted ? t("soundOn") : t("soundOff")} className={button}>
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
