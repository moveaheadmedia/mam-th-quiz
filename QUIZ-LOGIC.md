# Service Recommendation Quiz — Logic v4

This document is the plain-English specification for all **2,600 combinations**
of 4 personas × 5 business types × 5 budgets × 26 challenge selections.

The challenge step takes a main answer and an optional second one, so its 6
answers produce 26 selections: each answer alone, plus each ordered pair of the
5 combinable answers (20). Order is part of the selection —
`[website, ranking]` is a different brief from `[ranking, website]`.

> Source of truth: `assets/js/data.js` contains the services, base weights,
> interaction weights and budget framing. `assets/js/engine.js` contains the
> eligibility and phasing rules.

## 1. The model

The three cards are the three highest-scoring eligible services, in score
order. Rank 1 is the primary; ranks 2 and 3 are the supporting
recommendations. There is no separate bundle layer that can reorder them.

1. Add the weights of the selected answers. A second challenge counts at
   `SECONDARY_CHALLENGE_WEIGHT` (0.5); every other answer counts in full.
2. Add any matching cross-answer interaction weights, scaled by the rank of the
   challenge that triggered them.
3. Drop services that are not eligible for this context.
4. Sort by score. First is primary, next two support it.
5. Phase those three according to budget.

This is a deliberate change from v2, which chose a primary from a per-challenge
pool and then assembled supports by role. That let a card be badged
“supporting” while a higher-scoring service sat below it — in 214 of the 600
combinations the displayed order did not match the scores. All of the business
logic now lives in the weights and the eligibility gates, where it can be read
and argued with directly.

The four questions are deliberately unequal. The challenge is the dominant
signal, because it is the client telling us what is actually wrong. Business
type shapes which channel answers that challenge. Budget shifts the emphasis
toward fast payback or toward compounding assets. Persona is a light nudge. In
v2 every persona and every business type awarded points to SEO, Google Ads and
Social, so those three floated to the top of almost every result regardless of
what was chosen; each question now awards points only where the answer implies
genuine fit.

There are no negative weights and no hidden challenge multiplier. Challenge
weights in the tables below are already the final values.

`SEO + AI Visibility` has one public score, `seo`. An AI-visibility answer adds
an `ai-first` focus to that service; it does not create a second competing SEO
card. `social` represents paid social demand generation, including Meta /
Facebook Ads.

Scores are fit points, not percentages or predicted performance.

## 2. Recommendation roles

| Role | Services |
| --- | --- |
| Frequently primary | SEO + AI Visibility, Google Ads |
| Primary in their own context | Local SEO for local ranking; Website Development or UX/UI for a website upgrade; Consultation when unsure where to start |
| Usually supporting | Social, Content, CRO, Programmatic |
| Delivery or engagement overlay | White Label SEO for agencies; Outcome-aligned delivery for high-budget enterprise contexts |

White Label SEO and Outcome Marketing stay in the service catalogue for URLs
and copy, but do not compete with the visitor's actual marketing need. They
change how the recommended work is delivered.

## 3. Base weight tables

A blank service receives 0 points from that answer.

### Q1 — Who you are

A small nudge only, and only toward services that persona can genuinely absorb.
This question does not award points to every channel — that was what let the
same three services float to the top regardless of the answers.

| Answer | Services it boosts |
| --- | --- |
| Small Business / SME | Google Ads +2, Social +2, Local SEO +1 |
| In-House Marketing Team | SEO +2, Content +2, Social +1 |
| Enterprise / Corporate | Content +3, SEO +2, Programmatic +2 |
| Agency / Consultant | SEO +2, Content +1 |

### Q2 — Business type

The channel shape a business model actually implies.

| Answer | Services it boosts |
| --- | --- |
| Local Business / SME | Local SEO +8, Google Ads +5, Social +3, SEO +1 |
| National Brand | SEO +6, Social +5, Content +4, Programmatic +3, Google Ads +3 |
| E-commerce Business | Google Ads +6, CRO +6, Social +5, SEO +4, Content +1 |
| Enterprise Company | SEO +6, Content +5, Programmatic +4, Google Ads +2, Social +2 |
| Mixed Business Model | Google Ads +4, SEO +4, Social +3, CRO +3, Local SEO +2, Content +1 |

### Q3 — Monthly budget

