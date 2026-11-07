import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { getAiFreePeriodEnd, isAiFreePeriodActive } from "@/lib/ai-free-period";
import { AiFreePeriodCountdown } from "@/components/ai-free-period-countdown";

// Server component: renders nothing once the free AI period (lib/ai-free-period.ts) is over, so
// every place that shows it disappears on its own when paid tiers return. Labels are resolved here
// and passed down, keeping the AiFreePeriod namespace out of the translations sent to every page.
export async function AiFreePeriodBanner({ variant = "full" }: { variant?: "full" | "compact" }) {
  await connection(); // reads the clock: always render per request, never at build time
  if (!isAiFreePeriodActive()) return null;
  const [t, locale] = await Promise.all([getTranslations("AiFreePeriod"), getLocale()]);
  const end = getAiFreePeriodEnd();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Amsterdam" }).format(end);
  // A server component rendered once per request (after connection() above), so reading the clock
  // here is the point, not an accident: it seeds the countdown's first frame.
  const serverNowMs = Date.now(); // eslint-disable-line react-hooks/purity
  const labels = { days: t("days"), hours: t("hours"), minutes: t("minutes"), seconds: t("seconds"), ended: t("ended") };

  if (variant === "compact") {
    return (
      <div className="@container mb-6 overflow-hidden rounded-2xl bg-linear-to-r from-[#082040] via-[#0a2c5c] to-[#063018] p-4 text-white shadow-md shadow-[#082040]/15">
        <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-balance">
            <Sparkles className="size-4 shrink-0 text-[#f2ad3d]" aria-hidden />
            {t("compact", { date })}
          </p>
          <AiFreePeriodCountdown endsAt={end.toISOString()} serverNowMs={serverNowMs} labels={labels} />
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="ai-free-period-title"
      className="@container relative isolate overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#063018_0%,#0a2c5c_55%,#082040_100%)] px-6 py-8 text-white shadow-lg shadow-[#082040]/20 sm:px-10"
    >
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-[#f2920e]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 -z-10 size-64 rounded-full bg-[#0e9c50]/30 blur-3xl" />
      <div className="flex flex-col gap-6 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <span className="w-fit rounded-full bg-[#f2920e] px-3 py-1 text-xs font-bold tracking-wide text-[#082040] uppercase">{t("badge")}</span>
          <h2 id="ai-free-period-title" className="text-xl font-bold tracking-tight text-balance sm:text-2xl">
            {t("title", { date })}
          </h2>
          <p className="text-sm text-pretty text-white/80">{t("body")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-white/75 uppercase">{t("endsIn")}</p>
          <AiFreePeriodCountdown endsAt={end.toISOString()} serverNowMs={serverNowMs} labels={labels} />
        </div>
      </div>
    </section>
  );
}
