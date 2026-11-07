import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";

// "Download my data" (GDPR Art. 15/20). A plain link to the export route: the browser saves the
// JSON file (Content-Disposition: attachment), so no client JavaScript is needed.
export async function DataExportCard() {
  const t = await getTranslations("DataExport");
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[#082040]">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>
      </div>
      <a
        href="/api/account/data-export"
        download
        className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        <Download className="size-4" aria-hidden />
        {t("button")}
      </a>
    </div>
  );
}