Budget shifts emphasis; it does not pick the answer. A small budget leans on
channels that pay back fast and cost little to run. A larger one makes
compounding assets — organic, content, scaled media — worth funding. It never
awards points evenly across the board, which is what previously let a service
ride up the ranking on budget alone.

| Answer | Services it boosts |
| --- | --- |
| Below THB 50,000 | UX/UI +8, Google Ads +4, Social +4, Local SEO +3, CRO +2 |
| THB 50,000–100,000 | UX/UI +4, Google Ads +3, Social +3, SEO +3, Local SEO +3, CRO +2, Content +1 |
| THB 100,001–300,000 | SEO +5, Content +4, Local SEO +4, Website Development +4, Google Ads +3, Social +3, CRO +3, Programmatic +2 |
| THB 300,001+ | Website Development +8, SEO +6, Content +6, Programmatic +6, Local SEO +5, CRO +4, Google Ads +3, Social +3 |
| I'm not sure yet | No fit points; keep the recommendation indicative and add a budget-sizing step |

No service may receive the same number of points at every tier — that is
enforced by the regression suite. A flat award is a service riding the budget
answer rather than earning its place.

### Q4 — Biggest challenge

The dominant signal, on its own scale. A service that does not answer the
stated challenge scores nothing here.

This is the only multi-select question. The visitor names a main challenge and
may add one more, to a maximum of two. **The main answer scores at the values
below; a second scores at half of them.** Every weight in the table is even, so
halving always yields a whole number and the one-point tie rule keeps its
meaning.

"I'm not sure where to start" is marked `exclusive`: knowing a second challenge
means you are not unsure, so it cannot be paired with anything. Selecting more
than two answers, the same answer twice, or an exclusive answer alongside
another is rejected outright — the result reports itself incomplete rather than
scoring half a question.

| Answer | Services it boosts |
| --- | --- |
| I need more leads | Google Ads +24, Social +18, CRO +12, SEO +8, Content +4, Programmatic +4 |
| My website doesn't rank on Google | SEO +30, Content +20, Local SEO +14, Google Ads +4, Social +2 |
| My business isn't visible in AI Search | SEO +30, Content +22, Social +4, Google Ads +2, Local SEO +2 |
| I need more traffic | SEO +24, Google Ads +20, Social +16, Content +12, Programmatic +8, CRO +6 |
| My website needs an upgrade | Website Development +30, UX/UI +24, CRO +12, SEO +10 |
| I'm not sure where to start | Consultation +40, SEO +6, Google Ads +6, Social +6, Local SEO +6 |

Challenge weights are three to five times the size of any other question's, so
what the client says is wrong is what drives the recommendation.

## 4. Cross-answer interaction weights

Some combinations mean more than their individual answers. Each matching rule
is applied once after the base points are added, scaled by the rank of the
challenge that triggered it: a rule fired by the second challenge applies at
half strength. Without that, a second answer would swing more points through a
bonus than through its own weights.

| Combination | Additional points | Purpose |
| --- | --- | --- |
| Local business + Leads | Google Ads +2 | Local search intent converts hardest on paid search |
| Over THB 300k + Leads + National/Enterprise | SEO +8, Content +6 | At this budget the brief changes: build a demand engine, do not just buy clicks |
| Local business + Ranking | Local SEO +14 | A local ranking problem is a local problem at every budget |
| E-commerce + Traffic | CRO +14 | Traffic without conversion work is just more expensive traffic |
| Over THB 300k + Traffic + National/Enterprise | Programmatic +10 | Scaled reach is what a very large media budget actually unlocks |
| AI challenge + enterprise persona or enterprise business type | Content +4 | Adds the content depth needed for an enterprise AI-visibility programme |

The last rule is an OR condition and still adds Content +4 only once when both
the persona and business type are Enterprise.

## 5. Eligibility gates

Gates prevent a high incidental score from producing a contextually wrong card.
Where a gate names a challenge, it is satisfied by **either** stated challenge —
a client whose main challenge is a website upgrade and whose second is ranking
keeps both the website services and the ranking services in play.

