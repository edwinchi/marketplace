"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (older browsers, permissions) -- the link is still selectable
      // text below, so this degrades to "copy it yourself" rather than a broken button.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <code className="flex-1 truncate px-1 text-sm">{link}</code>
      <Button type="button" size="sm" variant="outline" onClick={copy} className="shrink-0 gap-1.5">
        {copied ? <Check className="size-3.5 text-[#008848]" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
