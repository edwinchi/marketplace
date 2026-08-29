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
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#e89818]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-[#008848]/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-size-[28px_28px]"
        />

        <div className="relative z-10 p-10">
          <div className="inline-flex rounded-2xl bg-white px-5 py-2.5 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="AfroDeals" className="h-9 w-auto" />
          </div>
        </div>

        <div className="relative z-10 px-10 pb-14">
          <h2 className="max-w-sm text-3xl leading-tight font-bold text-white">{t("welcomeHeading")}</h2>
          <p className="mt-3 max-w-sm text-sm text-white/60">{t("welcomeSubtext")}</p>

          <ul className="mt-9 flex flex-col gap-5">
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#e89818]">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-white/55">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="AfroDeals" className="h-12 w-auto" />
          </div>
          <AuthCard initialTab={tab === "signup" ? "signup" : "login"} next={safeNext} />
        </div>
      </div>
    </div>
  );
}
