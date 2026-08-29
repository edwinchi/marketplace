import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PrintButton } from "@/components/documents/print-button";

type Props = {
  title: string;
  subtitle: string;
  disclaimer: string;
  children: React.ReactNode;
};

// Shared chrome for the three downloadable document templates (sale agreement, receipt, buying
// checklist) — real AfroDeals branding baked in from the start (not a reskin of anyone else's
// template; see the commit that added this for why). The watermark and print button are the only
// two pieces every document needs; the actual legal/checklist content is each page's own.
export function DocumentPage({ title, subtitle, disclaimer, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/categories/10c44a4e-74c6-4366-88cb-958b877a6da8" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          &larr; Back to Cars
        </Link>
        <PrintButton />
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* Watermark — large, faint, rotated AfroDeals logo behind the document content. Visible
            both on-screen and in print (opacity kept low enough not to interfere with legibility
            or with a scanned/printed copy being read back later). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative watermark, not content */}
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.05] select-none print:opacity-[0.08]"
        />

        <div className="relative h-2 bg-[linear-gradient(to_right,#082040_0%,#082040_33%,#e89818_33%,#e89818_67%,#008848_67%,#008848_100%)]" />

        <div className="relative p-6 sm:p-10 print:p-6">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="AfroDeals" className="h-9 w-auto" />
          </div>

          <p className="text-xs font-semibold tracking-wide text-[#e89818] uppercase">Template</p>
          <h1 className="mt-1 text-2xl font-bold text-[#082040] sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#e89818]/30 bg-[#e89818]/5 p-3 text-xs text-[#082040]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#e89818]" />
            <p>{disclaimer}</p>
          </div>

          <div className="mt-8 flex flex-col gap-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="h-6 border-b border-dashed border-foreground/30" />
    </div>
  );
}

export function CheckItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <span className="mt-0.5 size-4 shrink-0 rounded border border-foreground/40 print:border-black" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{children}</span>
      </span>
    </label>
  );
}

export function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 border-b pb-2 text-sm font-semibold text-[#082040]">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#082040] text-[10px] font-bold text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
