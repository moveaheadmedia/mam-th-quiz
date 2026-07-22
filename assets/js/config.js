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
  embedResize: true      // post height to parent window when used in an iframe
};
