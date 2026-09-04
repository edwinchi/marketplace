import { getTranslations } from "next-intl/server";

export const metadata = { title: "Safety Center — AfroDeals" };

export default async function SafetyPage() {
  const t = await getTranslations("Safety");
  const tips = [1, 2, 3, 4, 5].map((n) => ({ title: t(`tip${n}Title`), body: t(`tip${n}Body`) }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("intro")}</p>
      <ul className="flex flex-col gap-4">
        {tips.map((tip) => (
          <li key={tip.title}>
            <p className="font-medium">{tip.title}</p>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
