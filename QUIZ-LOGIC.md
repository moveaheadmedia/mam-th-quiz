# Service Recommendation Quiz — Logic v6

This is the plain-English specification for every recommendation the quiz can
make: **6,300 combinations** of 4 personas × 5 business types × 5 budgets ×
9 goals × 7 problems.

> **What changed in v6.** The old single "biggest challenge" question did two
> jobs at once — it mixed *goals* ("I need more leads", "more traffic") with
> *problems* ("doesn't rank on Google"). v6 splits it into two single-select
> questions: a **Goal** (Step 4, the direction) and a **Challenge** (Step 5,
> the problem). The quiz is now six steps. Of the 20 signed-off personas, 9
> reproduce their v5 recommendation unchanged and 11 were re-approved with a
> new (sensible) plan when the cleaner model gave a different answer.

> **What changed in v6.1.** Five refinements, so the plan reads like the answer
> a strategist would actually give:
>
> 1. **The goal beats the business-type label.** "Increase online sales" now
>    leads with Google Shopping + E-commerce SEO whatever the business type says
>    — what the client asked for wins over the bucket they ticked.
> 2. **"Traffic but no sales" fixes conversions, never a rebuild.** Web Design
>    only appears for the explicit "website needs an upgrade" challenge.
> 3. **No auto add-ons.** Local SEO and Web Maintenance are no longer force-fed
>    onto every local / small business.
> 4. **Budget sets the *count*, the brief sets the *shape*.** A brief with one
>    genuine lead shows **1 main + more support** instead of a forced second
>    headline. The two-mains rule is now a *cap*, not a quota.
> 5. **A "get found by nearby customers" goal** so Local SEO leads only when the
>    client asks for it — general "Google visibility" stays national-style SEO.
>
> Plus: CRO leads **only** a conversions-goal plan (it supports a "no sales"
> plan, never heads it); and a light **business-type signature** fills a *spare*
> support slot (Local SEO for local, broad reach for national/enterprise,
> Technical SEO for enterprise) so the middle business types stop looking alike.
> 19 of the 20 personas are unchanged; persona 3 was re-signed.

> **Source of truth**
> `assets/js/data.js` — the 35 services, the two answer menus, the budget quota.
> `assets/js/planner.js` — the merge, the routing rules and how a plan is built.
> `tests/planner.test.js` — the 20 personas + guardrails, as pass/fail checks.

**Try it without reading any code:** open `index.html` and take the quiz, open
`dev-test.html` to try any combination against the live logic, or open
`tests/planner.html` to watch every check run.

---

## 1. The model

Four steps, in order. Each one has exactly one job.

| Step | Input | Decides |
| --- | --- | --- |
| **1. Merge** | Goal + Challenge, read together | Which *kinds* of service are needed, in order |
| **2. Routing** | Business type + persona | Which *actual service* answers each kind |
| **3. Quantity** | Budget | How many services show, and which are primary |
| **4. Guardrail** | Service role | Which services may never lead a plan |

**The merge (step 1).** The Goal contributes its lead need first (the
direction), then the Challenge contributes its fix, then the Goal's remaining
needs fill later slots. Technical SEO and UI/UX always sort to the back — they
only ever deepen a primary. A short fallback tail (paid, paid2, organic,
conversion) is appended last so a big budget can always be filled, but because
it is last it never changes the top of a plan. See `mergeNeeds` in planner.js
and the `OBJECTIVE_NEEDS` / `CHALLENGE_NEEDS` menus in data.js.

### Why it is built this way

v4 added up points and let the highest score win. That let **budget decide
identity**: the same business asking about a website upgrade was told *UI/UX*
on a small budget and *Web Design* on a large one. Measured across the answer
space, changing only the budget flipped the top recommendation in **32 of 100**
business contexts, and SEO led **63%** of all plans regardless of what was
asked.

v5 separates the two jobs completely.

> **RULE 2.1 — Budget never changes what is recommended.**
> Budget decides **how many** services appear and **which tier** within a
> family is right — Google Ads Campaigns or Google Shopping, Facebook Ads or
> CPAS. It never swaps one family for another.

This is enforced by test, not by convention: `budget changes how much is
recommended, never what kind` walks every business context across all four real
budgets and fails if the family of any primary changes.

---

