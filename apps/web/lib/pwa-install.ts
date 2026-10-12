// Client-side install state for "Get the app" (app/app/page.tsx). Chrome/Edge/Samsung Internet
// fire `beforeinstallprompt` once, usually right after the first page load -- long before a user
// ever opens /app -- so it's captured app-wide by components/pwa/service-worker-register.tsx and
// held here until the install button asks for it. Safari (iOS and macOS) and Firefox never fire
// it at all; those get written instructions instead (see components/pwa/install-app.tsx).

// Not in lib.dom.d.ts -- it's a Chromium-only, non-standard event.
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Inline in app/layout.tsx's <head>: catches an install prompt that fires before React has
// hydrated and captureInstallPrompt() below has run.
export const EARLY_INSTALL_PROMPT_SCRIPT =
  "window.addEventListener('beforeinstallprompt',function(e){window.__earlyInstallPrompt=e});";

export function captureInstallPrompt() {
  const early = (window as Window & { __earlyInstallPrompt?: BeforeInstallPromptEvent }).__earlyInstallPrompt;
  if (early) {
    deferredPrompt = early;
    emit();
  }
  // Not calling preventDefault() on purpose: that would suppress the browser's own install
  // mini-infobar on Android, a free extra prompt. The saved event still works for our own button.
  window.addEventListener("beforeinstallprompt", (e) => {
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedThisSession = true;
    emit();
  });
}

export function subscribeInstallState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export function wasInstalledThisSession() {
  return installedThisSession;
}

/** Shows the browser's real install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  // The event can only be used once, whatever the outcome.
  deferredPrompt = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

export type InstallPlatform = "installed" | "in-app-browser" | "ios" | "android" | "desktop";

export function detectInstallPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own pre-standard flag for a home-screen launch.
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  // Facebook/Instagram/TikTok/LinkedIn in-app webviews can't install anything -- the user has to
  // open the page in their real browser first.
  if (/FBAN|FBAV|Instagram|TikTok|musical_ly|LinkedInApp|Line\//i.test(ua)) return "in-app-browser";
  // iPadOS 13+ reports itself as desktop Mac; touch support is the tell.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
