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
  }
}
```

`meta.tracking` picks up `utm_*`, `gclid` and `fbclid` from the page URL, so
attribution survives into your CRM.

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
| Webhook, phone, links, behaviour flags | `assets/js/config.js` |
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