## 2. The guardrail

> **RULE 3.1 — Support services can never be primary.**
> **UI/UX, Technical SEO, Content Marketing** and **Link Building** — along
> with the other services marked `role: "support"` — can only ever be
> supporting recommendations.
>
> **The one exception: CRO may lead a conversions-goal plan.** When the Goal is
> *"Improve website conversions"*, CRO can be primary. It leads nowhere else —
> the *"traffic but not enough sales"* Challenge adds CRO as **support**, not as
> a headline (v6.1 narrowed this from v6, where that challenge could also let
> CRO lead). Gated by `ctx.croCanLead` in planner.js and asserted by test across
> all 6,300 combinations — CRO never leads outside a conversions goal.

Checked *before* anything is ranked, so no other combination of answers can
promote a support service. Under v4, UI/UX led **88** combinations. Under v6
that is zero, permanently, and a test asserts it.

### The four roles

Every service in `CATALOGUE` carries one:

| Role | Count | Behaviour |
| --- | --- | --- |
| `lead` | 11 | May be primary or supporting |
| `support` | 17 | Supporting only |
| `platform` | 5 | Named inside the Social Media Campaigns card, never its own card |
| `overlay` | 2 | Changes *how* work is delivered; never a card |

**Can lead a plan:** AI SEO · SEO Campaigns · E-commerce SEO · Local SEO ·
Google Ads Campaigns · Google Shopping · Performance Max · Facebook Ads ·
CPAS Ads · Social Media Campaigns · Web Design

**Named inside the social card:** LinkedIn Ads · LINE Ads · TikTok Ads ·
Reddit Ads · X Ads

> **RULE 3.2 — Platform choice happens in person.**
> Four questions cannot honestly tell us whether a client belongs on LinkedIn
> or Reddit. Rather than guess, these are listed inside the Social Media
> Campaigns card and chosen in the consultation.

**Delivery overlays:** SEO Reseller (agency clients see "white-label
delivery") and Outcome Marketing (offered at 300K+ to Enterprise and In-House
clients, once tracking is in place).

---

## 3. The two menus

