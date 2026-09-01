import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { NewListingStep1 } from "@/components/listings/new-listing-step1";

export default async function NewListingPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const [{ categoryOptions }, aiUsage] = await Promise.all([getCategoriesAndAttributes(), getAiUsageStatus()]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">Post an ad</h1>
      <NewListingStep1 categoryOptions={categoryOptions} initialUsesLeft={aiUsage.usesLeft} freeLimit={aiUsage.freeLimit} />
    </div>
  );
}
