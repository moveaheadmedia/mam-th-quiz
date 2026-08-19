# Move Ahead Media — Service Recommendation Quiz

An interactive 5-step quiz that recommends which digital marketing services a
visitor actually needs, then captures the lead to an n8n webhook.

**Live:** https://moveaheadmedia.github.io/mam-th-quiz/

No build step, no dependencies — plain HTML, CSS and JavaScript.

---

## Go live

Everything the browser needs lives in `assets/js/config.js`, and both values are
already set:

```js
webhookUrl:       'https://n8n.moveaheadmedia.com/webhook/mam-service-quiz',
spam.recaptchaSiteKey: '6LfBdF8t…'   // public key, safe in this repo
```

What is left is on the n8n side, not here — the workflow has to exist, verify
the reCAPTCHA token server-side, and allow this origin in CORS. See
[Spam protection](#spam-protection) and
[Storing leads in an n8n data table](#storing-leads-in-an-n8n-data-table).

Blank `webhookUrl` and the quiz still works end to end — it logs the payload to
the browser console instead of sending it, which is the easiest way to inspect
exactly what n8n will receive.

The quiz opens straight onto question 1; there is no splash screen or start
button.

### n8n Webhook node settings

| Setting | Value |
| --- | --- |
| HTTP Method | `POST` |
| Path | e.g. `mam-service-quiz` |
| Respond | `Immediately` |
| Allowed Origins (CORS) | `https://moveaheadmedia.github.io`, `https://www.moveaheadmedia.co.th` |

> **CORS is the usual failure point.** The browser posts cross-origin, so the
> webhook must return `Access-Control-Allow-Origin` for the page's origin and
> must answer the `OPTIONS` preflight. If it doesn't, the visitor still sees
> their results but the lead is lost — the results screen shows a fallback
> notice with a mailto link.

### Payload shape

```jsonc
{
  "source": "mam-service-quiz",
  "version": 1,
  "submitted_at": "2026-07-22T08:15:00.000Z",
  "lead": { "name": "…", "website": "https://…", "email": "…", "phone": "…" },
  "answers": {
    "profile":   { "id": "sme",       "label": "Small Business / SME" },
    "type":      { "id": "ecommerce", "label": "E-commerce Business" },
    "budget":    { "id": "100to300",  "label": "THB 100,001 – 300,000/month" },
    "challenge": { "id": "traffic",   "label": "I need more traffic." }
  },
  "recommendation": {
    "logic_version": 2,
    "primary":    { "id": "seo", "name": "SEO + AI Visibility", "url": "…", "score": 23 },
    "supporting": [ /* two more, same shape */ ],
    "all_ranked": [ /* final recommendation order, then other eligible services */ ],
    "budget_tier": "Scale",
    "delivery": { "mode": "managed", "label": "Managed delivery", "overlays": [] },
    "focus": { "mode": "audience-growth", "activeWorkstreams": 2 },
    "confidence": { "level": "medium", "scoreGap": 0, "reason": "…" },
    "phases": [
      { "id": "now", "label": "Run now", "serviceIds": ["seo", "google-ads"] },
      { "id": "next", "label": "Next phase", "serviceIds": ["cro"] }
    ]
  },
  "meta": {
    "page_url": "…", "referrer": "…", "user_agent": "…", "language": "en-GB",
    "screen": "1280x900", "seconds_to_complete": 47,
    "tracking": { "utm_source": "…", "gclid": "…" }
  },
  "security": {
    "recaptcha": {
      "provider": "recaptcha-v3",
      "configured": true,        // false = no site key set, so no token was even attempted
      "action": "quiz_submit",
      "token": "03AFcWeA…"       // null if reCAPTCHA failed or timed out
    },
    "signals": { /* see Spam protection below */ },
    "client_spam_score": 0       // 0–100, advisory
  }
}
```

`meta.tracking` picks up `utm_*`, `gclid` and `fbclid` from the page URL, so
attribution survives into your CRM.

The transport `version` remains `1` so existing n8n mappings keep working;
`recommendation.logic_version` identifies the new decision model. The bundled
n8n workflow continues to store the legacy recommendation fields. Add explicit
table columns/mappings if delivery, focus, confidence or phases also need to be
persisted.

---

## Spam protection

> **Read this before trusting anything in `security`.** This is a static site.
> `webhookUrl` is in `config.js` in plain text, so anyone can read it and POST
> straight to n8n — never loading the page, never running a single check below.
> **The only real gate is verifying the reCAPTCHA token server-side in n8n.**
> Everything the browser sends is a hint, and every hint is forgeable.

The client **never blocks a submission.** It attaches signals and lets n8n
decide, so a mistuned heuristic can't silently cost you a real lead.

### 1. Turn on reCAPTCHA v3

1. Create a v3 site at <https://www.google.com/recaptcha/admin> and add the
   domains you serve from (`moveaheadmedia.github.io`, `www.moveaheadmedia.co.th`).
   If you embed the quiz in an iframe on WordPress, **the parent page's domain is
   the one that must be registered.**
2. Put the **site** key in `config.js` → `spam.recaptchaSiteKey`.
3. Put the **secret** key in n8n credentials. It must never appear in this repo.

With no site key set, no Google script is loaded at all and the payload reports
`configured: false` — so n8n can tell verification was skipped rather than failed.

### 2. Verify the token in n8n (the step that actually stops bots)

Add an **HTTP Request** node before anything else touches the lead:

| Setting | Value |
| --- | --- |
| Method | `POST` |
| URL | `https://www.google.com/recaptcha/api/siteverify` |
| Body Content Type | `Form-Urlencoded` |
| `secret` | your reCAPTCHA **secret** key |
| `response` | `{{ $json.body.security.recaptcha.token }}` |

Then reject in an **IF** node unless **all three** hold:

- `success === true`
- `action === "quiz_submit"` — stops a token farmed from another page on your
  domain being replayed here
- `score >= 0.5` — Google's suggested threshold; tune it after watching real traffic

A missing token (`token: null`) with `configured: true` means reCAPTCHA broke or
timed out for that visitor. Treat it as suspicious, not as proof of a bot — flag
it for a human rather than binning it.

### 3. Client signals (advisory)

`security.signals` carries:

| Signal | Meaning | Adds to score |
| --- | --- | --- |
| `honeypot_filled` | Hidden field was completed — humans can't see it | +60 |
| `faster_than_minimum` | Form done faster than `spam.minSecondsOnForm` | +25 |
| `name_contains_url` | Link spam in the name field | +20 |
| `email_disposable` | Domain is in `spam.disposableEmailDomains` | +15 |
| `name_has_no_letters` | No Latin or Thai letters in the name | +10 |
| `phone_repeated_digit` | e.g. `1111111111` | +10 |
| `seconds_on_form`, `seconds_total`, `email_domain`, `timezone` | Context for triage | — |

These sum into `client_spam_score` (capped at 100). A useful starting policy:
**score ≥ 60 → route to a review queue, don't auto-reject.**

### 4. Ready-made workflow

`n8n/mam-quiz-leads.workflow.json` is an importable template that does all of the
above and stores every submission in an n8n data table. See
[Storing leads](#storing-leads-in-an-n8n-data-table).

### 5. Also worth doing in n8n

- **Rate limit** by IP and by email — a handful of submissions per hour is
  generous for a genuine visitor.
- **Restrict CORS** on the Webhook node to your real origins (below). It won't
  stop a scripted POST, but it stops the form being embedded and abused elsewhere.
- **Dedupe** on email so a double-click can't create two leads.

---

## Storing leads in an n8n data table

`n8n/mam-quiz-leads.workflow.json` is an importable template:

```
Quiz Webhook → Verify reCAPTCHA → Build lead row → Insert lead row
             → Respond to quiz → Needs review? → (review queue | clean lead)
```

Every submission is written to the table. Nothing is dropped — a `status` column
marks each row `new` or `review`, so a bad heuristic can never lose you a lead.

### Setup

1. **Create the data table**, named exactly `MAM Quiz Leads`. The node looks it
   up by name, not by ID, so the template is portable between instances.
   The 30 columns are listed on a sticky note inside the workflow. Do **not**
   add an `id` column — n8n generates row IDs itself.
2. **Import** the JSON: n8n → Workflows → *Import from File*.
3. **Create a Query Auth credential** named `reCAPTCHA secret`, parameter name
   `secret`, value = your reCAPTCHA **secret** key. Select it on the
   *Verify reCAPTCHA* node. Keeping it in credentials rather than in the node
   means the secret is redacted from any workflow export.
4. **Set Allowed Origins** on the Webhook node to your real domains.
5. Copy the **Production URL** into `config.js` → `webhookUrl`.

It imports and runs before step 3 — the reCAPTCHA node is set to
`onError: continueRegularOutput`, so a missing credential can't break the run or
lose the lead. Verification simply reports as failed.

### What lands in each row

Flat, one row per submission: the four lead fields; all four answers as readable
labels; primary service, its URL, supporting services and budget tier;
`all_ranked` and `spam_signals` as JSON strings; the reCAPTCHA verdict
(`recaptcha_configured`, `recaptcha_success`, `recaptcha_score`);
`client_spam_score`; and attribution (`utm_*`, `gclid`, `fbclid`, `page_url`,
`referrer`, `user_agent`, `client_ip`, `seconds_to_complete`).

### How `status` is decided

`review` if `client_spam_score >= 60`, or if reCAPTCHA is configured but
verification failed or scored under 0.5. Otherwise `new`.

> **Harden this once your site key is live.** Out of the box the workflow treats
> "reCAPTCHA not configured" as `new`, and it reads that flag *from the request* —
> so anyone POSTing straight to the webhook can omit it and land in `new`. The
> sticky note in the workflow gives the one-line replacement expression that
> requires a Google-verified token unconditionally. Apply it as soon as
> reCAPTCHA is working.

---

## How the recommendation works

Recommendation logic v3 ranks services and shows the top three:

1. Base fit points from the four answers.
2. Cross-answer interaction points for cases such as Local + Leads.
3. Eligibility gates drop services that do not fit the context.
4. Sort by score — 1st is the primary, 2nd and 3rd are the supporting
   recommendations — then phase those three by the selected budget.

The four questions are deliberately unequal. The challenge carries the largest
weights — it is the client telling us what is actually wrong. Business type
shapes which channel answers it, budget shifts the emphasis between fast
payback and compounding assets, and persona is a light nudge. All of the
business logic lives in the weights and the eligibility gates, so the
recommendation order always matches the scores.

Challenge weights are already final: there is no hidden multiplier and there
are no negative weights. `SEO + AI Visibility` has one combined public score;
the AI challenge changes its focus to `ai-first`. White Label SEO and Outcome
Marketing are delivery overlays rather than competing recommendation cards.

The engine preserves the original payload fields and adds `logic_version`,
delivery, focus, confidence and phase metadata. See `QUIZ-LOGIC.md` for every
weight, interaction, gate, tie rule, worked example and the expected
distribution across all 600 valid combinations.

---

## Local preview

Nothing to install. Either open `index.html` directly, or serve it:

```bash
npx --yes serve .          # or any static server
```

Open `dev-test.html` for an interactive score-and-rule breakdown. Run the full
600-combination regression suite on macOS with:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc \
  -e 'var window=this;' \
  assets/js/data.js assets/js/engine.js tests/quiz-logic.test.js
```

`tests/quiz-logic.html` runs the same dependency-free suite in a browser.

---

## Editing content

| Want to change… | Edit |
| --- | --- |
| Webhook, phone, links, reCAPTCHA key, behaviour flags | `assets/js/config.js` |
| Questions, answers, services, weights, interactions, budget framing | `assets/js/data.js` |
| Eligibility, ranking, phasing, scoring maths, payload shape | `assets/js/engine.js` |
| Screen flow, validation, markup | `assets/js/app.js` |
| Styling | `assets/css/styles.css` |

### Branding notes

Styling is built on the Elementor kit tokens (`.elementor-kit-201`). The kit
does not define hover states, borders, muted text, radii or shadows, so those
were added and are marked with a leading `+` in the token block at the top of
`styles.css`. Two deliberate deviations from the kit:

- Body text **15px → 16px** — 15px inputs trigger zoom-on-focus on iOS.
- H1 **56px fixed → `clamp(30px, 5.4vw, 52px)`** — 56px overflows a 360px screen.

---

## Embedding in WordPress

The quiz posts its height to the parent window, so it can be dropped into a page
as a self-sizing iframe:

```html
<iframe id="mamQuiz" src="https://moveaheadmedia.github.io/mam-th-quiz/"
        style="width:100%;border:0;height:900px" title="Service recommendation quiz"></iframe>
<script>
addEventListener('message', function (e) {
  if (e.data && e.data.type === 'mam-quiz:height') {
    document.getElementById('mamQuiz').style.height = e.data.height + 'px';
  }
});
</script>
```

Set `embedResize: false` in `config.js` to disable the height messages.
