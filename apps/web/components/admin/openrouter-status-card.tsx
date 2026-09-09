import { Zap } from "lucide-react";
import type { OpenRouterStatus } from "@/lib/openrouter-status";

export function OpenRouterStatusCard({ status }: { status: OpenRouterStatus | null }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
        <Zap className="size-4 text-[#e89818]" /> AI service (OpenRouter) — top-up guide
      </p>

      {status ? (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>
            Lifetime credits purchased: <span className="font-semibold text-foreground">${status.totalCreditsPurchased.toFixed(2)}</span>
          </span>
          <span>
            Lifetime usage: <span className="font-semibold text-foreground">${status.totalUsage.toFixed(2)}</span>
          </span>
          <span
            className={
              status.dailyFreeRequestCap >= 1000
                ? "rounded-full bg-[#008848]/10 px-2 py-0.5 font-semibold text-[#046637]"
                : "rounded-full bg-[#e89818]/10 px-2 py-0.5 font-semibold text-[#b97a0f]"
            }
          >
            Free-tier cap: {status.dailyFreeRequestCap}/day
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Couldn&apos;t reach OpenRouter&apos;s API to read live status right now.</p>
      )}

      <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How to top up:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-4">
          <li>
            Sign in at{" "}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              openrouter.ai
            </a>{" "}
            with the account behind <code className="rounded bg-muted px-1 py-0.5">OPENROUTER_API_KEY</code>.
          </li>
          <li>Open Settings → Credits and add funds (card or crypto).</li>
          <li>
            <span className="font-medium text-foreground">One-time $10 minimum is the real threshold worth hitting</span> — OpenRouter permanently
            raises this key&apos;s free-tier daily request cap from 50/day to 1000/day the moment lifetime purchases cross $10, and it never resets
            back down even if the balance is later spent to $0.
          </li>
          <li>Beyond that, any amount added just becomes real spending balance for paid-model fallback calls (the ones free models can&apos;t handle).</li>
        </ol>
      </div>
    </div>
  );
}
