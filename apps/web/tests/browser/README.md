# Browser and live checks

Run from `apps/web`. They use `playwright-core` (with a locally installed Chromium/Chrome) and
`axe-core`, both dev dependencies. Unit and contract tests live one level up (`npm test`).

| Script | Checks |
|---|---|
| `anon-access.mjs` | Security: no private table, and no private column (postcodes), is readable with only the public key |
| `regression.mjs` | 20 user-visible behaviours: header, logos, layout at phone widths, key pages |
| `a11y-public.mjs` | WCAG 2.1 AA (axe), 13 signed-out pages × phone/desktop, 0 serious/critical allowed |
| `a11y-signed-in.mjs` | The same for 24 signed-in pages, as `claude-agent-test@marketitnow.net` (one-time admin link, no password) |
| `data-export.mjs` | "Download my data": 401 signed out; signed in, a JSON attachment with only the test account's own data |
| `translations.mjs`, `translations-e6.mjs` | No raw translation keys or errors in 5 languages |
| `load.mjs` | Light load: latency p50/p95 and errors per page |

```
node tests/browser/run-all.mjs                                  # against a local `next start -p 3217`
node tests/browser/run-all.mjs https://marketitnow.net --signed-in --load   # after a deploy
```

Run the live variant after every production deploy. `/api/health` returns the deployed commit,
so first check that the deploy has landed.