| Service | Eligible when |
| --- | --- |
| Local SEO | Business type is Local or Mixed **and** the challenge is Ranking, AI Visibility or Not Sure. Local SEO is a search-visibility service, not a general lead channel: a local business that needs leads is better served by paid search and paid social, with organic and AI visibility built underneath. A local business that does not know where to start is a different case — its map presence is a likely first move |
| Website Development and UX/UI | Challenge is Website Upgrade |
| Content | Challenge is Ranking, AI Visibility or Traffic; also Leads once the budget is at least THB 100,001, where content can be funded alongside the channels that convert |
| CRO | E-commerce or Mixed type, or a Website Upgrade, or a Leads/Traffic challenge with at least THB 100,001 — optimising conversion needs traffic worth optimising |
| Programmatic | Budget is at least THB 100,001; type is National, Enterprise or Mixed; challenge is Leads or Traffic |
| Consultation | Challenge is Not Sure; an unknown budget can also reference Consultation as a sizing step without changing the scored primary |
| White Label SEO | Delivery overlay for Agency persona; never ranked |
| Outcome Marketing | Engagement overlay when persona or type is Enterprise and budget is THB 300,001+; never ranked |

For partial answers in the developer sandbox, final gates wait until all four
questions are valid. This keeps partial-score exploration useful. Production
results require all four valid answers.

## 6. Primary and supporting selection

Score order is the recommendation. After eligibility, the highest-scoring
service is the primary and the next two are the supporting recommendations.
There is no per-challenge pool and no role-based bundle: if a challenge should
produce a particular shape, the weights have to say so.

The shapes the current weights produce:

| Challenge/context | Resulting three cards |
| --- | --- |
| Leads, small to mid budget | Google Ads → Social → SEO + AI Visibility, or CRO once there is budget to optimise |
| Leads, over THB 300k, National/Enterprise | SEO + AI Visibility or Google Ads leads, with Content or Social alongside |
| Ranking + Local | Local SEO → SEO + AI Visibility → Content |
| Ranking + any other type | SEO + AI Visibility → Content → Google Ads or Local SEO |
| AI Visibility | SEO + AI Visibility (`ai-first` focus) → Content → strongest paid channel |
| Traffic, small budget | Google Ads → SEO + AI Visibility → Social or CRO |
| Traffic, larger budget | SEO + AI Visibility → Google Ads → Social, CRO or Programmatic |
| Website, below THB 50k | UX/UI → Website Development → CRO or SEO + AI Visibility |
| Website, THB 50k+ | Website Development → UX/UI → CRO (e-commerce/mixed) or SEO + AI Visibility |
| Not Sure | Consultation → the two best-fitting channels for that business; Local SEO leads that pair for a local business |

Google Ads leads most lead-generation plans because paid search captures demand
that already exists, which is what "I need more leads" describes. It stops
leading once the budget is large enough for a national or enterprise brand to
fund a demand engine instead — at THB 300,001+ the plan shifts toward SEO and
Content.

A website upgrade is the clearest case of budget changing the answer rather
than the phasing: below THB 50k the plan leads with a UX/UI redesign, and from
THB 50k upward it leads with a full rebuild.

Budget changes the recommended three in 62 of the 120 persona/type/challenge
groups, and changes the primary in 32 of them.

Exact-score ties fall back to the global priority list in `data.js`
(`PRIORITY`), so results stay deterministic. A one-point lead is a real lead,
not a tie — but a 0–1 point gap is reported as medium confidence so a
strategist validates the final channel mix.

Services that are configured as primary-only (`PRIMARY_ONLY`, currently just
Consultation) are never shown as a supporting card. `ranked` starts with the
three cards and continues through the rest of the eligible field, so the
sandbox can show exactly what placed fourth and why.

## 7. Budget phasing

The quiz always explains a three-card strategic direction, but does not imply
that every budget can fund all three services at once.

| Budget | Phase rule |
| --- | --- |
| Below THB 50k | Start the primary now; keep both supports on the roadmap |
| THB 50k–100k | Run the primary and first support; keep the second support for the next phase |
| THB 100,001–300k | Run two workstreams; add the third next |
| THB 300,001+ | The full three-service mix can run as an integrated programme |
| Unknown | Consultation sizes the budget first; all scored recommendations remain indicative areas to explore |

## 8. Worked examples

### A. SME + Local + Below THB 50k + Leads

The reference persona. Local SEO is not eligible for a lead-generation
challenge, and CRO needs more budget before it is worth running.

| Service | Persona | Type | Budget | Challenge | Interaction | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Google Ads | 2 | 5 | 4 | 24 | 2 | **37** |
| Social | 2 | 3 | 4 | 18 | — | **27** |
| SEO + AI Visibility | 0 | 1 | 0 | 8 | — | **9** |

