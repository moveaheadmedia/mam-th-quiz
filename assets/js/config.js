/* ==========================================================================
   CONFIG — the only file you should need to edit to go live.
   ========================================================================== */
window.MAM_CONFIG = {

  /* --------------------------------------------------------------------
     1. n8n WEBHOOK  ← REPLACE THIS BEFORE LAUNCH
     --------------------------------------------------------------------
     Paste the *Production* URL from your n8n Webhook node, e.g.
       https://n8n.yourdomain.com/webhook/mam-service-quiz
     Leave it as the placeholder below and the quiz still works end-to-end —
     the payload is logged to the browser console instead of being sent.

     In the n8n Webhook node set:
       HTTP Method .......... POST
       Respond .............. "Immediately" (or "Using Respond to Webhook")
       Allowed Origins (CORS) ... https://moveaheadmedia.github.io, https://www.moveaheadmedia.co.th
     -------------------------------------------------------------------- */
  webhookUrl: 'REPLACE_WITH_N8N_PRODUCTION_WEBHOOK_URL',

  /* Milliseconds to wait for n8n before we give up and show results anyway.
     The user never gets blocked by a slow automation. */
  webhookTimeoutMs: 8000,

  /* --------------------------------------------------------------------
     2. Links & contact details
     -------------------------------------------------------------------- */
  site: 'https://www.moveaheadmedia.co.th',
  consultationUrl: 'https://www.moveaheadmedia.co.th/contact-us/',
  caseStudiesUrl: 'https://www.moveaheadmedia.co.th/about/case-studies/',
  phone: '02 260 0424',
  phoneHref: 'tel:+6622600424',
  email: 'info@moveaheadmedia.com',

  /* --------------------------------------------------------------------
     3. Behaviour
     -------------------------------------------------------------------- */
  autoAdvanceMs: 300,    // pause after picking an answer, so the tick is visible
  showIntro: true,       // set false to drop users straight into Step 1
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
       reports configured:false so n8n can tell verification was skipped. */
    recaptchaSiteKey: '',

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
