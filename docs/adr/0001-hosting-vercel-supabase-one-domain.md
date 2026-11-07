# ADR-0001: Vercel + Supabase, one public domain

**Status:** Accepted (2026-11-06)

**Context:** The site had been served from three places: a Plesk host (marketplace.apps-pilot.nl),
afrodeals.net and marketitnow.net, all against the same production database. Links in emails and
sitemaps pointed at whichever host built them.

**Decision:** marketitnow.net is the only public address. The Next.js app (`apps/web`) runs on
Vercel (project `afrodeals.net`); data, auth and storage are in Supabase. Pushing to `main` on
GitHub deploys. `lib/site-url.ts` forces `https://marketitnow.net` in every link built in
production; afrodeals.net 308-redirects. The Plesk copy is retired (still owner action R2).

**Consequences:** One place to deploy, verify (`/api/health` returns the commit) and roll back
(`vercel rollback`). Vercel and Supabase are both single points of dependency; see RUNBOOK.
