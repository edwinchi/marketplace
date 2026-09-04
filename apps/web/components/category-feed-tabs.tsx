"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// forYouContent/nearYouContent are pre-rendered by the (Server Component) category page and
// passed down as slots, not built from raw listing data in here -- ListingGrid renders
// ListingCard, which is itself an async Server Component (it reads cookies() for the display-
// currency preference), and a Client Component can't import/render a Server Component's module
// tree directly. Passing already-rendered JSX through props is the supported way to cross that
// boundary. Both tabs' data is fetched server-side up front, so switching tabs here is a pure
// client-side toggle with zero network round trip, matching the design spec's "swap the feed
// below it, no full page reload" requirement.
export function CategoryFeedTabs({
  forYouContent,
  nearYouContent,
}: {
  forYouContent: React.ReactNode;
  nearYouContent: React.ReactNode;
}) {
  const t = useTranslations("Categories");

  return (
    <Tabs defaultValue="for-you">
      <TabsList>
        <TabsTrigger value="for-you">{t("forYou")}</TabsTrigger>
        <TabsTrigger value="near-you">{t("nearYou")}</TabsTrigger>
      </TabsList>
      <TabsContent value="for-you" className="pt-5">
        {forYouContent}
      </TabsContent>
      <TabsContent value="near-you" className="pt-5">
        {nearYouContent}
      </TabsContent>
    </Tabs>
  );
}
