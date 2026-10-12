import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RefreshCw, Smartphone, Zap } from "lucide-react";
import { InstallApp, InstallSteps } from "@/components/pwa/install-app";

// "Get the app" -- MarketitNow installs to a phone's home screen as a web app (app/manifest.ts +
// public/sw.js), not through the App Store or Google Play: there's no store listing yet, so this
// page deliberately shows no store badges (a badge linking nowhere real is exactly what the
// footer's own comment rules out). Public in proxy.ts so a signed-out visitor can install too.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GetApp");
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function GetAppPage() {
  const t = await getTranslations("GetApp");

  const benefits = [
    { icon: Smartphone, title: t("benefit1Title"), body: t("benefit1Body") },
    { icon: Zap, title: t("benefit2Title"), body: t("benefit2Body") },
    { icon: RefreshCw, title: t("benefit3Title"), body: t("benefit3Body") },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- same plain-<img> reasoning as nav.tsx's logo */}
        <img src="/icon-192.png" alt="" width={88} height={88} className="mb-5 size-22 rounded-[22%] border shadow-md" />
        <h1 className="text-3xl font-bold text-balance text-[#082040] sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-lg text-base text-pretty text-muted-foreground">{t("intro")}</p>
      </div>

      <InstallApp />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[#082040]">{t("benefitsTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border p-4">
              <Icon className="mb-2 size-5 text-[#008848]" />
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Server-rendered, so every device's steps are readable before hydration and for someone
          setting it up on a phone while reading on a laptop. */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-[#082040]">{t("otherDevicesTitle")}</h2>
        <div className="flex flex-col gap-2">
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">{t("iosTitle")}</summary>
            <div className="mt-4">
              <InstallSteps steps={[t("iosStep1"), t("iosStep2"), t("iosStep3")]} />
            </div>
          </details>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">{t("androidTitle")}</summary>
            <div className="mt-4">
              <InstallSteps steps={[t("androidStep1"), t("androidStep2"), t("androidStep3")]} />
            </div>
          </details>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">{t("desktopTitle")}</summary>
            <p className="mt-3 text-sm text-muted-foreground">{t("desktopBody")}</p>
          </details>
        </div>
      </section>
    </div>
  );
}
