# Service Recommendation Quiz — Logic v7

This is the plain-English specification for every recommendation the quiz can
make: **5,600 combinations** of 4 personas × 5 business types × 5 budgets ×
8 goals × 7 problems.

> **What changed in v7.** The reviewer's Goal + Challenge tables, applied
> decision by decision:
>
> 1. **CRO before Heat Maps, at every budget.** Heat Maps is no longer the
>    cheap stand-in below 100K — CRO's card already covers heat-map insights.
>    Heat Maps follows CRO, or is named under "Also often relevant".
> 2. **"My ads aren't generating enough results" reads as a fix.** The first
>    paid card says *"your current campaigns need fixing before they need more
>    budget"*, then CRO supports it.
> 3. **Online sales:** Google Shopping → CPAS Ads → Performance Max →
>    E-commerce SEO. CPAS replaces Facebook Ads at every budget.
> 4. **One goal for Google + AI Search** ("Improve Google visibility + AI
>    Search"), so the quiz has **8 goals**. AI SEO leads, SEO Campaigns is the
>    second main (for online stores too), then Local SEO for a local or mixed
>    business, then the new **SEO & AI Visibility Audit** and Content.
> 5. **Nearby / local customers:** Google Business Profile → Local SEO →
>    Google Ads Campaigns. Google Business Profile may lead this goal, and it
>    may pair with Local SEO as two mains.
> 6. **Both answers "not sure"** → a **Free Strategy Consultation** (main) +
>    the SEO & AI Visibility Audit, at every budget.
> 7. **Challenges:** Keyword Mapping is no longer a ranking fix; *"the goal
>    decides which SEO"* (E-commerce SEO only for the sales goal); "traffic but
>    no sales" = CRO → Heat Maps → UI/UX; "website upgrade" = Web Design →
>    UI/UX → CRO; "brand" = Facebook Ads + one reach card (TikTok → YouTube →
>    Programmatic); "not sure what's wrong" = the Audit, and the consultation
>    box speaks to it directly.
> 8. **"Also often relevant" leads with the challenge's own list** — whatever
>    the reviewer's table names that did not fit as a card — so the full list
>    is always on the page.
> 9. **A chat button** in the consultation box: LINE for the TH market,
>    WhatsApp for AU (switched on once a number is set).
>
> 14 of the 20 personas were re-signed (see §6). Open questions for the
> reviewer are listed at the end of this file.

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
> `assets/js/data.js` — the 35 services + 2 quiz cards, the two answer menus,
> the budget quota.
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
> **Two scoped exceptions** (`LEAD_EXCEPTIONS` in planner.js):
> - **CRO may lead a conversions-goal plan.** When the Goal is *"Improve
>   website conversions"*, CRO can be primary. It leads nowhere else — the
>   *"traffic but not enough sales"* Challenge adds CRO as **support**.
> - **Google Business Profile may lead the local goal** (v7). When the Goal is
>   *"Get found by nearby / local customers"* it heads the plan; it leads
>   nowhere else.
>
> Both are asserted by test across all 5,600 combinations.

Checked *before* anything is ranked, so no other combination of answers can
promote a support service. Under v4, UI/UX led **88** combinations. Under v6
that is zero, permanently, and a test asserts it.

### The four roles

Every service in `CATALOGUE` carries one:

| Role | Count | Behaviour |
| --- | --- | --- |
| `lead` | 12 | May be primary or supporting |
| `support` | 19 | Supporting only |
| `platform` | 4 | Named inside the Social Media Campaigns card, never its own card |
| `overlay` | 2 | Changes *how* work is delivered; never a card |

**Can lead a plan:** AI SEO · SEO Campaigns · E-commerce SEO · Local SEO ·
Google Ads Campaigns · Google Shopping · Performance Max · Facebook Ads ·
CPAS Ads · Social Media Campaigns · Web Design · Free Strategy Consultation
(v7 — only when both answers are "not sure")

**Named inside the social card:** LinkedIn Ads · LINE Ads · Reddit Ads · X Ads.
TikTok Ads is named there too, and from v7 is also a supporting card of its
own for the brand challenge.

**The two v7 quiz cards** are not website services: the **SEO & AI Visibility
Audit** (support; links to the free AI SEO audit on LINE) and the **Free
Strategy Consultation** (links to the contact page).

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
They live in `data.js` as `OBJECTIVE_NEEDS` (8 goals — v7 merged *"Improve
Google visibility"* and *"Improve visibility in AI Search"* into *"Improve
Google visibility + AI Search"*) and `CHALLENGE_NEEDS` (7 problems) — the code
form of the reviewer's service tables. `OBJECTIVE_MAINS` lists each goal's
**"Prioritise"** needs — the ones allowed to take a main card (a goal not listed
there leads with its first need only). `OBJECTIVE_ALIASES` maps the two old goal
ids onto the merged one, so a saved answer still plans.

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
| `organic` | **The goal decides (v7):** E-commerce SEO when the goal is *"Increase online sales"*, SEO Campaigns for every other goal — online stores included |
| `ai` | AI SEO |
| `local` | Local SEO, then Google Business Profile |
| `gbp` | Google Business Profile (v7; never for an agency) |
| `website` | Web Design, then Web Maintenance |
| `uiux` | UI/UX |
| `conversion` | **CRO first at every budget (v7)**, then Heat Maps |
| `content` | Content Marketing |
| `technical` | Technical SEO, On-page SEO or SEO Audit (Keyword Mapping removed in v7) |
| `authority` | Link Building |
| `reach` | Programmatic Ads, Google Display Ads or YouTube Ads |
| `brandreach` | **One** reach card for the brand challenge (v7): TikTok Ads, then YouTube Ads, then Programmatic Ads — any business type, any budget |
| `retention` | Email Marketing *(no menu points here — see §6 held-back list)* |
| `creative` | Premium Creative |
| *a service id* | From v7 a menu may name an exact service (e.g. `google-shopping`) where the reviewer's table names one. It resolves to itself. |

### The menus, as the reviewer wrote them

| Goal | Order (**bold** = may take a main card) |
| --- | --- |
| Generate more leads / enquiries | **A paid channel** › **a second paid channel** › Conversion |
| Increase online sales | **Google Shopping** › **CPAS Ads** › Performance Max › E-commerce SEO |
| Get more website traffic | **A paid channel** › **a second paid channel** › Paid reach |
| Improve Google visibility + AI Search | **AI SEO** › **SEO Campaigns** › Local SEO *(local / mixed only)* › SEO & AI Visibility Audit › Content |
| Get found by nearby / local customers | **Google Business Profile** › **Local SEO** › Google Ads Campaigns |
| Build brand awareness | **A paid channel** › Paid reach |
| Improve website conversions | **Conversion (CRO)** › Website › UI/UX |
| I'm not sure yet | The Challenge leads. If it is also "not sure" → Free Strategy Consultation |

| Challenge | Order |
| --- | --- |
| My website doesn't rank well on Google | SEO › one ranking fix (SEO Audit / On-page SEO / Technical SEO) |
| My business isn't visible in AI Search | AI SEO › SEO › Content › Technical SEO |
| My ads aren't generating enough results | The paid channel (framed as a fix) › CRO |
| Traffic but not enough enquiries/sales | CRO › Heat Maps › UI/UX |
| My website needs an upgrade | Web Design › UI/UX › CRO |
| Not enough people know my brand | Facebook Ads › one reach card (TikTok / YouTube / Programmatic) |
| I'm not sure what's wrong | SEO & AI Visibility Audit (+ the consultation box speaks to it) |

> **RULE 4.2 — "Not sure" always plans (v7).**
> Each answer has an *"I'm not sure"* option. Because the Goal and the
> Challenge are independent, one "not sure" still leaves a clear signal from
> the other. When **both** are "not sure" there is no clear match, so the
> plan is a **Free Strategy Consultation** (main) + the **SEO & AI Visibility
> Audit** (support) — two cards at every budget. The type + budget starter
> mix (`DEFAULT_NEEDS`) is still worked out and named under "Also often
> relevant" as ideas for the conversation. The results page skips the budget
> note for this plan, since sizing the budget is part of the conversation.
>
> When only the **Challenge** is *"I'm not sure what's wrong"*, the Goal still
> leads, the Audit supports it, and the consultation box at the bottom of the
> page changes its message to *"Not sure what's holding you back? Let's find
> out together."*

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
| Sales goal | Always (v7, named in the menu) | Google Shopping, CPAS Ads, Performance Max |
| Organic | Goal *Increase online sales* | E-commerce SEO |
| Organic | Every other goal (online stores too) | SEO Campaigns |
| Local | Local/mixed, or the *nearby customers* goal, not an agency | Local SEO, then Google Business Profile |
| GBP | The *nearby customers* goal, not an agency | Google Business Profile |
| Technical | Enterprise, national, or 100K+ | Technical SEO |
| Technical | Under 50K or unsure | SEO Audit |
| Technical | Otherwise | On-page SEO |
| Conversion | Every budget (v7) | CRO, then Heat Maps |
| Content | Always | Content Marketing |
| Reach | National or enterprise | Programmatic Ads |
| Reach | Everyone else | Google Display Ads |
| Brand reach | The brand challenge, any type or budget (v7) | TikTok Ads, then YouTube Ads, then Programmatic Ads |

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
>
> **The one v7 exception:** *Google Business Profile + Local SEO* on the
> *"Get found by nearby / local customers"* goal. Both are local SEO, but they
> are different jobs — the Google Maps listing, and the website ranking
> locally — and they are the reviewer's first two priorities there
> (`familyTaken` in planner.js).

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

**Video SEO, Email Marketing and Keyword Mapping are never recommended.**
Nothing in the answers can tell us a client has video, and no menu points to
email (retention), so offering either would be a guess dressed up as advice.
Keyword Mapping joined them in v7: the reviewer's ranking fixes are SEO Audit,
On-page SEO and Technical SEO. All three stay in the catalogue with full copy
and a link, and can be raised in the consultation — the quiz simply never
claims them.

This is deliberate, and `NEVER_RECOMMENDED` in `tests/planner.test.js` holds
the list. It replaced a test that demanded *every* service be recommendable.
That test was the reason the quiz once offered Video SEO to a client who never
mentioned video and an SEO Audit to a client spending 300K a month: it forced
weak services into real plans to satisfy a target.

**Adding to that list is fine. Bending the routing to empty it is not.**
A service appears because the client's answers point to it, never because we
wanted it to be reachable.

Five other services never win a card but are named in the *"also often
relevant"* line instead: Premium Creative, and the four social platforms
(LinkedIn, LINE, Reddit, X).

### "Also often relevant" (v7)

The line under the plan names services a strategist would raise in the
meeting. From v7 it starts with **the challenge's own list** — everything the
reviewer's Step 5 table names for that challenge that did not fit as a card
(Heat Maps behind CRO, YouTube and Programmatic behind the brand card, the
other ranking fixes…). That part is never cut, so the reviewer's full list is
always on the page. Up to three related services follow, then the social
platforms whenever paid social is on the plan.

### The deepening pass

If the brief runs out before the budget does, the planner goes one level deeper
into the areas already recommended rather than reaching for something
unrelated — Google Business Profile under Local SEO, Heat Maps under CRO. This
fires in about **3%** of combinations (v7 menus are fuller, so it is needed
less often).

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
the main cap — asserted across all 5,600 combinations. When only one main lands,
the heading reads "Start here" rather than "Start with both". The one v7
exception is the consultation plan (both answers "not sure"): two cards at
every budget, because we do not yet know what a bigger budget should buy.

---

## 6. The 20 personas

These are the **acceptance oracle**, written as Goal + Challenge. If a future
change breaks one, it has changed an agreed decision and the test suite fails.
The two primaries are compared as a set, since they carry equal weight.

In **v7**, 6 reproduce their v6.1 plan unchanged (#14 and #15 keep the same two
mains; only the goal id moved to the merged goal) and **14 were re-signed** by
the reviewer's tables — marked **v7**. They are waiting for the reviewer's
sign-off.

| # | Client | Budget | Goal | Challenge | Primary | Supporting | |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SME · Local | <50K | leads | AI | Facebook Ads | AI SEO | |
| 2 | SME · Local | <50K | leads | ranking | Google Ads Campaigns | SEO Campaigns | |
| 3 | SME · Local | <50K | Google + AI | ranking | AI SEO | SEO Campaigns | v7 |
| 4 | SME · E-comm | <50K | leads | ranking | Google Ads Campaigns | SEO Campaigns | v7 |
| 5 | SME · E-comm | 50–100K | leads | website | Facebook Ads + Web Design | UI/UX | v7 |
| 6 | In-House · E-comm | 50–100K | sales | ranking | Google Shopping + E-commerce SEO | CPAS Ads | v7 |
| 7 | In-House · National | 50–100K | Google + AI | ranking | AI SEO + SEO Campaigns | SEO & AI Visibility Audit | v7 |
| 8 | In-House · National | 100–300K | leads | AI | Google Ads + AI SEO | Content Marketing + SEO Campaigns | |
| 9 | In-House · E-comm | 100–300K | leads | website | Google Shopping + Web Design | UI/UX + CRO | v7 |
| 10 | Enterprise | 100–300K | Google + AI | ranking | AI SEO + SEO Campaigns | SEO & AI Visibility Audit + Content Marketing | v7 |
| 11 | Enterprise | 300K+ | leads | brand | Google Ads + Facebook Ads | TikTok Ads + CRO | v7 |
| 12 | Enterprise · National | 300K+ | Google + AI | AI | AI SEO + SEO Campaigns | Content Marketing + SEO & AI Visibility Audit | v7 |
| 13 | Enterprise · E-comm | 300K+ | leads | website | Google Shopping + Web Design | UI/UX + CRO | v7 |
| 14 | Agency · Mixed | 50–100K | Google + AI | ranking | AI SEO + SEO Campaigns | Link Building | |
| 15 | Agency · Enterprise | 100–300K | Google + AI | AI | AI SEO + SEO Campaigns | Link Building + Content Marketing | |
| 16 | SME · Mixed | <50K | leads | website | Facebook Ads | Web Design | |
| 17 | In-House · Mixed | 50–100K | Google + AI | website | AI SEO + Web Design | UI/UX | v7 |
| 18 | Enterprise | 300K+ | leads | website | Google Ads + Web Design | UI/UX + CRO | v7 |
| 19 | SME · Local | <50K | leads | not sure | Facebook Ads | SEO & AI Visibility Audit | v7 |
| 20 | Enterprise · Mixed | 300K+ | leads | not sure | Google Ads + Facebook Ads | SEO & AI Visibility Audit + CRO | v7 |

**Why the 14 changed**, rule by rule:

- **Google + AI goal** (#3, #7, #10, #12, #17) — AI SEO leads; the audit and
  content support it. #17 keeps its website fix (Web Design) as the second main.
- **The goal decides which SEO** (#4) — SEO Campaigns, since the goal is leads.
- **Sales goal** (#6) — CPAS replaces Facebook Ads.
- **Website challenge** (#5, #9, #13, #18) — UI/UX comes before CRO.
- **Brand challenge** (#11) — TikTok is the reach card; YouTube and
  Programmatic are named first under "Also often relevant".
- **Not sure what's wrong** (#19, #20) — the SEO & AI Visibility Audit replaces
  the old guess (Heat Maps / Technical SEO).

**Carried over:** AI SEO's deliverables stay purely AI-specific (entity
optimisation, AI citation tracking, answer-format content, schema). From v7,
E-commerce SEO appears only on the *"Increase online sales"* goal, and AI SEO
appears whenever the goal or challenge mentions AI search (the merged goal
names it) or the client is an agency (RULE 5.4).

---

## 7. Editing this

### Service links

All 37 URLs (35 services + the 2 v7 quiz cards) sit in `SERVICE_URLS` at the
top of `assets/js/data.js`. Paste each one between the quotes. A service left
as `""` renders without a "Learn more" link — nothing looks broken while links
are outstanding. A card may set `linkText` to replace its default "Explore
…" link (the audit says *"Get your free audit on LINE"*, the consultation
*"Book your free consultation"*).

**Do not use `#`.** Cards open links in a new tab, so `#` would open an empty
tab that goes nowhere.

### Icons

`ICONS` in the same file, as raw SVG path data only — no `<svg>` wrapper, drawn
on a 24×24 grid. Add a line, then point a service at it with
`icon: ICONS.yourIcon`.

### Changing a recommendation

Find the Goal in `OBJECTIVE_NEEDS` or the Challenge in `CHALLENGE_NEEDS` and
reorder its needs. That changes **only** answers that use that menu — there are
no weights to ripple. To let a Goal's need take a main card, add it to that
Goal's line in `OBJECTIVE_MAINS`. Then run the tests: if a persona breaks, you
have changed a signed-off decision, which may be exactly what you intended.

### The chat button (v7)

`market` and `chat` in `assets/js/config.js`. `market: 'TH'` shows **Chat on
LINE** (the account linked from moveaheadmedia.co.th). On a **computer** it
opens the account page, `https://page.line.me/pmi1665e`; on a **phone** it
opens the LINE app chat with the visitor's plan already typed (LINE's
pre-typed-message link only works inside the app — on a computer it falls back
to LINE's homepage). `market: 'AU'` shows **Chat on WhatsApp** once
`chat.AU.number` is set (digits only, with country code). A pre-typed message
holds service names only — never the visitor's name, email or phone. A market with no
account set shows no chat button.

### Running the tests

Open `tests/planner.html` in a browser — everything runs on load. Or from the
command line with macOS JavaScriptCore or Node:

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
`situation` and `plan_shape`. The payload `version` is **4** and
`recommendation.logic_version` is **7**.

**v7 notes for n8n.** Nothing breaks. Two things a CRM row may now show: the
merged goal arrives as `answers.objective.id = "search-visibility"` (older rows
say `google-visibility` / `ai-visibility`), and a lead who answered "not sure"
twice arrives with `recommendation.primary.name = "Free Strategy
Consultation"` — a lead that needs a conversation first.

**Worth mapping when there's time:** v6 sends both answers cleanly —
`answers.objective` (the Goal) and `answers.challenge` (the single Problem),
plus `recommendation.objective` / `recommendation.challenge`. The old
`answers.challenge_2` field is gone (the challenge is single-select now).
Adding an `objective` column to the *MAM Quiz Leads* table and one line in
"Build lead row" captures the Goal — the most useful new signal in the quiz.

---

## 9. Open questions for the reviewer (v7)

Each has a safe default already built in; answering one is a small change.

1. Goal list #1 and #3 both read "Get more website traffic" — is #1 meant to
   be *"Generate more leads / enquiries"*? *(Built as: leads ✅, unchanged.)*
2. Should **CPAS** also show **below 50K**? It needs a marketplace/retail
   partner (Shopee, Lazada…). *(Built as: every budget.)*
3. Should a **Mixed** business get Local SEO on the Google + AI goal, like a
   Local one? *(Built as: yes.)*
4. For a **Local** business on the Google + AI goal, should Local SEO come
   **first** instead of third? *(Built as: third, the written order.)*
5. Is the **SEO & AI Visibility Audit** the free AI SEO audit from the website
   popup (delivered on LINE)? *(Built as: yes — the card links to LINE.)*
6. For **brand awareness**, which reach channel should come first — TikTok,
   YouTube or Programmatic — and does it depend on business size? *(Built as:
   TikTok first for everyone.)*
7. *(For the team)* Is an **AU** version planned, and what is the WhatsApp
   number? *(Built as: the WhatsApp button is ready but hidden until a number
   is set.)*
