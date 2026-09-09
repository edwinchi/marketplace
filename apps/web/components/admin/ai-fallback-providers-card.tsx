import { Zap } from "lucide-react";
import type { AiFallbackProviderStatus } from "@/lib/ai-fallback-provider-status";

function ConfiguredPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={
        configured
          ? "rounded-full bg-[#008848]/10 px-2 py-0.5 text-xs font-semibold text-[#046637]"
          : "rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
      }
    >
      {configured ? "Configured" : "Not configured"}
    </span>
  );
}

export function AiFallbackProvidersCard({ status }: { status: AiFallbackProviderStatus }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
        <Zap className="size-4 text-[#e89818]" /> Fallback AI providers
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tried before OpenRouter for every AI feature — each has its own separate free daily quota, so configuring them adds real capacity rather
        than just more attempts against OpenRouter&apos;s scarcer pool. None of these expose a live usage API the way OpenRouter does, so status
        here just shows whether each is switched on.
      </p>

      <div className="mt-4 space-y-4 text-xs">
        <div className="border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">Groq</p>
            <ConfiguredPill configured={status.groqConfigured} />
          </div>
          <p className="mt-1 text-muted-foreground">Text features only (no vision). Free tier: ~30 requests/min, 1,000/day.</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Get a free key at{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                console.groq.com/keys
              </a>{" "}
              (no card required).
            </li>
            <li>
              Set it as <code className="rounded bg-muted px-1 py-0.5">GROQ_API_KEY</code> in Vercel&apos;s production env vars.
            </li>
            <li>To raise the daily cap, add a card in the Groq console — paid tiers get up to 10x the free rate limits.</li>
          </ol>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">Google Gemini (AI Studio)</p>
            <ConfiguredPill configured={status.geminiConfigured} />
          </div>
          <p className="mt-1 text-muted-foreground">Vision-capable — covers photo analysis too. Free tier: request caps vary by model/day, reset daily.</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Get a free key at{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                aistudio.google.com/apikey
              </a>{" "}
              (no card required for the free tier).
            </li>
            <li>
              Set it as <code className="rounded bg-muted px-1 py-0.5">GOOGLE_AI_API_KEY</code> in Vercel&apos;s production env vars.
            </li>
            <li>
              <span className="font-medium text-foreground">To top up / raise limits:</span> open{" "}
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                aistudio.google.com
              </a>{" "}
              → Dashboard → Billing, then &quot;Set up billing&quot; to link a Google Cloud billing account. This moves the key from the free tier
              to pay-as-you-go — Google auto-upgrades the tier further (higher RPM/RPD) as usage and payment history build up, and a monthly spend
              cap can be set in the Spend tab so this can&apos;t run away.
            </li>
          </ol>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">GitHub Models (Copilot free tier)</p>
            <ConfiguredPill configured={status.githubModelsConfigured} />
          </div>
          <p className="mt-1 text-muted-foreground">
            Vision-capable via gpt-4o-mini. Free-tier rate limits are the lowest of these three (documented around 10 requests/min, 50/day for
            gpt-4o-mini) and scale up automatically with a paid GitHub Copilot plan on the same account.
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Create a fine-grained personal access token at{" "}
              <a
                href="https://github.com/settings/personal-access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                github.com/settings/personal-access-tokens
              </a>{" "}
              with the &quot;Models&quot; account permission set to read-only.
            </li>
            <li>
              Set it as <code className="rounded bg-muted px-1 py-0.5">GITHUB_MODELS_TOKEN</code> in Vercel&apos;s production env vars.
            </li>
            <li>Upgrading the GitHub account to a paid Copilot plan raises this token&apos;s rate limits — no code change needed either way.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
