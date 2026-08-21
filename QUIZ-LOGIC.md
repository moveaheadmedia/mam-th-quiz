# Service Recommendation Quiz — Logic v5

This is the plain-English specification for every recommendation the quiz can
make: **3,000 combinations** of 4 personas × 5 business types × 5 budgets ×
30 challenge briefs.

> **Source of truth**
> `assets/js/data.js` — the 35 services, the 30 situations, the budget quota.
> `assets/js/planner.js` — the routing rules and how a plan is assembled.
> `tests/planner.test.js` — the 20 signed-off personas, as pass/fail checks.

**Try it without reading any code:** open `dev-test.html` in a browser. Pick
any four answers and the plan appears instantly, with the reasoning behind it.

---

## 1. The model

Four steps, in order. Each one has exactly one job.

| Step | Input | Decides |
| --- | --- | --- |
| **1. Situation** | Both challenges, read together as one brief | Which *kinds* of service are needed, in order |
| **2. Routing** | Business type + persona | Which *actual service* answers each kind |
| **3. Quantity** | Budget | How many services show, and which are primary |
| **4. Guardrail** | Service role | Which services may never lead a plan |

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
> **CRO, UI/UX, Technical SEO, Content Marketing** and **Link Building** —
> along with the other services marked `role: "support"` — can only ever be
> supporting recommendations.

Checked *before* anything is ranked, so no combination of answers can promote
them. Under v4, UI/UX led **88** combinations and CRO led 2. Under v5 that is
zero, permanently, and a test asserts it across all 3,000.

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

## 3. The 30 situations

The two challenges are one brief, not a main answer plus a footnote.

> **RULE 4.1 — The pair is the brief.**
> "Leads + not visible in AI" is a different situation from "leads + doesn't
> rank", with a different answer. Order matters: naming the website as the
> *main* problem leads to a different plan than mentioning it second.

There are exactly 30: five challenges alone, twenty ordered pairs, and five
"not sure" pairs. They live in `SITUATIONS` in `data.js`, and each row lists
the *kinds* of service the brief calls for, in order.

### The need vocabulary

| Need | Resolves to |
| --- | --- |
| `paid` / `paid2` | A paid channel — RULE 5.1 decides search or social |
| `organic` | SEO Campaigns, or E-commerce SEO for an online store |
| `ai` | AI SEO |
| `local` | Local SEO, then Google Business Profile |
| `website` | Web Design, then Web Maintenance |
| `uiux` | UI/UX |
| `conversion` | CRO, or Heat Maps below 100K |
| `content` | Content Marketing, or Video SEO for a 300K+ store |
| `technical` | Technical SEO, Keyword Mapping, On-page SEO or SEO Audit |
| `authority` | Link Building |
| `reach` | Programmatic Ads, Google Display Ads or YouTube Ads |
| `retention` | Email Marketing |
| `creative` | Premium Creative |

A need written with a trailing `!` is **primary-only**: if the budget has
already filled its primary slots, it is dropped rather than demoted. A second
ad platform is worth funding as a core channel or not at all — it is never a
phase-two extra.

> **RULE 4.2 — "Not sure" must be paired.**
> Choosing *"I'm not sure where to start"* requires a second answer. The UI
> hides Continue until one is given, and the planner refuses to produce a plan
> without it. The old **Free Strategy Consultation** card is gone; the booking
> button remains. Answering "I don't know where to start" with real services is
> stronger than answering it with "book a call".

---

## 4. Routing

### The paid channel

Reverse-engineered from the persona sheet — it explains **all 13** personas
involving a paid channel, with no exceptions.

> **RULE 5.1 — Who leads the paid slot.**
> **Facebook Ads leads** when "I need more leads" is the *main* challenge and
> the client is a Small Business / SME.
> **Except** when the brief also contains "doesn't rank on Google" — that
> proves people are already searching, so paid search leads.
> **Paid search leads** for In-House, Enterprise and Agency clients, and
> whenever "leads" is only the *second* challenge.

A Thai local SME on a small budget gets cheaper geo-targeted reach on Facebook,
and enquiries arrive straight in Messenger or LINE. A national brand or
enterprise has the search volume and the tracking to make Google pay back.
Bigger clients capture demand; smaller ones create it.

### Product routing

| Kind | Condition | Service |
| --- | --- | --- |
| Paid search | E-commerce, not an SME | Google Shopping |
| Paid search | 300K+, national/enterprise/e-comm/mixed | *then* Performance Max |
| Paid search | Everyone else | Google Ads Campaigns |
| Paid social | Funded store, traffic in the brief | CPAS Ads |
| Paid social | Brief mentions leads | Facebook Ads |
| Paid social | Awareness or traffic only | Social Media Campaigns |
| Organic | E-commerce | E-commerce SEO |
| Organic | Everyone else | SEO Campaigns |
| Local | Local or mixed, not an agency | Local SEO, then Google Business Profile |
| Technical | Enterprise, national, or 100K+ | Technical SEO |
| Technical | In-House or Agency | Keyword Mapping |
| Technical | Under 50K or unsure | SEO Audit |
| Technical | Otherwise | On-page SEO |
| Conversion | 100K+ | CRO |
| Conversion | Below 100K | Heat Maps |
| Reach | National or enterprise | Programmatic Ads |
| Reach | Mixed at 300K+ | YouTube Ads |
| Reach | Mixed below 300K | Google Display Ads |

Performance Max extends a working Search or Shopping account across Google's
other channels — it is the second Google Ads service a big spender adds, never
the first one we put them on. CPAS is collaborative advertising with
marketplace and brand partners, so it leads only for a funded store whose brief
is about traffic and sales.

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

