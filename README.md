# Move Ahead Media — Service Recommendation Quiz

An interactive 5-step quiz that recommends which digital marketing services a
visitor actually needs, then captures the lead to an n8n webhook.

**Live:** https://moveaheadmedia.github.io/mam-th-quiz/

No build step, no dependencies — plain HTML, CSS and JavaScript.

---

## Go live: the one thing you must change

Open `assets/js/config.js` and replace the placeholder:

```js
webhookUrl: 'REPLACE_WITH_N8N_PRODUCTION_WEBHOOK_URL',
```

You should also set `spam.recaptchaSiteKey` in the same file and add the
server-side check in n8n — see [Spam protection](#spam-protection).

Until that is set the quiz still works end to end — it logs the payload to the
browser console instead of sending it, so you can inspect exactly what n8n will
receive.

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
    "primary":    { "id": "seo", "name": "SEO", "url": "…", "score": 11 },
    "supporting": [ /* two more, same shape */ ],
    "all_ranked": [ /* every scoring service, ranked */ ],
    "budget_tier": "Scale"
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

### 4. Also worth doing in n8n

- **Rate limit** by IP and by email — a handful of submissions per hour is
  generous for a genuine visitor.
- **Restrict CORS** on the Webhook node to your real origins (below). It won't
  stop a scripted POST, but it stops the form being embedded and abused elsewhere.
- **Dedupe** on email so a double-click can't create two leads.

---

## How the recommendation works

`assets/js/data.js` holds the questions, the service catalogue and a weights map
per answer option. Each answer adds points to services; the **challenge**
question is weighted ×2 because it is the strongest signal. Negative weights
actively rule services out — e.g. an E-commerce business gets `local-seo: -3`,
so Local SEO can't surface for a business with no catchment area.

The top-scoring service becomes the headline recommendation and the next two
become supporting cards. Ties break on `PRIORITY` order in `data.js`.
`Free Strategy Consultation` is `PRIMARY_ONLY` — it can lead a result but never
appears as a support card, because the consultation CTA is already on every
results screen.

To change a recommendation, edit the weights — you should not need to touch
`engine.js`.

### Known gap

An **Agency / Consultant** who picks a specific challenge currently gets generic
SEO ahead of White Label SEO, because the ×2 challenge weighting outweighs the
audience signal. Agencies should arguably be pinned to White Label regardless of
challenge. Not yet implemented.

---

## Local preview

Nothing to install. Either open `index.html` directly, or serve it:

```bash
npx --yes serve .          # or any static server
```

---

## Editing content

| Want to change… | Edit |
| --- | --- |
| Webhook, phone, links, reCAPTCHA key, behaviour flags | `assets/js/config.js` |
| Questions, answers, services, scoring weights | `assets/js/data.js` |
| Scoring maths, payload shape | `assets/js/engine.js` |
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
