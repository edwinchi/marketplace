import { getTranslations } from "next-intl/server";
import { ListenButton } from "@/components/listen-button";

export const metadata = { title: "Help & Info — AfroDeals" };

export default async function HelpPage() {
  const t = await getTranslations("Help");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <ListenButton />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">{t("buyingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("buyingBody")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">{t("sellingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("sellingBody")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">{t("moreHelpTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("moreHelpBody", {
            safetyCenter: (chunks) => (
              <a href="/safety" className="underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    </div>
  );
}
