"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart, Share2, Check, Link2, Mail } from "lucide-react";
import { toggleFavorite } from "@/app/listings/favorite-actions";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0 0 12.04 2zm5.8 14.07c-.24.68-1.4 1.3-1.93 1.37-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.14-4.88-4.33-.14-.19-1.17-1.55-1.17-2.96 0-1.4.74-2.09 1-2.38.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.13.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.13.57.17.28.75 1.24 1.61 2 1.11.99 2.04 1.29 2.32 1.44.28.14.44.12.6-.07.17-.19.72-.84.91-1.13.19-.28.38-.24.64-.14.26.1 1.66.78 1.94.93.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.68L23.3 22H16.5l-5.32-6.96L4.9 22H1.8l8.13-9.29L1 2h6.98l4.81 6.36L18.9 2zm-1.2 18h1.72L6.4 3.9H4.55L17.7 20z" />
    </svg>
  );
}

const SHARE_TARGETS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    href: (url: string, title: string) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: FacebookIcon,
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "x",
    label: "X",
    icon: XIcon,
    href: (url: string, title: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    href: (url: string, title: string) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

function ShareMenu({ title }: { title: string }) {
  const t = useTranslations("Listing");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        className="flex items-center gap-1.5 hover:underline"
        onClick={async () => {
          // Native share sheet is the best UX where it exists (mobile) -- the dropdown below is
          // the fallback for desktop browsers that don't support the Web Share API at all.
          if (canNativeShare) {
            try {
              await navigator.share({ title, url: window.location.href });
              return;
            } catch {
              // user cancelled the share sheet — do nothing, don't fall through to the dropdown
              return;
            }
          }
          setOpen((v) => !v);
        }}
      >
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {copied ? t("linkCopied") : t("share")}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-48 rounded-xl border bg-background p-1.5 shadow-lg">
          <ul className="flex flex-col">
            {SHARE_TARGETS.map((target) => (
              <li key={target.key}>
                <a
                  href={target.href(typeof window !== "undefined" ? window.location.href : "", title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]"
                >
                  <target.icon className="size-4 text-muted-foreground" />
                  {target.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="my-1.5 border-t" />
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]"
          >
            <Link2 className="size-4 text-muted-foreground" />
            {t("copyLink")}
          </button>
        </div>
      )}
    </div>
  );
}

export function SaveShareBar({
  listingId,
  title,
  initialFavorited,
  signedIn,
}: {
  listingId: string;
  title: string;
  initialFavorited: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations("Listing");
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4 text-sm">
      <button
        type="button"
        aria-pressed={favorited}
        disabled={pending}
        className={cn("flex items-center gap-1.5 hover:underline", favorited && "text-destructive")}
        onClick={() => {
          if (!signedIn) {
            window.location.href = "/login";
            return;
          }
          const next = !favorited;
          setFavorited(next);
          startTransition(async () => {
            const { error } = await toggleFavorite(listingId, !next);
            if (error) setFavorited(!next);
          });
        }}
      >
        <Heart className={cn("size-4", favorited && "fill-destructive")} />
        {favorited ? t("saved") : t("save")}
      </button>
      <ShareMenu title={title} />
    </div>
  );
}
