import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getFooterCategories } from "@/lib/categories";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { TARGET_CITIES } from "@/lib/target-cities";
import { slugPath } from "@/lib/slug";

// No app-store badges here (unlike the Marktplaats reference this is modeled on) — there is no
// MarketitNow mobile app, and a badge that links nowhere real is exactly the kind of thing this
// project has consistently avoided (agents.md §12: Google OAuth, buyer protection, carrier
// integration all got the same treatment). Same reasoning kept "About/Careers/Press/sister sites"
// out — MarketitNow has no such corporate structure to link to.
export async function Footer() {
  const { user } = await getCurrentUserAndProfile();
  const [categories, t, tNav] = await Promise.all([
    // Browsing is sign-in-gated site-wide right now (see proxy.ts) — an anonymous visitor
    // clicking any of these would just bounce straight back to /login, so skip both the query
    // and the dead-end links entirely until they're signed in.
    user ? getFooterCategories() : Promise.resolve([]),
    getTranslations("Footer"),
    getTranslations("Nav"),
  ]);

  return (
    <footer className="mt-16 bg-secondary/30 pb-16 md:pb-0 print:hidden">
      {/* A quiet callback to the logo's three sampled brand colors (agents.md: navy #082040,
          orange #E89818, green #008848) — the one place the full trio appears together, rather
          than scattering brand color everywhere. */}
      <div className="h-1 bg-[linear-gradient(to_right,#082040_0%,#082040_33%,#e89818_33%,#e89818_67%,#008848_67%,#008848_100%)]" />
      {/* @container turns the categories grid's breakpoints below (@sm/@lg/@xl) into queries
          against THIS wrapper's own rendered width, not the viewport -- genuinely more correct
          than a viewport breakpoint here, since nothing guarantees the footer is ever viewport-
          width (e.g. if it's ever reused inside a narrower panel), and it's real Tailwind v4
          container-query support, not a polyfill. */}
      <div className="@container mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        {user && (
          <>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#082040]">
              {/* Same three brand colors as the top bar, in miniature, right next to the heading
                  that opens the section it introduces -- a small deliberate echo, not decoration
                  repeated for its own sake. color-mix() softens each toward the page background
                  rather than using the raw hex, so it reads as a tasteful accent, not a swatch. */}
              <span className="flex h-3 w-6 overflow-hidden rounded-full">
                <span className="flex-1" style={{ backgroundColor: "color-mix(in oklch, #082040 80%, var(--background))" }} />
                <span className="flex-1" style={{ backgroundColor: "color-mix(in oklch, #e89818 80%, var(--background))" }} />
                <span className="flex-1" style={{ backgroundColor: "color-mix(in oklch, #008848 80%, var(--background))" }} />
              </span>
              {t("categories")}
            </h2>
            {/* Column-major (grid-flow-col), not row-major -- links fill top-to-bottom then wrap to
                the next column, like a phone book or a real classifieds footer, instead of reading
                left-to-right in no particular browsable order. A fixed row count per container
                width plus auto-cols-fr lets the column count emerge on its own rather than being
                hand-picked to match however many categories exist today. **:hover:underline
                (Tailwind v4's "all descendants" arbitrary variant) sets the hover rule once on the
                list instead of repeating it on every single link. */}
            <ul className="**:hover:underline grid auto-cols-fr grid-flow-col grid-rows-[repeat(18,auto)] gap-x-6 gap-y-2 @sm:grid-rows-[repeat(12,auto)] @lg:grid-rows-[repeat(9,auto)] @xl:grid-rows-[repeat(7,auto)]">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/categories/${slugPath(cat.name, cat.id)}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Unlike the categories list above, this is always visible (not gated behind `user &&`) --
            these are real, crawlable landing pages (app/cities/[city]/page.tsx), and hiding their
            only on-site links behind a login check would hide them from anonymous visitors and
            search engines too, defeating the point of building them. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
          {TARGET_CITIES.map((c) => (
            <Link key={c.slug} href={`/cities/${c.slug}`} className="transition-colors hover:text-foreground hover:underline">
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm font-semibold text-[#008848]">
          <Link href="/welcome" className="hover:underline">{tNav("howItWorks")}</Link>
          <Link href="/help" className="hover:underline">{tNav("helpInfo")}</Link>
          <Link href="/terms" className="hover:underline">{tNav("terms")}</Link>
          <Link href="/privacy" className="hover:underline">{tNav("privacy")}</Link>
          <Link href="/data-deletion" className="hover:underline">{tNav("dataDeletion")}</Link>
          <Link href="/safety" className="hover:underline">{tNav("safetyCenter")}</Link>
          <Link href="/feedback" className="hover:underline">{tNav("feedback")}</Link>
        </div>

        <div className="mt-6 border-t pt-6 text-center text-sm text-pretty text-[#082040]/65">
          <p className="mx-auto max-w-2xl">{t("disclaimer")}</p>
          <p className="mx-auto mt-1 max-w-2xl">
            {t("tradeSafely")}{" "}
            <Link href="/safety" className="underline">{t("safetyCenter")}</Link> {t("beforeMeeting")}
          </p>
          <p className="mt-3">&copy; {new Date().getFullYear()} MarketitNow. {t("rightsReserved")}</p>
          <p className="mt-1">{t("companyLine", { kvk: "89423496" })}</p>
          <p className="mt-1">
            {t("developedBy")}{" "}
            <a href="https://station9x.apps-pilot.nl/" target="_blank" rel="noopener noreferrer" className="underline">
              station9x
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
