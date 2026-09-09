This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI providers (multi-provider fallback)

AfroDeals' AI features (photo analysis, description polish, price suggestion, translation,
seller-insights summary) call out to language models through a small fallback chain rather than
one fixed provider, so a single provider's quota or outage doesn't take the features down. The
chain is built in [`lib/ai-providers.ts`](lib/ai-providers.ts) and consumed by
[`lib/ai-text.ts`](lib/ai-text.ts) (the four text features) and
[`app/listings/new/analyze-photo-action.ts`](app/listings/new/analyze-photo-action.ts) (photo
analysis, which needs a vision-capable model).

### Providers, in try order

| Order | Provider | Model | Env var | Free quota | Vision? |
|---|---|---|---|---|---|
| 1 (text only) | Groq | `qwen/qwen3.8-27b` | `GROQ_API_KEY` | 30 req/min, 1,000/day | No |
| 2 | Google Gemini | `gemini-flash-lite-latest` | `GOOGLE_AI_API_KEY` | 1,500 req/day (per Google's docs) | Yes |
| 3+ | OpenRouter | `openrouter/free` + several named free models, then `anthropic/claude-sonnet-4.5` (paid) | `OPENROUTER_API_KEY` | 50/day, permanently 1,000/day once the account has ever purchased $10+ in credits | Yes (for the models used in the vision list) |

Groq and Gemini are tried first specifically because each has its **own, separate** daily quota —
using them first means real traffic draws down 1,000/day and 1,500/day pools before ever touching
OpenRouter's much scarcer 50–1,000/day pool, which is kept as the backup-of-backups (ending in a
paid Claude call so a feature never just goes down). Groq is skipped for photo analysis because its
free-tier models are text-only.

Every provider here is **optional** — `buildProviderAttempts()` only adds a provider to the list if
its env var is actually set. With no keys at all, everything falls straight through to the
OpenRouter chain exactly as it worked before Groq/Gemini existed.

### Adding or rotating a key

1. Get a free key — no payment method required for either:
   - Groq: [console.groq.com/keys](https://console.groq.com/keys)
   - Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Add it to Vercel production: `vercel env add GROQ_API_KEY production` (or `GOOGLE_AI_API_KEY`),
   or via the Vercel dashboard → Settings → Environment Variables.
3. Add the same value to `.env.local` for local testing.
4. Redeploy (or just wait for the next deploy) — no code changes needed, the provider activates
   automatically once its env var is present.

### Gotcha this chain works around: "reasoning" models that eat their own output

Several current free-tier models across every one of these providers default to running an
internal "thinking" pass before producing a real answer — and can spend part or *all* of the
token budget on that pass, leaving `message.content` empty (`nvidia/nemotron-3-super-120b-a12b:free`
and `openai/gpt-oss-20b` on Groq both do this; several Gemini aliases like `gemini-flash-latest`
and `gemini-3.6-flash` do too, silently, with `finish_reason: "length"` and zero completion
tokens). Confirmed live for each provider used here:

- **OpenRouter**: fixed by adding `reasoning: { exclude: true }` to the request body (see
  `lib/ai-text.ts` and `analyze-photo-action.ts`) — this is OpenRouter-specific and only sent when
  the request is going to `openrouter.ai`.
- **Groq**: `qwen/qwen3.8-27b` was picked specifically because it answers directly with no
  reasoning step at all, avoiding the issue instead of working around it.
- **Gemini**: `gemini-flash-lite-latest` was picked the same way, after `gemini-2.5-flash` (the
  originally researched model) turned out to be fully deprecated for new API keys, and several of
  its suggested replacements hit the same empty-content bug.

If you add a new model to any of these lists, test it with a short prompt and check
`message.content` isn't empty before trusting it — this failure mode is silent (200 OK, no error)
and easy to miss without checking the actual field.

### OpenRouter top-up

The `/admin` dashboard has a live OpenRouter status card with real account numbers and a top-up
guide. The one number worth knowing without opening it: OpenRouter permanently raises this
account's free-tier daily cap from 50/day to 1,000/day the first time lifetime purchases cross
$10 — it never resets back down even if the balance later hits $0 again, which makes a single
$10 top-up a disproportionately high-leverage action compared to any larger top-up later.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
