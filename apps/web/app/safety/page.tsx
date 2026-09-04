import { getTranslations } from "next-intl/server";
import { ListenButton } from "@/components/listen-button";

export const metadata = { title: "Safety Center — AfroDeals" };

export default async function SafetyPage() {
  const t = await getTranslations("Safety");
  const tips = [1, 2, 3, 4, 5].map((n) => ({ title: t(`tip${n}Title`), body: t(`tip${n}Body`) }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <ListenButton />
      </div>
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