**Result:** Google Ads primary → Social → SEO + AI Visibility. At this budget
only Google Ads starts now; the other two are the roadmap.

### B. The same local SME at THB 300,001+

Google Ads 36 → Social 26 → CRO 16. The larger budget makes conversion work
worth funding, so CRO displaces SEO in the third slot and all three run
together.

### C. National Brand + Over THB 300k + Leads

The scaled demand-generation rule adds SEO +8 and Content +6, so SEO + AI
Visibility 30 ties Google Ads 30 and takes the primary slot on priority order.

**Result:** SEO + AI Visibility → Google Ads → Social. At this budget the brief
is to build demand, not only to buy it.

### D. SME + Local + Ranking

Local SEO 37 → SEO + AI Visibility 31 → Content 20 at the smallest budget, and
Local SEO stays primary at every budget: a local ranking problem is a local
problem however much is being spent. More budget widens the plan underneath it
rather than replacing it.

### E. Agency + National + Over THB 300k + Traffic

SEO + AI Visibility 38 → Programmatic 27 → Google Ads 26. Scaled reach only
becomes buyable at this budget; below THB 100,001 Programmatic is not even
eligible.

## 9. Exhaustive regression target

The automated test enumerates every one of the 2,600 valid answer tuples: the
600 single-challenge cases below, plus 2,000 two-challenge cases.

Answering one challenge produces byte-for-byte the result it produced before
multi-select existed, which is asserted for all 600 cases. The single-challenge
distribution is therefore unchanged:

| Primary | Cases |
| --- | ---: |
| SEO + AI Visibility | 278 |
| Google Ads | 102 |
| Free Strategy Consultation | 100 |
| Website Development | 80 |
| Local SEO | 20 |
| UX/UI | 20 |
| **Total** | **600** |

Across the 400 Leads, Ranking, AI and Traffic cases, Google Ads or SEO is
primary in 380 cases (95%). The remaining 20 are all Local + Ranking, where
Local SEO is deliberately more precise. Website Upgrade and Not Sure remain
deterministic rather than being distorted to increase a preferred service's
frequency.

Social is never primary. It is the second card in most lead plans, which is the
role it actually plays: demand creation alongside demand capture.

The 600 single-challenge combinations produce 28 distinct three-service plans.

The full top-three appearance target is:

| Service | Top-three appearances |
| --- | ---: |
| SEO + AI Visibility | 514 |
| Google Ads | 324 |
| Social Media Marketing | 291 |
| Content | 206 |
| Website Development | 100 |
| UX/UI | 100 |
| Consultation | 100 |
| Local SEO | 80 |
| CRO | 77 |
| Programmatic | 8 |

The appearances total 1,800: exactly three recommendations for every
single-challenge combination. White Label SEO and Outcome Marketing appear as
overlays, not ranked cards.

### Across all 2,600 selections

Adding the 2,000 two-challenge cases gives the full baseline the suite asserts:

| Primary | Cases | | Service | Top-three appearances |
| --- | ---: | --- | --- | ---: |
| SEO + AI Visibility | 1,645 | | SEO + AI Visibility | 2,403 |
| Google Ads | 468 | | Google Ads | 1,506 |
| Website Development | 263 | | Content | 1,188 |
| Free Strategy Consultation | 100 | | Social Media Marketing | 939 |
| UX/UI | 88 | | Website Development | 608 |
| Local SEO | 34 | | UX/UI | 520 |
| CRO | 2 | | Local SEO | 256 |
| **Total** | **2,600** | | CRO | 251 |
| | | | Consultation | 100 |
| | | | Programmatic | 29 |

Appearances total 7,800 — three cards for every selection. Social is still
never primary. Every score stays a whole number, and no selection produces
fewer than three cards.

The 2,600 selections produce 55 distinct three-service plans, up from 28 with a
single challenge — the measurable gain from letting a client name a second
problem.

Two properties the suite enforces specifically, because they are what a naive
"add both challenges together" implementation gets wrong:

- **A website upgrade named as the main challenge always keeps a website
  service in the plan** — all 400 such cases. Summing both challenges at full
  weight drops Website Development out of the cards entirely in some contexts,
  because SEO is the only service scoring on all six challenges and wins on
  breadth rather than fit.
- **Order changes the plan** in a large majority of the 1,000 unordered pairs.
  If it did not, the "main challenge" promise on screen would be decorative.
