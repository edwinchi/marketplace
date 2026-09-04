import { getTranslations } from "next-intl/server";

export const metadata = { title: "Help & Info — AfroDeals" };

export default async function HelpPage() {
  const t = await getTranslations("Help");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

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
