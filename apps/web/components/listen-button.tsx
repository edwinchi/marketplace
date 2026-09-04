"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

// Reads the current page's main content aloud via the browser's built-in Web Speech API
// (speechSynthesis) -- no external TTS service, no per-use cost, works entirely client-side.
// Targets <main>'s innerText specifically (not the whole document): innerText, unlike
// textContent, already skips visually-hidden elements and collapses layout whitespace roughly
// the way a sighted reader would scan the page, and scoping to <main> naturally excludes the nav
// bar, footer, and cookie banner chrome that surrounds every page. No page-specific wiring needed
// -- this works the same way on every route.
export function ListenButton({ className }: { className?: string } = {}) {
  const t = useTranslations("Listen");
  const locale = useLocale();
  const pathname = usePathname();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Stop mid-sentence when navigating away -- otherwise a listing page's description keeps
  // reading over whatever page the user has since clicked into.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [pathname]);

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function start() {
    const main = document.querySelector("main");
    const text = (main?.innerText ?? document.body.innerText ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;

    window.speechSynthesis.cancel(); // clear any stuck queue before starting fresh
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "fr" ? "fr-FR" : "en-US";
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(locale === "fr" ? "fr" : "en"));
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speaking ? stop : start}
      aria-label={speaking ? t("stop") : t("listen")}
      aria-pressed={speaking}
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm transition-all duration-150 hover:-translate-y-0.5 sm:px-2 ${
        speaking ? "bg-[#c8f0c8] text-[#046637]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className ?? ""}`}
    >
      {speaking ? <Square className="size-4.5 fill-current" /> : <Volume2 className="size-5" />}
      <span className="hidden sm:inline">{speaking ? t("stop") : t("listen")}</span>
    </button>
  );
}
