import { getTranslations } from "next-intl/server";

export const metadata = { title: "Terms of Use — AfroDeals" };

export default async function TermsPage() {
  const t = await getTranslations("Terms");
  const prohibitedItems = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => t(`prohibitedItem${n}`));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-1 text-xs text-muted-foreground">{t("lastUpdated")}</p>
      <p className="mb-8 rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t("disclaimer")}</p>

      <div className="flex flex-col gap-8 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section1Title")}</h2>
          <p>{t("section1Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section2Title")}</h2>
          <p>{t("section2Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section3Title")}</h2>
          <p>{t("section3Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section4Title")}</h2>
          <p className="mb-3">{t("section4Intro")}</p>
          <ul className="flex flex-col gap-1.5 pl-1">
            {prohibitedItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">{t("section4Outro")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section5Title")}</h2>
          <p>{t("section5Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section6Title")}</h2>
          <p>
            {t.rich("section6Body", {
              safetyCenter: (chunks) => (
                <a href="/safety" className="underline hover:text-foreground">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section7Title")}</h2>
          <p>{t("section7Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section8Title")}</h2>
          <p>
            {t.rich("section8Body", {
              feedbackPage: (chunks) => (
                <a href="/feedback" className="underline hover:text-foreground">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section9Title")}</h2>
          <p>{t("section9Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section10Title")}</h2>
          <p>{t("section10Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section11Title")}</h2>
          <p>{t("section11Body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{t("section12Title")}</h2>
          <p>
            {t.rich("section12Body", {
              feedbackPage: (chunks) => (
                <a href="/feedback" className="underline hover:text-foreground">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>
      </div>
    </div>
  );
}
