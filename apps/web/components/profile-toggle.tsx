"use client";

import { useTransition } from "react";
import { updateProfileToggle } from "@/app/my-account/preferences/actions";

export function ProfileToggle({
  field,
  checked,
  returnTo,
}: {
  field:
    | "marketing_emails_opt_in"
    | "marketing_news_opt_in"
    | "marketing_listing_tips_opt_in"
    | "marketing_promotions_opt_in"
    | "marketing_surveys_opt_in"
    | "marketing_partner_ads_opt_in"
    | "notify_new_messages"
    | "notify_offers"
    | "location_sharing_opt_in"
    | "allow_seller_contact_on_favorite"
    | "notify_listing_favorited";
  checked: boolean;
  returnTo: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-muted transition-colors has-checked:bg-primary has-disabled:opacity-50">
      <input
        type="checkbox"
        className="peer sr-only"
        defaultChecked={checked}
        disabled={isPending}
        onChange={(e) => {
          const formData = new FormData();
          formData.set("field", field);
          formData.set("value", String(e.currentTarget.checked));
          formData.set("returnTo", returnTo);
          startTransition(() => {
            updateProfileToggle(formData);
          });
        }}
      />
      <span className="pointer-events-none absolute left-0.5 size-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
