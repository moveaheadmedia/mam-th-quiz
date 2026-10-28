/* ==========================================================================
   CONFIG — the only file you should need to edit to go live.
   ========================================================================== */

/* On the live pages the build (deploy/build.mjs) puts a small
   window.MAM_DEPLOY block in the page, from deploy/sites.mjs: where leads
   go, and the form name and time zone they carry. Everything else below
   applies everywhere. */
var MAM_DEPLOY = window.MAM_DEPLOY || {};

window.MAM_CONFIG = {

  /* --------------------------------------------------------------------
     1. Where leads go
     --------------------------------------------------------------------
     webhookFormat "quiz" (the preview on GitHub Pages): the whole quiz
     payload goes straight to n8n "MAM Service Quiz — save leads to data
     table" (README → Storing leads in an n8n data table).

     webhookFormat "mam-forms" (the live pages): the lead goes straight to
     the webhook of n8n "MAM Forms => PIPEDRIVE", the workflow the websites'
     enquiry forms use, in the same "_Field" shape (engine.js → formFields)
     — so it lands in Pipedrive like a website enquiry.

     An empty webhookUrl still runs the quiz end to end: the request body is
     logged to the browser console instead of being sent.

     For the "quiz" format, set in the n8n Webhook node:
       HTTP Method .......... POST
       Respond .............. "Immediately" (or "Using Respond to Webhook")
       Allowed Origins (CORS) ... https://moveaheadmedia.github.io
     -------------------------------------------------------------------- */
  webhookUrl: MAM_DEPLOY.webhookUrl || 'https://n8n.moveaheadmedia.com/webhook/mam-service-quiz',
  webhookFormat: MAM_DEPLOY.webhookFormat || 'quiz',

  /* Milliseconds to wait for n8n before we give up and show results anyway.
     The user never gets blocked by a slow automation. */
  webhookTimeoutMs: 8000,

  /* --------------------------------------------------------------------
     2. Market, links & contact details
     --------------------------------------------------------------------
     Each page names its market in <html data-market="…">: / and /th/ are
     TH, /au/ is AU (a page without one is TH). The market picks the website
     every link goes to and the phone number shown — the service links in
     data.js follow `site` — and is sent with the lead as "market".
     -------------------------------------------------------------------- */
  market: ((typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-market')) || 'TH').toUpperCase(),
  markets: {
    /* currency: the budget answers' currency (AU's are in data.js →
       MARKET_ANSWERS); the lead's budget field is named after it. */
    TH: {
      site: 'https://www.moveaheadmedia.co.th',
      consultationUrl: 'https://www.moveaheadmedia.co.th/contact-us/',
      caseStudiesUrl: 'https://www.moveaheadmedia.co.th/about/case-studies/',
      phone: '02 260 0424',
      phoneHref: 'tel:+6622600424',
      currency: 'THB'
    },
    AU: {
      site: 'https://www.moveaheadmedia.com.au',
      consultationUrl: 'https://www.moveaheadmedia.com.au/contact-us/',
      caseStudiesUrl: 'https://www.moveaheadmedia.com.au/about/case-studies/',
      phone: '02 9161 8033',
      phoneHref: 'tel:+61291618033',
      currency: 'AUD'
    }
  },
  email: 'info@moveaheadmedia.com',

  /* Google rating shown under question 1, in every language. Update both
     numbers here when the reviews change. */
  reviews: { rating: '4.8', count: 51 },

  /* --------------------------------------------------------------------
     2b. Chat button on the results page — one per market
     --------------------------------------------------------------------
     The results page shows a chat button next to "Book" and "Call". Which
     app it opens depends on the page's market: TH → LINE, AU → WhatsApp. The chat
     opens with the visitor's plan already typed (service names only — never
     their name, email or phone), so the team sees the context straight away.

     A market with no account set here simply shows no chat button.
     -------------------------------------------------------------------- */
  chat: {
    /* The LINE Official Account linked from moveaheadmedia.co.th.
       pageUrl  — the account page; used on computers, which have no LINE app.
       lineId   — used on phones to open the LINE app with the plan pre-typed
                  (keeps its "@"). */
    TH: {
      app: 'line',
      pageUrl: 'https://page.line.me/pmi1665e',
      lineId: '@pmi1665e'
    },
    /* The AU office's WhatsApp — the same Sydney line as the Call button
       (02 9161 8033). Digits only, with country code and no leading 0.
       Set it to '' to hide the button.
       The button text is in i18n/en.js and th.js ("chat.line", "chat.whatsapp"). */
    AU: { app: 'whatsapp', number: '61291618033' }
  },

  /* --------------------------------------------------------------------
     2c. The enquiry-form fields ("mam-forms" format only)
     --------------------------------------------------------------------
     formName, timeZone, dateStyle — set per live page by the build: the
       note's heading ("Service Quiz", "Service Quiz - TH", "Service Quiz -
       AU") and the site-local _date, written like that site's Quform.
     dialCodes — the "Country Code" sent with a phone number typed without a
       "+" code, like the website form's default (+66 on .co.th, +61 here
       for AU).
     serviceInterest — the Pipedrive "Service Interest" option each
       recommended service counts as. The lead's main recommendation(s) are
       sent as "Service of interest", the field the website form's service
       picker fills; n8n matches the option names exactly (any case). A
       service in no list (the free strategy consultation) adds nothing.
     -------------------------------------------------------------------- */
  forms: {
    formName: MAM_DEPLOY.formName || 'Service Quiz',
    timeZone: MAM_DEPLOY.timeZone || 'Asia/Bangkok',
    dateStyle: MAM_DEPLOY.dateStyle || 'd/m/Y',
    dialCodes: { TH: '+66', AU: '+61' },
    serviceInterest: {
      'SEO': ['seo-campaigns', 'ecommerce-seo', 'technical-seo', 'seo-audit',
              'seo-ai-visibility-audit', 'on-page-seo', 'keyword-mapping',
              'link-building', 'video-seo', 'seo-reseller'],
      'AI SEO': ['ai-seo'],
      'GBP / Local SEO': ['local-seo', 'google-business-profile'],
      'Content Marketing': ['content-marketing'],
      'Google Ads': ['google-ads-campaigns', 'google-shopping', 'performance-max',
                     'google-display-ads', 'youtube-ads'],
      'Social Media': ['social-media-campaigns', 'facebook-ads', 'cpas-ads',
                       'line-ads', 'reddit-ads', 'x-ads', 'premium-creative'],
      'LinkedIn': ['linkedin-ads'],
      'TikTok Ads': ['tiktok-ads'],
      'Website Design and Development': ['web-design', 'ui-ux', 'cro', 'heat-maps'],
      'Website Maintenance': ['web-maintenance'],
      'Email Campaigns': ['email-marketing'],
      'Digital Marketing': ['programmatic-ads', 'outcome-marketing']
    }
  },

  /* --------------------------------------------------------------------
     3. Behaviour
     -------------------------------------------------------------------- */
  persistAnswers: true,  // remember progress on refresh (sessionStorage)
  embedResize: true,     // post height to parent window when used in an iframe

  /* --------------------------------------------------------------------
     4. SPAM PROTECTION
     --------------------------------------------------------------------
     IMPORTANT: everything below is *advisory only*. This is a static site,
     so webhookUrl above is readable by anyone who views source, and a bot can
     POST straight to n8n without ever loading this page. None of these checks
     can stop that. The only real gate is verifying the reCAPTCHA token
     server-side inside your n8n workflow — see README.md.

     The client never blocks a submission. It attaches signals and a
     client_spam_score, and n8n decides. That way a false positive can never
     silently cost you a real lead.
     -------------------------------------------------------------------- */
  spam: {
    /* Google reCAPTCHA v3 SITE key (the public one, safe to expose here).
       The SECRET key belongs in n8n credentials and must never appear in this
       file. Leave empty to disable — the quiz still works, and the payload
       reports configured:false so n8n can tell verification was skipped.
       Off for the "mam-forms" format (the live pages): "MAM Forms =>
       PIPEDRIVE" does not check a token, so Google's script is not loaded
       for nothing. Every lead is sent; anything that looks like spam is
       only marked in the Pipedrive note (engine.js → spamCheck). */
    recaptchaSiteKey: MAM_DEPLOY.webhookFormat === 'mam-forms' ? '' : '6LfBdF8tAAAAABgwWbyFsy04A4u4VRBJJBNT0ZEV',

    /* Action name passed to grecaptcha.execute(). Verify this matches in n8n —
       it stops a token farmed from another page on your domain being replayed. */
    recaptchaAction: 'quiz_submit',

    /* A human who has just answered 4 questions takes longer than this to fill
       4 fields. Faster than this is flagged, not blocked. */
    minSecondsOnForm: 2,

    /* Flagged (never blocked) if the lead email uses one of these domains. */
    disposableEmailDomains: [
      'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
      'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'yopmail.com',
      'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com',
      'fakeinbox.com', 'maildrop.cc', 'mailnesia.com', 'spam4.me', 'grr.la'
    ]
  }
};

/* The page's market's links and phone become MAM_CONFIG.site, .phone, etc.
   An unknown market falls back to TH. */
(function (cfg) {
  if (!cfg.markets[cfg.market]) cfg.market = 'TH';
  var own = cfg.markets[cfg.market];
  for (var key in own) cfg[key] = own[key];
})(window.MAM_CONFIG);
