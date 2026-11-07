# What we can learn from Marktplaats (reviewed 2026-11-07)

We reviewed marktplaats.nl (home, `/l/huis-en-inrichting/`, `/q/fiets/`) for UX and product
patterns, not for its design.

## Applied (2026-11-07)
| Learning | What we did |
|---|---|
| Cards show **city + date** ("Apeldoorn · Vandaag"), which is what a local buyer scans for | Every listing card shows `City · Today / Yesterday / 3 Nov`. City casing is normalised ("ZWOLLE" → "Zwolle"). |
| **Paid placement is labelled** ("Topadvertentie") and a note says that paid options influence the order. EU law (Omnibus Directive, UCPD Annex I 11a) requires this | Boosted listings (`boost_rank > 0`) carry a "Promoted" badge. Category feeds show "Sorted by newest first. Promoted listings, a paid option for sellers, are shown first." In 5 languages. |

## Suggested next (by value per effort)
1. **Counts next to every filter** ("Gebruikt (484.665)"): buyers see where the stock is before
   clicking. Needs a grouped-count RPC per facet (Eng, Level 1).
2. **"Posted since" filter** (today / yesterday / this week): cheap, since `published_at` is indexed.
3. **Save-search prompt above and below results** ("Get notified of new results"). We have saved
   searches with alerts, but the button is only on the homepage search (and alerts need E7 email).
4. **Distance next to search** ("Alle afstanden"): we have `distance_search.sql`; surface a radius
   picker beside the city field.
5. **Condition + delivery line on cards** ("Zo goed als nieuw · Ophalen of Verzenden"), once the
   card density trade-off is decided (our grid is 3 per row on phones).
6. **Trust entry points on the homepage**: buyer protection, how payment and shipping work, and a
   safety centre linked in the header (we have `/safety`; it isn't in the header).
7. **Sellable add-ons**: Marktplaats sells independent, stackable visibility products
   (Topadvertentie, Dagtopper, bundles for businesses). We have tiers and homepage placement; a
   "Dagtopper"-style 24h boost is a low-effort revenue test after the free AI period.

## Where we're already ahead
- AI listing from a photo, translation into 5 languages, multi-currency, and WCAG AA on signed-in
  pages. Marktplaats' homepage is text and link lists, with no hero imagery.
