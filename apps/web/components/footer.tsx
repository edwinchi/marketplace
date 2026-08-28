import Link from "next/link";
import { getFooterCategories } from "@/lib/categories";

// No app-store badges here (unlike the Marktplaats reference this is modeled on) — there is no
// AfroDeals mobile app, and a badge that links nowhere real is exactly the kind of thing this
// project has consistently avoided (agents.md §12: Google OAuth, buyer protection, carrier
// integration all got the same treatment). Same reasoning kept "About/Careers/Press/sister sites"
// out — AfroDeals has no such corporate structure to link to.
export async function Footer() {
  const columns = await getFooterCategories();

  return (
    <footer className="mt-16 bg-secondary/30 pb-16 md:pb-0">
      {/* A quiet callback to the logo's three sampled brand colors (agents.md: navy #082040,
          orange #E89818, green #008848) — the one place the full trio appears together, rather
          than scattering brand color everywhere. */}
      <div className="h-1 bg-[linear-gradient(to_right,#082040_0%,#082040_33%,#e89818_33%,#e89818_67%,#008848_67%,#008848_100%)]" />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.id}>
              <Link href={`/categories/${col.id}`} className="text-sm font-semibold text-[#082040] hover:underline">
                {col.name}
              </Link>
              <ul className="mt-3 flex flex-col gap-2">
                {col.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/categories/${child.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
          <Link href="/help" className="hover:text-foreground hover:underline">Help &amp; Info</Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
          <Link href="/safety" className="hover:text-foreground hover:underline">Safety Center</Link>
        </div>

        <div className="mt-6 border-t pt-6 text-center text-xs text-muted-foreground">
          <p className="mx-auto max-w-2xl">
            AfroDeals connects buyers and sellers directly and is not a party to the transactions
            arranged between them. Trade safely — see our{" "}
            <Link href="/safety" className="underline">Safety Center</Link> before meeting a buyer or seller.
          </p>
          <p className="mt-3 font-semibold text-[#082040]">AfroDeals</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} AfroDeals. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
