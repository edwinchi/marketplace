import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUserAndProfileForRender } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { NewListingStep1 } from "@/components/listings/new-listing-step1";
import { AiFreePeriodBanner } from "@/components/ai-free-period-banner";
import { RouteMessages } from "@/components/route-messages";

export default async function NewListingPage() {
  const { user } = await getCurrentUserAndProfileForRender();
  if (!user) redirect("/login?next=/listings/new");

  const [{ categoryOptions }, aiUsage, t] = await Promise.all([getCategoriesAndAttributes(), getAiUsageStatus(), getTranslations("PostAd")]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">{t("title")}</h1>
      <AiFreePeriodBanner variant="compact" />
      <RouteMessages namespaces={["PostAd"]}>
        <NewListingStep1 categoryOptions={categoryOptions} initialUsesLeft={aiUsage.usesLeft} freeLimit={aiUsage.freeLimit} />
      </RouteMessages>
    </div>
  );
}
