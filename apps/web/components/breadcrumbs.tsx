import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { id: string; name: string };

export function Breadcrumbs({ path, resultCount }: { path: Crumb[]; resultCount?: number }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="flex items-center gap-1 hover:text-foreground">
        <Home className="size-3.5" />
        Home
      </Link>
      {path.map((crumb, i) => {
        const isLast = i === path.length - 1 && resultCount === undefined;
        return (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.name}</span>
            ) : (
              <Link href={`/categories/${crumb.id}`} className="hover:text-foreground">
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
      {resultCount !== undefined && (
        <span className="flex items-center gap-1">
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{resultCount.toLocaleString("en")} results</span>
        </span>
      )}
    </nav>
  );
}
