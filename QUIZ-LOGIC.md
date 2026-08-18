# Service Recommendation Quiz — Logic v2

This document is the plain-English specification for all **600 combinations**
of 4 personas × 5 business types × 5 budgets × 6 challenges.

> Source of truth: `assets/js/data.js` contains the services, base weights,
> interaction weights and budget framing. `assets/js/engine.js` contains the
> eligibility, primary-selection, bundle and phasing rules.

## 1. What changed from v1

V2 is not a flat “three highest scores win” model. It uses four layers:

1. Add the four selected answer weights.
2. Add any matching cross-answer interaction weights.
3. Apply eligibility and choose a primary from the selected challenge's valid
   primary pool.
4. Build two complementary supporting recommendations, then phase the bundle
   according to budget.

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
| Core primary-capable | Google Ads, Social Media Marketing, SEO + AI Visibility |
| Conditional primary | Local SEO for local ranking; Website Development for website upgrade; Consultation when unsure where to start |
| Supporting only | Content, CRO, UX/UI, Programmatic |
| Delivery or engagement overlay | White Label SEO for agencies; Outcome-aligned delivery for high-budget enterprise contexts |

White Label SEO and Outcome Marketing stay in the service catalogue for URLs
and copy, but do not compete with the visitor's actual marketing need. They
change how the recommended work is delivered.

## 3. Base weight tables

A blank service receives 0 points from that answer.

### Q1 — Persona

| Answer | Fit points |
| --- | --- |
| Small Business / SME | SEO +2, Google Ads +3, Social +3 |
| In-House Marketing Team | SEO +4, Google Ads +3, Social +3, Content +2 |
| Enterprise / Corporate | SEO +5, Google Ads +3, Social +3, Content +3, Programmatic +2 |
| Agency / Consultant | SEO +4, Google Ads +2, Social +2, Content +2 |

Persona also sets the delivery mode:

| Persona | Delivery mode |
| --- | --- |
| SME | Managed delivery |
| In-house team | Co-managed with the internal team |
| Enterprise | Enterprise programme governance |
| Agency | White-label delivery |

### Q2 — Business type

| Answer | Fit points |
| --- | --- |
| Local Business / SME | SEO +2, Local SEO +7, Google Ads +4, Social +3 |
| National Brand | SEO +6, Google Ads +3, Social +4, Content +2, Programmatic +2 |
| E-commerce Business | SEO +5, Google Ads +6, Social +5, CRO +5, Content +1 |
| Enterprise Company | SEO +6, Google Ads +3, Social +3, Content +3, Programmatic +2 |
| Mixed Business Model | SEO +5, Local SEO +2, Google Ads +5, Social +4, CRO +2, Content +1 |

### Q3 — Monthly budget

| Answer | Fit points |
| --- | --- |
| Below THB 50,000 | SEO +2, Local SEO +2, Google Ads +2, Social +3, CRO +1 |
| THB 50,000–100,000 | SEO +3, Local SEO +2, Google Ads +3, Social +3, CRO +1, Content +1 |
| THB 100,001–300,000 | SEO +4, Local SEO +2, Google Ads +4, Social +4, CRO +2, Content +2, Programmatic +1 |
| THB 300,001+ | SEO +5, Local SEO +2, Google Ads +5, Social +5, CRO +3, Content +4, Programmatic +4 |
| I'm not sure yet | No fit points; keep the recommendation indicative and add a budget-sizing step |

Budget mostly controls feasibility and phasing. It should not replace a clearly
stated need with Consultation.

### Q4 — Main challenge

These are final values; they are **not multiplied**.

| Answer | Fit points |
| --- | --- |
| I need more leads | SEO +4, Local SEO +4, Google Ads +12, Social +11, CRO +5 |
| My website doesn't rank on Google | SEO +15, Local SEO +8, Google Ads +4, Social +1, Content +7 |
| My business isn't visible in AI Search | SEO +15, Local SEO +1, Google Ads +2, Social +2, Content +8 |
| I need more traffic | SEO +12, Local SEO +3, Google Ads +10, Social +8, CRO +3, Content +5, Programmatic +2 |
| My website needs an upgrade | SEO +4, Website Development +24, UX/UI +18, CRO +8 |
| I'm not sure where to start | Consultation +30, SEO +3, Google Ads +3, Social +3 |

