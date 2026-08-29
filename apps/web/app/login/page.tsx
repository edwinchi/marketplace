import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Globe2, Handshake, ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ tab?: string; next?: string }> }) {
  const { user } = await getCurrentUserAndProfile();
  const { tab, next } = await searchParams;
  // Only a same-site relative path is honored — "next" comes from a URL query param, so treating
  // it as a trusted redirect target without this check would be an open-redirect hole.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (user) redirect(safeNext);

  const t = await getTranslations("Auth");
  const benefits = [
    { icon: Handshake, title: t("benefitDirectTitle"), text: t("benefitDirectText") },
    { icon: Globe2, title: t("benefitReachTitle"), text: t("benefitReachText") },
    { icon: ShieldCheck, title: t("benefitSafeTitle"), text: t("benefitSafeText") },
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-14 sm:py-20">
      {/* Background layer — full-bleed, sits behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-112 rounded-full bg-[#e89818]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-112 rounded-full bg-[#008848]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-size-[28px_28px]"
      />

      {/* Foreground layer — logo, copy, and the elevated auth card, all on top of the background */}
      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="rounded-2xl bg-white px-6 py-3 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="AfroDeals" className="h-10 w-auto sm:h-11" />
        </div>

        <h1 className="mt-6 max-w-lg text-center text-3xl leading-tight font-bold text-white sm:text-4xl">
          {t("welcomeHeading")}
        </h1>
        <p className="mt-3 max-w-md text-center text-sm text-white/60 sm:text-base">{t("welcomeSubtext")}</p>

        <div className="mt-9 w-full max-w-md">
          <AuthCard initialTab={tab === "signup" ? "signup" : "login"} next={safeNext} />
        </div>

        <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#e89818]">
                <Icon className="size-4.5" />
              </span>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-white/50">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
