import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes, getCategoryPath } from "@/lib/categories";
import { createListing } from "@/app/listings/actions";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { NewListingStep2Form } from "@/components/listings/new-listing-step2-form";

export default async function NewListingDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; category?: string }>;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const { title, category } = await searchParams;
  if (!title || !category) redirect("/listings/new");

  const [{ categoryOptions, attributesByCategory }, categoryPath, aiUsage] = await Promise.all([
    getCategoriesAndAttributes(),
    getCategoryPath(category),
    getAiUsageStatus(),
  ]);
  const chosen = categoryOptions.find((c) => c.id === category);
  if (!chosen) redirect("/listings/new");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">Post an ad</h1>
      <NewListingStep2Form
        categoryId={category}
        categoryPath={categoryPath.map((n) => n.name)}
        title={title}
        attributes={attributesByCategory[category] ?? []}
        action={createListing}
        seller={{ name: profile.display_name || profile.username, email: user.email ?? "", websiteUrl: profile.website_url }}
        initialUsesLeft={aiUsage.usesLeft}
        unlimited={aiUsage.unlimited}
      />
    </div>
  );
}
