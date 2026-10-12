# The MarketitNow AI Board — a summoner's guide

You run a 15-person company that never sleeps, never asks for equity, and lives in
`.claude/agents/`. This guide is how you call them into the room.

---

## Meet the board

| Seat | Summon name | Their superpower | Can they touch code? |
|---|---|---|---|
| 👑 CEO / Product Owner | `ceo-product` | Roadmaps, priorities, PRDs. Says "no" to good ideas so great ones ship. | Read-only |
| 🏗️ CTO | `cto` | Architecture, cost, "what breaks at 100M listings". | Read + shell |
| 🗄️ Staff Backend Engineer | `backend-engineer` | Postgres, RLS, migrations, Server Actions, search queries. | ✅ Builds |
| 🎨 Frontend Engineer | `frontend-engineer` | Next.js screens, mobile-first, a11y, SEO, speed. | ✅ Builds |
| ✏️ UX/UI Designer | `ux-designer` | Journeys and wireframes, benchmarked against Marktplaats, FB Marketplace, eBay, Gumtree and OLX. | Read-only |
| 🤖 AI Engineer | `ai-engineer` | Listing generator, moderation, fraud models, at the lowest inference cost. | ✅ Builds |
| 🔍 Search & Recs | `search-engineer` | Relevance, ranking, vector + "near me" search, recommendations. | ✅ Builds |
| 🛡️ CISO | `security-engineer` | Threat models for everything. Assumes everyone is a hacker, politely. | Read + shell |
| 🚀 Head of Growth | `growth` | Viral loops, SEO, referrals, email. Every idea comes with a kill criterion. | Read-only |
| 🤝 Trust & Safety | `trust-safety` | Scam, fake and duplicate detection, seller reputation. | Read + shell |
| ⚙️ DevOps | `devops` | CI/CD, monitoring, backups, uptime. | Read + shell |
| 📊 Data Analyst | `data-analyst` | Real numbers from the real database (read-only, aggregated). | Read + shell |
| 💶 Monetization | `monetization` | Pricing, promoted listings, subscriptions, revenue projections. | Read-only |
| 🧪 QA Automation | `qa-engineer` | Unit, integration and Playwright E2E. Breaks things before users do. | ✅ Builds |
| 🌍 International Expansion | `international-expansion` | Country launch plans: NL, BE, DE, FR, CM, NG, KE, ZA. | Read-only |

"Read-only" seats advise; they can't edit files. The ✅ seats can write code and tests. Either
way, nothing ships to marketitnow.net until you say "push".

---

## How to summon them

### 1. Just ask (the easy way)
Name the seat in plain English and Claude calls them in:

> "Ask the **CISO** to threat-model the ad-bump checkout."
>
> "Have **Growth** find our three cheapest acquisition wins in Amsterdam."
>
> "Get the **Data Analyst** to show me signup → first listing conversion for the last 30 days."

### 2. The @-mention (the guaranteed way)
Type `@` in the Claude Code prompt and pick the agent. It appears as `@agent-<name>`, and the
mention makes sure that exact seat takes the job:

> `@agent-ux-designer` redesign the post-an-ad step 2 for one-thumb use on a phone
>
> `@agent-qa-engineer` write a Playwright regression test for messaging

### 3. Call a board meeting (the big one)
For a large feature, convene the whole board. Claude acts as chair: it brings in the relevant
seats in parallel, then merges their views into the 12-section board review from AGENTS.md §15
(business case → spec → UX → database → backend → frontend → AI → testing → deployment →
analytics → security → monetization).

> "**Convene the board**: buyer-seller video calls inside chat."
>
> "**Board meeting** on launching in Lagos."

Board depth scales with the size of the ask. A copy tweak gets no meeting, a medium feature gets
a one-pager, and a new money flow or market gets the full 12 sections.

### 4. Pit them against each other (the fun way)
Seats have deliberately different incentives. Use that:

> "Have **Monetization** pitch sponsored search results, then let **Trust & Safety** and
> **Search** try to shoot it down. Give me the verdict."
>
> "**CTO** vs **DevOps**: do we need a separate search engine yet? Make them argue it out."

---

## Talking to a seat after the meeting

- **Follow-ups keep context.** Say "ask the CTO a follow-up: what if we 10x traffic?" and
  Claude continues the *same* CTO conversation rather than starting a cold one.
- **Hand-offs work.** "Take the UX designer's wireframe and have the frontend engineer build
  it" passes the work along the chain.
- **Push back.** Seats are told to ground every claim in the code or data. If something sounds
  made up, ask "show me the file or query", and they should cite `file:line` or say "unknown".

---

## Spell book (copy-paste prompts)

| Want | Say |
|---|---|
| A ranked roadmap | "CEO: give me the top 5 things to build next quarter, with ROI." |
| A PRD | "CEO: write a PRD for saved-search push notifications." |
| A security check before shipping | "CISO: threat-model the current diff." |
| Real metrics | "Data Analyst: weekly active sellers and listings posted, last 8 weeks." |
| A pricing decision | "Monetization: should Premium be €4.99 or €7.99? Projections, please." |
| A launch plan | "International Expansion: launch plan for Belgium (Flanders first)." |
| Scam defenses | "Trust & Safety: how would a scammer abuse Direct Buy today?" |
| A redesign | "UX: benchmark our listing page against Marktplaats and OLX." |
| A test safety net | "QA: what are our 10 riskiest untested paths? Write tests for the top 3." |
| A growth experiment | "Growth: design a referral loop experiment with a kill criterion." |

---

## House rules every seat follows

1. **This stack, not a fantasy stack.** Next.js + Supabase + Vercel (AGENTS.md §2). Bigger
   infrastructure arrives only when a named metric triggers it.
2. **Now / At 10x / At 100x.** Billion-dollar ambition, build what today needs.
3. **No fakes.** No invented badges, counts, reviews or AI capabilities.
4. **Every recommendation shows its work:** business impact, effort, ROI, risks and success
   metrics.
5. **You hold the keys.** Agents can draft, build and test. Deploying to production and anything
   outward-facing waits for your "yes".

## Good to know

- **Not showing up?** New agent files load when a session starts. Run `/agents` to see the
  roster, or restart Claude Code if a seat is missing.
- **Editing a seat:** each one is a plain Markdown file in `.claude/agents/`. Change its
  personality, tools or focus there (or via `/agents`), and the change applies next session.
- **Cost:** every summon starts a fresh agent that re-reads the codebase, so it costs more than
  asking Claude directly. Summon seats for depth or a second opinion, and just ask Claude for
  quick things.
