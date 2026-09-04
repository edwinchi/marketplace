"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Volume2, Square, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getCanListen } from "@/app/actions/get-can-listen";

const SPEECH_LANG_BY_LOCALE: Record<string, string> = { en: "en-US", fr: "fr-FR", ar: "ar-SA", zh: "zh-CN" };

// Reads a section of the current page aloud via the browser's built-in Web Speech API
// (speechSynthesis) -- no external TTS service, no per-use cost, works entirely client-side.
// `selector` scopes what gets read (defaults to the whole <main>, e.g. for the welcome/help/
// terms/safety pages this sits on); the listing page passes a narrower selector so it reads just
// the item description, not the whole page (price, seller card, etc.). innerText, unlike
// textContent, already skips visually-hidden elements and collapses layout whitespace roughly the
// way a sighted reader would scan the page.
//
// Entitlement (Seller Pro subscribers + admins, see app/actions/get-can-listen.ts) is fetched
// client-side on mount via a Server Action rather than threaded down as a prop -- this component
// is dropped into both server pages (welcome, help, terms, safety) and one client page (feedback),
// and a self-contained check avoids needing page-specific data-fetching everywhere it's placed.
// Defaults to locked while loading, never briefly flashes an unlocked button that then re-locks.
export function ListenButton({ selector = "main", className }: { selector?: string; className?: string } = {}) {
  const t = useTranslations("Listen");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    getCanListen()
      .then(setCanListen)
      .catch(() => setCanListen(false));
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
    const target = document.querySelector<HTMLElement>(selector);
    const text = (target?.innerText ?? document.body.innerText ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;

    window.speechSynthesis.cancel(); // clear any stuck queue before starting fresh
    const utterance = new SpeechSynthesisUtterance(text);
    const speechLang = SPEECH_LANG_BY_LOCALE[locale] ?? "en-US";
    utterance.lang = speechLang;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(speechLang.split("-")[0]));
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;

  function handleClick() {
    if (!canListen) {
      router.push("/my-account/ai-features");
      return;
    }
    if (speaking) stop();
    else start();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={!canListen ? t("sellerProFeature") : speaking ? t("stop") : t("listen")}
      title={!canListen ? t("sellerProFeature") : undefined}
      aria-pressed={speaking}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 ${
        speaking ? "border-transparent bg-[#c8f0c8] text-[#046637]" : "text-muted-foreground hover:border-[#008200]/30 hover:text-foreground"
      } ${className ?? ""}`}
    >
      {!canListen ? <Lock className="size-4" /> : speaking ? <Square className="size-4 fill-current" /> : <Volume2 className="size-4" />}
      {speaking && canListen ? t("stop") : t("listen")}
    </button>
  );
}
