"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, ExternalLink, Monitor, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canPromptInstall,
  detectInstallPlatform,
  promptInstall,
  subscribeInstallState,
  wasInstalledThisSession,
  type InstallPlatform,
} from "@/lib/pwa-install";

const noopSubscribe = () => () => {};

// The primary, device-specific install card on /app. Where the browser supports a real install
// dialog (Chrome/Edge/Samsung Internet, captured in lib/pwa-install.ts) it's one button. iOS has
// no install API at all -- every browser there installs only via Share -> Add to Home Screen --
// so it gets those steps instead, as does any Android browser that hasn't offered the prompt.
export function InstallApp() {
  const t = useTranslations("GetApp");
  // null on the server and during hydration -- the platform is only knowable in the browser.
  const platform = useSyncExternalStore<InstallPlatform | null>(noopSubscribe, detectInstallPlatform, () => null);
  const canPrompt = useSyncExternalStore(subscribeInstallState, canPromptInstall, () => false);
  const installedNow = useSyncExternalStore(subscribeInstallState, wasInstalledThisSession, () => false);
  const [accepted, setAccepted] = useState(false);

  if (platform === null) {
    return <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" aria-hidden="true" />;
  }

  if (platform === "installed" || installedNow || accepted) {
    const title = platform === "installed" ? t("installedTitle") : t("justInstalled");
    return (
      <Card icon={<CheckCircle2 className="size-6 text-[#008848]" />} title={title}>
        {platform === "installed" && <p className="text-muted-foreground">{t("installedBody")}</p>}
      </Card>
    );
  }

  if (platform === "in-app-browser") {
    return (
      <Card icon={<ExternalLink className="size-6 text-[#e89818]" />} title={t("inAppTitle")}>
        <p className="text-muted-foreground">{t("inAppBody")}</p>
      </Card>
    );
  }

  if (canPrompt) {
    return (
      <Card icon={<Smartphone className="size-6 text-[#082040]" />} title={platform === "desktop" ? t("desktopTitle") : t("androidTitle")}>
        <Button
          type="button"
          className="h-11 w-full px-6 text-base sm:w-auto"
          onClick={async () => {
            if (await promptInstall()) setAccepted(true);
          }}
        >
          <Download className="size-4" />
          {t("installButton")}
        </Button>
      </Card>
    );
  }

  if (platform === "ios") {
    return (
      <Card icon={<Share className="size-6 text-[#082040]" />} title={t("iosTitle")}>
        <InstallSteps steps={[t("iosStep1"), t("iosStep2"), t("iosStep3")]} />
      </Card>
    );
  }

  if (platform === "android") {
    return (
      <Card icon={<Smartphone className="size-6 text-[#082040]" />} title={t("androidTitle")}>
        <InstallSteps steps={[t("androidStep1"), t("androidStep2"), t("androidStep3")]} />
      </Card>
    );
  }

  return (
    <Card icon={<Monitor className="size-6 text-[#082040]" />} title={t("desktopTitle")}>
      <p className="text-muted-foreground">{t("desktopBody")}</p>
    </Card>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary">{icon}</span>
        <h2 className="text-lg font-semibold text-[#082040]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function InstallSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#008848] text-xs font-semibold text-white">
            {i + 1}
          </span>
          <span className="text-sm leading-6 text-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}