> **RULE 5.5 — Local businesses.**
> A business with a real catchment area needs its map presence looked after
> alongside whatever else is recommended, so the local need is offered again in
> the first supporting slot.

> **RULE 5.6 — Small businesses and their websites.**
> An SME has no in-house developer. A new site they cannot keep updated goes
> stale within a year, so Web Maintenance follows Web Design in the supporting
> section.

### The deepening pass

If the brief runs out before the budget does, the planner goes one level deeper
into the areas already recommended rather than reaching for something
unrelated — Google Business Profile under Local SEO, Heat Maps under CRO. This
fires in about **12%** of combinations.

---

## 5. Budget and quantity

Budget's only job. **The two primaries are equal to each other** — a client who
can fund both runs both from the start.

| Budget | Primary | Supporting | Total | Framing |
| --- | --- | --- | --- | --- |
| Below THB 50K | 1 | 1 | 2 | Start here · Next phase |
| THB 50K – 100K | 2 | 1 | 3 | Start with both · Add next |
| THB 100K – 300K | 2 | 2 | 4 | Start with both · Add next |
| THB 300K+ | 2 | 2 | 4 | Integrated programme |
| Not sure yet | 1 | 1 | 2 | Size the budget first · Then add |

Every plan fills its quota exactly — asserted across all 3,000 combinations.

---

## 6. The 20 personas

These come from the signed-off persona sheet and are the **acceptance oracle**.
All 20 reproduce exactly. If a future change breaks one, it has changed a
decision the business already made, and the test suite fails.

| # | Client | Budget | Brief | Primary | Supporting |
| --- | --- | --- | --- | --- | --- |
| 1 | SME · Local | <50K | leads + AI | Facebook Ads | AI SEO |
| 2 | SME · Local | <50K | leads + ranking | Google Ads Campaigns | SEO Campaigns |
| 3 | SME · Local | <50K | ranking + traffic | SEO Campaigns | Local SEO |
| 4 | SME · E-comm | <50K | leads + traffic | Facebook Ads | E-commerce SEO |
| 5 | SME · E-comm | 50–100K | leads + website | Facebook Ads + Google Ads | Web Design |
| 6 | In-House · E-comm | 50–100K | leads + traffic | Google Shopping + Facebook Ads | E-commerce SEO |
| 7 | In-House · National | 50–100K | AI + ranking | AI SEO + SEO Campaigns | Content Marketing |
| 8 | In-House · National | 100–300K | leads + AI | Google Ads + AI SEO | Content Marketing + SEO Campaigns |
| 9 | In-House · E-comm | 100–300K | leads + website | Google Shopping + Facebook Ads | Web Design + CRO |
| 10 | Enterprise | 100–300K | AI + ranking | AI SEO + SEO Campaigns | Content Marketing + Technical SEO |
| 11 | Enterprise | 300K+ | leads + traffic | Google Ads + Facebook Ads | SEO Campaigns + Programmatic Ads |
| 12 | Enterprise · National | 300K+ | traffic + AI | SEO Campaigns + AI SEO | Content Marketing + Programmatic Ads |
| 13 | Enterprise · E-comm | 300K+ | leads + website | Google Shopping + Facebook Ads | Web Design + CRO |
| 14 | Agency · Mixed | 50–100K | ranking + traffic | SEO Campaigns + AI SEO | Link Building |
| 15 | Agency · Enterprise | 100–300K | traffic + AI | SEO Campaigns + AI SEO | Link Building + Content Marketing |
| 16 | SME · Mixed | <50K | website + leads | Web Design | Google Ads Campaigns |
| 17 | In-House · Mixed | 50–100K | website + traffic | Web Design + SEO Campaigns | CRO |
| 18 | Enterprise | 300K+ | website + leads | Web Design + Google Ads | CRO + UI/UX |
| 19 | SME · Local | <50K | not sure + leads | Google Ads Campaigns | Facebook Ads |
| 20 | Enterprise · Mixed | 300K+ | not sure + leads | Google Ads + Facebook Ads | SEO Campaigns + AI SEO |

**Two changes from the original sheet**, both agreed:

- Personas 4 and 6 receive **E-commerce SEO** where the sheet said SEO
  Campaigns, because E-commerce SEO should only ever appear for e-commerce
  businesses and applying that consistently means using it for them.
- **AI SEO's deliverables were rewritten** to be purely AI-specific — *entity
  optimisation, AI citation tracking, answer-format content, schema for AI
  assistants*. The sheet listed On-page SEO and Technical SEO on both AI SEO
  and SEO Campaigns, and the two appear together as co-primaries in five
  personas; a client should never see the same work quoted twice.

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

Find the brief in `SITUATIONS` and reorder its needs. That changes **only** that
situation — there are no weights to ripple. Then run the tests: if a persona
breaks, you have changed a signed-off decision, which may be exactly what you
intended.

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

Both primaries are joined the way the persona sheet writes them, so a CRM row
reads like the planning sheet. Added alongside, and ignored by the current
workflow until someone maps them: `primaries[]`, `also_relevant`, `overlays`,
`situation` and `plan_shape`.

**One pre-existing gap worth fixing separately:** the workflow reads
`answers.challenge` only. The quiz has always sent the second challenge as
`answers.challenge_2`, and nothing reads it — so the second challenge is
discarded on every lead. Adding a `challenge_2` column to the *MAM Quiz Leads*
table and one line in "Build lead row" fixes it. Now that the pair *is* the
brief, this is the most informative answer in the quiz.