The Goal and the Challenge each point to a list of service *kinds* (needs).
They live in `data.js` as `OBJECTIVE_NEEDS` (9 goals — v6.1 added *"Get found by
nearby / local customers"*) and `CHALLENGE_NEEDS` (7 problems) — the code form
of the team-lead service menus.

> **RULE 4.1 — Goal sets direction, Challenge adds the fix.**
> The Goal's first need leads the plan; the Challenge's needs slot in behind
> it as the corrective/supporting work; the Goal's remaining needs fill later.
> Business type then picks the exact service (an online shop's `organic` is
> E-commerce SEO, a local business's is Local SEO) and budget decides how many
> show.

The two lists are merged, de-duplicated and ordered by `mergeNeeds` in
planner.js. Editing a menu changes only the answers that use it.

### The need vocabulary

| Need | Resolves to |
| --- | --- |
| `paid` / `paid2` | A paid channel — RULE 5.1 decides search or social |
| `organic` | SEO Campaigns, or E-commerce SEO for an online store |
| `ai` | AI SEO |
| `local` | Local SEO, then Google Business Profile |
| `website` | Web Design, then Web Maintenance |
| `uiux` | UI/UX |
| `conversion` | CRO (may lead a conversion plan), or Heat Maps below 100K |
| `content` | Content Marketing |
| `technical` | Technical SEO, Keyword Mapping, On-page SEO or SEO Audit |
| `authority` | Link Building |
| `reach` | Programmatic Ads, Google Display Ads or YouTube Ads |
| `retention` | Email Marketing *(no menu points here — see §6 held-back list)* |
| `creative` | Premium Creative |

> **RULE 4.2 — "Not sure" always plans.**
> Each answer has an *"I'm not sure"* option. Because the Goal and the
> Challenge are independent, one "not sure" still leaves a clear signal from
> the other. Only when **both** are "not sure" does the quiz fall back to a
> safe starter mix (`DEFAULT_NEEDS`) sized by business type and budget
> (decision 3). The old requirement to pair "not sure" with a second pick is
> gone — the two-question format removes the need for it.

---

## 4. Routing

### The paid channel

Read from the Goal and the Challenge together (`paidOrder` in planner.js).

> **RULE 5.1 — Who leads the paid slot.**
> **Facebook Ads (paid social) leads** when:
> - the **Goal** is *"Generate more leads"* and the client is a Small
>   Business / SME — **except** when the **Challenge** is *"doesn't rank on
>   Google"*, which proves people are already searching, so paid search leads;
> - the **Goal** is *"Get more website traffic"* or *"Build brand awareness"*,
>   whoever the client is — reaching people who are not searching yet; or
> - the **Challenge** is *"not enough people know my brand"*.
>
> **Paid search leads** in every other case.

A Thai local SME on a small budget gets cheaper geo-targeted reach on Facebook,
and enquiries arrive straight in Messenger or LINE. A national brand or
enterprise has the search volume and the tracking to make Google pay back.
Bigger clients capture demand; smaller ones create it.

### Product routing

| Kind | Condition | Service |
| --- | --- | --- |
| Paid search | Sells online (goal *Increase online sales*, or a non-SME store) | Google Shopping |
| Paid search | 300K+ and selling online, or national/enterprise/e-comm/mixed | *then* Performance Max |
| Paid search | Everyone else | Google Ads Campaigns |
| Paid social | Always | Facebook Ads |
| Paid social | Funded store, after Facebook | *then* CPAS Ads |
| Paid social | After the above | *then* Social Media Campaigns |
| Organic | Sells online (goal *Increase online sales*, or an e-commerce store) | E-commerce SEO |
| Organic | Everyone else | SEO Campaigns |
| Local | Local/mixed, or the *nearby customers* goal, not an agency | Local SEO, then Google Business Profile |
| Technical | Enterprise, national, or 100K+ | Technical SEO |
| Technical | In-House or Agency | Keyword Mapping |
| Technical | Under 50K or unsure | SEO Audit |
| Technical | Otherwise | On-page SEO |
| Conversion | 100K+ | CRO |
| Conversion | Below 100K | Heat Maps |
| Content | Always | Content Marketing |
| Reach | National or enterprise | Programmatic Ads |
| Reach | Everyone else | Google Display Ads |

Performance Max extends a working Search or Shopping account across Google's
other channels — it is the second Google Ads service a big spender adds, never
the first one we put them on. CPAS is collaborative advertising with
marketplace and brand partners, so it follows Facebook Ads for a funded store
rather than leading.

### Structural rules

> **RULE 5.2 — Two primaries must be genuinely different.**
> They may never come from the same family — no *Google Ads Campaigns +
> Performance Max*. Different families are fine, including two SEO services:
> *AI SEO + SEO Campaigns* is allowed because they solve different problems.
> Supporting services may deepen a primary — Technical SEO under SEO Campaigns
> is correct and expected.

> **RULE 5.4 — Agency clients.**
> An agency buys what it resells. AI visibility is the differentiator it wants
> alongside an SEO campaign, and Link Building is the fulfilment it cannot
> staff. Matches personas 14 and 15.

> **RULE 5.5 — Business-type signature (v6.1, replaces the old auto-Local-SEO
> rule).** The old rule force-added Local SEO to *every* local business. v6.1
> removes that. Instead each business type has one *signature* support service
> that fills a **spare** support slot only — never the headline, never in place
> of a service the brief asked for: **Local SEO** for a local/mixed business,
> **broad reach** (Programmatic / Display) for a national or enterprise brand,
> **Technical SEO** for an enterprise. E-commerce already stands out through
> Shopping / E-commerce SEO, so it needs no signature. Because it fills spare
> slots only, a *full* small-budget plan (e.g. an *online sales* brief) can stay
> the same across types. See `TYPE_SUPPORT` in planner.js.

> **RULE 5.7 — An online store's traffic is bought as well as earned.**
> Logic Rule 5 says e-commerce needs its own logic and that we should stop
> answering every e-commerce brief with generic SEO. It was originally applied
> only to lead briefs, where a paid channel is already in the row — so a store
> whose main problem was *traffic* was being told to do SEO and nothing else.
> Paid media now takes the slot organic would have had, and SEO drops to the
> first supporting place.

> **RULE 5.6 — removed in v6.1.** The old rule force-added Web Maintenance to
> every SME whose plan included a website. v6.1 drops all auto add-ons — it is
> raised in the consultation instead. (Web Maintenance can still follow Web
> Design through the normal deepening pass when there is a spare slot.)

### Services we knowingly hold back

**Video SEO and Email Marketing are never recommended.** Nothing in the answers
can tell us a client has video, and no menu points to email (retention), so
offering either would be a guess dressed up as advice. Both stay in the
catalogue with full copy and a link, and can be raised in the consultation —
the quiz simply never claims them.

This is deliberate, and `NEVER_RECOMMENDED` in `tests/planner.test.js` holds
the list. It replaced a test that demanded *every* service be recommendable.
That test was the reason the quiz once offered Video SEO to a client who never
mentioned video and an SEO Audit to a client spending 300K a month: it forced
weak services into real plans to satisfy a target.

**Adding to that list is fine. Bending the routing to empty it is not.**
A service appears because the client's answers point to it, never because we
wanted it to be reachable.

Nine other services never win a card but are named in the *"also often
relevant"* line instead: SEO Audit, YouTube Ads, Premium Creative, and the
five social platforms (LinkedIn, LINE, TikTok, Reddit, X).

### The deepening pass

If the brief runs out before the budget does, the planner goes one level deeper
into the areas already recommended rather than reaching for something
unrelated — Google Business Profile under Local SEO, Heat Maps under CRO. This
fires in about **12%** of combinations.

---

## 5. Budget and quantity

Budget sets **how many cards** a plan shows, and the **cap** on how many of them
are mains. It never changes *which* services are right. From v6.1 the main /
support split **flexes**: a brief with a single genuine lead shows one main and
spends the rest on support, rather than inventing a second headline. "Two mains"
is a ceiling, not a quota.

| Budget | Max mains | Total cards | Framing |
| --- | --- | --- | --- |
| Below THB 50K | 1 | 2 | Start here · Next phase |
| THB 50K – 100K | 2 | 3 | Start with (both) · Add next |
| THB 100K – 300K | 2 | 4 | Start with (both) · Add next |
| THB 300K+ | 2 | 4 | Integrated programme |
| Not sure yet | 1 | 2 | Size the budget first · Then add |

Every plan fills its **total** exactly, has at least one main, and never exceeds
the main cap — asserted across all 6,300 combinations. When only one main lands,
the heading reads "Start here" rather than "Start with both".

---

## 6. The 20 personas

These are the v6 **acceptance oracle**, re-written as Goal + Challenge. If a
future change breaks one, it has changed an agreed decision and the test suite
fails. The 20 come from the v5 signed sheet: **9 reproduce that plan unchanged**
and **11 were re-approved** with a new plan when the two-question model gave a
different (sensible) answer — marked **±**. The two primaries are compared as a
set, since they carry equal weight.

In **v6.1**, 19 of the 20 reproduce their v6 plan unchanged; only **persona 3**
was re-signed — the auto-added Local SEO became the *ranking fix* (SEO Audit)
the client actually asked for, once the auto-Local-SEO rule was removed.

| # | Client | Budget | Goal | Challenge | Primary | Supporting | |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SME · Local | <50K | leads | AI | Facebook Ads | AI SEO | |
| 2 | SME · Local | <50K | leads | ranking | Google Ads Campaigns | SEO Campaigns | |
| 3 | SME · Local | <50K | Google vis. | ranking | SEO Campaigns | SEO Audit | ± |
| 4 | SME · E-comm | <50K | leads | ranking | Google Ads Campaigns | E-commerce SEO | ± |
| 5 | SME · E-comm | 50–100K | leads | website | Facebook Ads + Web Design | CRO | ± |
| 6 | In-House · E-comm | 50–100K | sales | ranking | Google Shopping + E-commerce SEO | Facebook Ads | ± |
| 7 | In-House · National | 50–100K | AI vis. | ranking | AI SEO + SEO Campaigns | Content Marketing | |
| 8 | In-House · National | 100–300K | leads | AI | Google Ads + AI SEO | Content Marketing + SEO Campaigns | |
| 9 | In-House · E-comm | 100–300K | leads | website | Google Shopping + Web Design | CRO + Facebook Ads | ± |
| 10 | Enterprise | 100–300K | AI vis. | ranking | AI SEO + SEO Campaigns | Content Marketing + Technical SEO | |
| 11 | Enterprise | 300K+ | leads | brand | Google Ads + Facebook Ads | Programmatic Ads + CRO | ± |
| 12 | Enterprise · National | 300K+ | Google vis. | AI | SEO Campaigns + AI SEO | Content Marketing + Technical SEO | ± |
| 13 | Enterprise · E-comm | 300K+ | leads | website | Google Shopping + Web Design | CRO + Facebook Ads | ± |
| 14 | Agency · Mixed | 50–100K | Google vis. | ranking | SEO Campaigns + AI SEO | Link Building | |
| 15 | Agency · Enterprise | 100–300K | Google vis. | AI | SEO Campaigns + AI SEO | Link Building + Content Marketing | |
| 16 | SME · Mixed | <50K | leads | website | Facebook Ads | Web Design | ± |
| 17 | In-House · Mixed | 50–100K | Google vis. | website | Web Design + SEO Campaigns | CRO | |
| 18 | Enterprise | 300K+ | leads | website | Google Ads + Web Design | CRO + Facebook Ads | ± |
| 19 | SME · Local | <50K | leads | not sure | Facebook Ads | Heat Maps | ± |
| 20 | Enterprise · Mixed | 300K+ | leads | not sure | Google Ads + Facebook Ads | CRO + Technical SEO | ± |

**Why the 11 changed.** The old quiz's answer depended on which of two picks
was named *first*; v6 fixes Goal-then-Challenge, so a few cases the old logic
told apart now share one input, and the clean menu-merge lands elsewhere. Most
changes are the same channels re-ordered, or the plan now leading with the
exact thing the customer flagged (e.g. #5 and #16 lead with the website fix).
All 11 were reviewed as sensible before being locked into the test suite.

**Carried over from v5:** E-commerce SEO only ever appears for online stores;
AI SEO's deliverables stay purely AI-specific (entity optimisation, AI citation
tracking, answer-format content, schema); AI SEO appears only when the client
mentions AI, except for agency clients (RULE 5.4).

---

## 7. Editing this

### Service links

All 35 URLs sit in `SERVICE_URLS` at the top of `assets/js/data.js`. Paste each
one between the quotes. A service left as `""` renders without a "Learn more"
link — nothing looks broken while links are outstanding.

**Do not use `#`.** Cards open links in a new tab, so `#` would open an empty
tab that goes nowhere.

### Icons

`ICONS` in the same file, as raw SVG path data only — no `<svg>` wrapper, drawn
on a 24×24 grid. Add a line, then point a service at it with
`icon: ICONS.yourIcon`.

### Changing a recommendation

Find the Goal in `OBJECTIVE_NEEDS` or the Challenge in `CHALLENGE_NEEDS` and
reorder its needs. That changes **only** answers that use that menu — there are
no weights to ripple. Then run the tests: if a persona breaks, you have changed
a signed-off decision, which may be exactly what you intended.

### Running the tests

Open `tests/planner.html` in a browser — everything runs on load. Or from the
command line with macOS JavaScriptCore:

```
jsc assets/js/data.js assets/js/planner.js tests/planner.test.js
```

---

## 8. What n8n receives

The existing workflow needs **no changes**. It reads five fields, and all five
keep their shape:

| n8n reads | Receives |
| --- | --- |
| `recommendation.primary.name` | Both primaries joined — `"Google Shopping + Facebook Ads"` |
| `recommendation.primary.url` | The first primary's link |
| `recommendation.supporting` | The supporting services only |
| `recommendation.all_ranked` | Everything on the plan, in order |
| `recommendation.budget_tier` | Unchanged |

Both primaries are joined the way the sheet writes them, so a CRM row reads
like the planning sheet. Added alongside, and ignored by the current workflow
until someone maps them: `primaries[]`, `also_relevant`, `overlays`,
`situation` and `plan_shape`. The payload `version` is now **4** and
`recommendation.logic_version` is **6**.

**Worth mapping when there's time:** v6 sends both answers cleanly —
`answers.objective` (the Goal) and `answers.challenge` (the single Problem),
plus `recommendation.objective` / `recommendation.challenge`. The old
`answers.challenge_2` field is gone (the challenge is single-select now).
Adding an `objective` column to the *MAM Quiz Leads* table and one line in
"Build lead row" captures the Goal — the most useful new signal in the quiz.
