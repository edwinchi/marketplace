import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";

const SITE_ORIGIN = "https://afrodeals.net";

// Mirrors proxy.ts's own require_login check -- while the site is sign-in-gated, every crawlable
// page just redirects to /login, so there's nothing worth indexing and telling crawlers to stay
// away entirely is more honest than pointing them at a sitemap full of dead ends.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const supabase = createServiceClient();
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "require_login").maybeSingle();
  const requireLogin = setting?.value ?? true;

  if (requireLogin) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/my-account/", "/admin", "/api/", "/messages", "/notifications", "/listings/new", "/listings/edit/"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
