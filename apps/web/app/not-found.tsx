import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#e89818]/10 text-[#e89818]">
        <SearchX className="size-8" />
      </span>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn't exist, or the listing it pointed to may have been removed or sold.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Back to home
        </Link>
        <Link href="/feedback" className={buttonVariants({ variant: "outline" })}>
          Report a broken link
        </Link>
      </div>
    </div>
  );
}
