import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { id: string; name: string };

export async function Breadcrumbs({ path, resultCount }: { path: Crumb[]; resultCount?: number }) {
  const [t, locale] = await Promise.all([getTranslations("Categories"), getLocale()]);

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="flex items-center gap-1 transition-colors hover:text-foreground">
        <Home className="size-3.5" />
        {t("home")}
      </Link>
      {path.map((crumb, i) => {
        const isLast = i === path.length - 1 && resultCount === undefined;
        return (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.name}</span>
            ) : (
              <Link href={`/categories/${crumb.id}`} className="transition-colors hover:text-foreground">
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
      {resultCount !== undefined && (
        <span className="flex items-center gap-1">
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{t("results", { count: resultCount.toLocaleString(locale) })}</span>
        </span>
      )}
    </nav>
  );
}
