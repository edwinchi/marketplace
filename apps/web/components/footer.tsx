import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getFooterCategories } from "@/lib/categories";

// No app-store badges here (unlike the Marktplaats reference this is modeled on) — there is no
// AfroDeals mobile app, and a badge that links nowhere real is exactly the kind of thing this
// project has consistently avoided (agents.md §12: Google OAuth, buyer protection, carrier
// integration all got the same treatment). Same reasoning kept "About/Careers/Press/sister sites"
// out — AfroDeals has no such corporate structure to link to.
export async function Footer() {
  const [categories, t, tNav] = await Promise.all([
    getFooterCategories(),
    getTranslations("Footer"),
    getTranslations("Nav"),
  ]);

  return (
    <footer className="mt-16 bg-secondary/30 pb-16 md:pb-0">
      {/* A quiet callback to the logo's three sampled brand colors (agents.md: navy #082040,
          orange #E89818, green #008848) — the one place the full trio appears together, rather
          than scattering brand color everywhere. */}
      <div className="h-1 bg-[linear-gradient(to_right,#082040_0%,#082040_33%,#e89818_33%,#e89818_67%,#008848_67%,#008848_100%)]" />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-sm font-semibold text-[#082040]">{t("categories")}</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link href={`/categories/${cat.id}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
          <Link href="/help" className="hover:text-foreground hover:underline">{tNav("helpInfo")}</Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">{tNav("terms")}</Link>
          <Link href="/safety" className="hover:text-foreground hover:underline">{tNav("safetyCenter")}</Link>
        </div>

        <div className="mt-6 border-t pt-6 text-center text-xs text-muted-foreground">
          <p className="mx-auto max-w-2xl">{t("disclaimer")}</p>
          <p className="mx-auto mt-1 max-w-2xl">
            {t("tradeSafely")}{" "}
            <Link href="/safety" className="underline">{t("safetyCenter")}</Link> {t("beforeMeeting")}
          </p>
          <p className="mt-3">&copy; {new Date().getFullYear()} AfroDeals. {t("rightsReserved")}</p>
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