## 4. Cross-answer interaction weights

Some combinations mean more than their individual answers. Each matching rule
is applied once after the base points are added.

| Combination | Additional points | Purpose |
| --- | --- | --- |
| Below THB 50k + Leads | Social +4 | Makes focused paid-social demand generation the default in the constrained-budget lead case |
| Local business + Leads | Local SEO +4, Google Ads +2 | Adds local intent and map/search coverage to the lead mix |
| Local business + Ranking | Local SEO +11 | Makes Local SEO the correct primary for a local ranking problem |
| E-commerce + Traffic | CRO +10 | Reserves conversion efficiency as a meaningful part of the traffic plan |
| AI challenge + enterprise persona or enterprise business type | Content +4 | Adds the content depth needed for an enterprise AI-visibility programme |

The last rule is an OR condition and still adds Content +4 only once when both
the persona and business type are Enterprise.

## 5. Eligibility gates

Gates prevent a high incidental score from producing a contextually wrong card.

| Service | Eligible when |
| --- | --- |
| Local SEO | Business type is Local or Mixed; primary only for Local + Ranking |
| Website Development and UX/UI | Challenge is Website Upgrade |
| Content | Challenge is Ranking, AI Visibility or Traffic |
| CRO | E-commerce or Mixed type, or challenge is Leads, Traffic or Website Upgrade |
| Programmatic | Budget is at least THB 100,001; type is National, Enterprise or Mixed; challenge is Leads or Traffic; supporting only |
| Consultation | Challenge is Not Sure; an unknown budget can also reference Consultation as a sizing step without changing the scored primary |
| White Label SEO | Delivery overlay for Agency persona; never ranked |
| Outcome Marketing | Engagement overlay when persona or type is Enterprise and budget is THB 300,001+; never ranked |

For partial answers in the developer sandbox, final gates wait until all four
questions are valid. This keeps partial-score exploration useful. Production
results require all four valid answers.

## 6. Primary selection

The challenge defines the primary candidate pool. Scores order candidates
inside that pool.

| Challenge | Primary candidates |
| --- | --- |
| Leads | Google Ads or Social |
| Ranking | SEO or Local SEO; Local SEO wins for a Local business through the interaction rule |
| AI Visibility | SEO + AI Visibility |
| Traffic | SEO, Google Ads or Social |
| Website Upgrade | Website Development |
| Not Sure | Free Strategy Consultation |

Exact-score ties use contextual ordering:

- Leads: Social wins for Below THB 50k or a National Brand; Google Ads wins
  other exact ties.
- Traffic: SEO, then Google Ads, then Social.
- Local Ranking: Local SEO, then SEO.
- Other cases follow their candidate order and then the global priority list.

A one-point lead is a real lead, not a tie. A 0–1 point gap is marked as medium
confidence so a strategist can validate the final channel mix.

## 7. Supporting bundle assembly

Supporting services are chosen by role, not simply raw rank. This prevents
three similar cards or a tactical support service accidentally becoming the
headline.

| Challenge/context | Final three-card structure |
| --- | --- |
| Leads + Local | Higher-scoring paid channel → other paid channel → Local SEO |
| Leads + any other type | Higher-scoring paid channel → other paid channel → SEO |
| Ranking + Local | Local SEO → SEO → Google Ads |
| Ranking + any other type | SEO → Content → strongest paid channel |
| AI Visibility | SEO with `ai-first` focus → Content → strongest paid channel |
| Traffic + E-commerce | Highest of SEO/Google/Social → strongest paid channel → CRO |
| Traffic + National/Enterprise + over THB 300k | Highest of SEO/Google/Social → strongest paid channel → Programmatic |
| Other Traffic | SEO, Google Ads and Social ordered by score |
| Website + E-commerce/Mixed | Website Development → UX/UI → CRO |
| Other Website | Website Development → UX/UI → SEO for migration/search preservation |
| Not Sure | Consultation → SEO → strongest paid channel; supports are labelled areas to explore |

