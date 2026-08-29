# Email & Auth Troubleshooting Log (2026-08-29)

A record of the "customer got Email rate limit exceeded" incident and everything it led to, in Q&A form. Kept for whoever debugs the next email/auth issue on this project.

## Q: A customer got "Email rate limit exceeded" while signing up. Why?

Supabase Auth was still using its own built-in default mailer for signup confirmation emails, instead of a real SMTP provider. That default mailer is explicitly meant for testing only and is capped at a couple of emails per hour per project (confirmed via `supabase/config.toml`'s `auth.rate_limit.email_sent = 2`, which mirrors the hosted default). Once more than ~2 people tried to sign up in the same hour, Supabase started rejecting new signups outright.

**Fix**: connect a real transactional email provider via Supabase's custom SMTP setting.

## Q: What provider did we use, and how was it set up?

[Resend](https://resend.com) (free tier: 3,000 emails/month). Steps:

1. Create a Resend account, add the domain to send from (we used the root `apps-pilot.nl`, not a specific subdomain).
2. Add the DNS records Resend shows (one DKIM TXT record at `resend._domainkey`, two CNAME records at `rsend` and `send`) in Plesk → Websites & Domains → [domain] → DNS Settings, at the **root domain's zone**, not a subdomain-specific one.
3. Wait for Resend to show the domain as **Verified**.
4. Create an API key in Resend → API Keys.
5. In Supabase Dashboard → Authentication → Settings → **SMTP Settings**, enable custom SMTP:
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: the Resend API key.
   - Sender email: `no-reply@apps-pilot.nl`, Sender name: `AfroDeals`.

## Q: Does verifying `apps-pilot.nl` in Resend also cover subdomains like `marketplace.apps-pilot.nl`?

Yes. DKIM/DMARC verification is scoped to the organizational domain; mail servers accept it as covering subdomains under standard "relaxed" alignment. No extra Resend setup is needed to send as `no-reply@marketplace.apps-pilot.nl` instead, if that's ever preferred.

## Q: We added the DNS records but Resend still showed the domain as unverified. Why?

Two distinct mistakes happened while setting this up, worth knowing about since they're easy to repeat:

1. **Host mismatch** — the records were first added under `*.marketplace.apps-pilot.nl` (e.g. `resend._domainkey.marketplace`) while the domain registered in Resend was the bare root `apps-pilot.nl`. DNS records for a root-domain verification must be at the root zone (`resend._domainkey`, `rsend`, `send` — no subdomain prefix).
2. **Value vs. reference confusion** — when re-adding the records at the root, the *values* got set to literal strings like `"resend._domainkey.marketplace"` / `"rsend.marketplace."` instead of the actual DKIM key / real CNAME target (`rsend-euw1.forge.rmta.net`). TXT records can't "point" to another record the way a CNAME can — the value has to be the literal content Resend shows.

Verify anytime with a public DNS lookup (works without any Resend/Plesk access):
```
curl -s "https://dns.google/resolve?name=resend._domainkey.apps-pilot.nl&type=TXT"
```
A `"Status":3` in the response means NXDOMAIN — the record isn't live yet, regardless of what any dashboard says.

## Q: SMTP was fixed and signups worked, but the confirmation email still linked to `http://localhost:3000`. Why?

Two layered bugs, found in this order:

1. **`signup()` never set `emailRedirectTo`** — `apps/web/app/signup/actions.ts` called `supabase.auth.signUp()` without it, so Supabase fell back to the project's default **Site URL**, which was still the untouched default (`http://localhost:3000`). `forgot-password/actions.ts` already had the correct pattern (build `redirectTo` from the request), signup just never got the same treatment.
2. **Even after adding `emailRedirectTo`, it was still localhost** — because Supabase validates any `redirectTo`/`emailRedirectTo` against an **allow-list** (Authentication → URL Configuration → Redirect URLs) before honoring it, and silently falls back to the default Site URL if the value isn't on that list. `https://marketplace.apps-pilot.nl/**` had to be added there too — a code fix alone wasn't sufficient.
3. **Still localhost after both of those** — the code was building the redirect URL from the `Origin` request header (`headers().get("origin")`), which turned out to be unreliable behind Plesk's reverse proxy for Server Action POSTs. Confirmed by testing: the link stayed on `localhost:3000` even with the emailRedirectTo code live and the Supabase allow-list updated. Fixed by deriving the origin from `x-forwarded-host`/`x-forwarded-proto` (or plain `Host`) instead — see `apps/web/lib/site-url.ts`. This also affected password reset and Google OAuth sign-in, which used the same fragile pattern; all three now share the one helper.

**Lesson**: don't trust `Origin` for building absolute URLs server-side behind a reverse proxy. Use `x-forwarded-host`/`x-forwarded-proto`.

## Q: How do we verify signup/email end-to-end without spamming a real inbox?

Use a disposable public inbox (Mailinator) with a unique timestamped address, drive the signup form with Playwright, then poll Mailinator's public JSON API:
```
curl -s "https://www.mailinator.com/api/v2/domains/public/inboxes/<inbox-name>"
```
and fetch the individual message by its `id` to inspect the actual link/content, not just "an email arrived."

## Q: Why did anonymous visitors see a "Categories" footer full of dead links on the login page?

Separate issue, found while testing: the site was (and by default still is) locked down to require sign-in for every page except a short allowlist (`/login`, `/signup`, `/help`, `/terms`, `/safety`, `/auth`, `/admin` — see `apps/web/proxy.ts`). Since `/login` is the only page an anonymous visitor can actually reach, and the global `<Footer>` component always rendered the full category list with real links, those links just bounced back to `/login` when clicked. Fixed by only rendering the category links (and skipping the query behind them) when a user is signed in — `apps/web/components/footer.tsx`.

## Q: Is the site permanently locked down to require sign-in for browsing?

No — this was a deliberate, temporary, pre-launch decision. It's now a runtime toggle: **Admin Dashboard (`/admin`) → "Require sign-in to browse"** switch, backed by an `app_settings` table (migration `20260101004100_app_settings.sql`) that `proxy.ts` reads on every request. Turning it off restores the original design (browsing is public; posting an ad, messaging, and other actions still require sign-in via their own independent page-level checks — those were never affected by this toggle). Defaults to locked-down if the settings row is ever missing or unreadable.

## Q: Where do the Resend/Supabase credentials live?

- `RESEND_API_KEY` — in `apps/web/.env.local` (git-ignored). Not currently consumed by app code directly; it's used as the SMTP password entered directly into the Supabase dashboard. Kept in `.env.local` for future in-app transactional email use.
- Supabase SMTP settings and the Redirect URLs allow-list live in the Supabase Dashboard only (Authentication → Settings / URL Configuration) — not in this repo, not in any env var.