The engine removes duplicates, rechecks eligibility, and fills any empty support
slot from the eligible score order. `ranked` starts with the final primary and
two supports; `rawRanked` remains available as a score-only diagnostic.

## 8. Budget phasing

The quiz always explains a three-card strategic direction, but does not imply
that every budget can fund all three services at once.

| Budget | Phase rule |
| --- | --- |
| Below THB 50k | Start the primary now; keep both supports on the roadmap |
| THB 50k–100k | Run the primary and first support; keep the second support for the next phase |
| THB 100,001–300k | Run two workstreams; add the third next |
| THB 300,001+ | The full three-service mix can run as an integrated programme |
| Unknown | Consultation sizes the budget first; all scored recommendations remain indicative areas to explore |

## 9. Worked examples

### A. SME + Local + Below THB 50k + Leads

| Service | Persona | Type | Budget | Challenge | Interaction | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Social | 3 | 3 | 3 | 11 | 4 | **24** |
| Google Ads | 3 | 4 | 2 | 12 | 2 | **23** |
| Local SEO | 0 | 7 | 2 | 4 | 4 | **17** |
| SEO | 2 | 2 | 2 | 4 | 0 | **10** |
| CRO | 0 | 0 | 1 | 5 | 0 | **6** |

**Result:** Social primary → Google Ads → Local SEO. Only Social starts in the
first phase at this budget; the supports are a roadmap.

### B. SME + E-commerce + Below THB 50k + Traffic

SEO and Google Ads both score 21, so the Traffic tie order selects SEO. The
e-commerce bundle reserves CRO despite another channel having a similar raw
score.

**Result:** SEO primary → Google Ads → CRO.

### C. Enterprise persona + Enterprise type + Over THB 300k + AI Visibility

SEO scores 31 and Content scores 22. Google Ads and Social both score 13, so
Google Ads wins the paid tie. The result also carries enterprise-governance and
outcome-aligned delivery metadata.

**Result:** SEO with AI-first focus → Content → Google Ads.

### D. In-house team + Mixed type + Unknown budget + Leads

Google Ads scores 20, Social 18 and SEO 13. The unknown budget does not replace
the specific lead need with Consultation. It adds a consultation-led sizing
phase before implementation.

**Result:** Google Ads primary → Social → SEO, delivered co-managed.

## 10. Exhaustive regression target

The automated test enumerates every one of the 600 valid answer tuples. The
expected primary distribution is:

| Primary | Cases |
| --- | ---: |
| SEO + AI Visibility | 275 |
| Website Development | 100 |
| Free Strategy Consultation | 100 |
| Google Ads | 69 |
| Social Media Marketing | 36 |
| Local SEO | 20 |
| **Total** | **600** |

Across the 400 Leads, Ranking, AI and Traffic cases, Google Ads, Social or SEO
is primary in 380 cases (95%). The remaining 20 are all Local + Ranking, where
Local SEO is deliberately more precise. Website Upgrade and Not Sure remain
deterministic rather than being distorted to increase a preferred service's
frequency.

The full top-three appearance target is:

| Service | Top-three appearances |
| --- | ---: |
| SEO + AI Visibility | 540 |
| Google Ads | 452 |
| Social Media Marketing | 220 |
| Content | 180 |
| Website Development | 100 |
| UX/UI | 100 |
| Consultation | 100 |
| CRO | 60 |
| Local SEO | 40 |
| Programmatic | 8 |

The appearances total 1,800: exactly three recommendations for every valid
answer combination. White Label SEO and Outcome Marketing appear as overlays,
not ranked cards.
