/* ==========================================================================
   The live websites — everything that differs from one site to the next.

   deploy/build.mjs turns the quiz into one folder per site under dist/,
   laid out like that website's folder on Hostinger
   (/home/<account>/domains/<domain>/), ready to upload as it is.
   ========================================================================== */

/* Files every site gets besides its pages and assets/. */
const QUIZ_FOLDER = {
  'public_html/quiz/.htaccess': 'deploy/htaccess/quiz.htaccess',
  'public_html/quiz/submit.php': 'deploy/relay/submit.php',
};

export const SITES = {
  /* www.moveaheadmedia.co.th — English at /quiz/, Thai at /th/quiz/. */
  coth: {
    domain: 'moveaheadmedia.co.th',
    origin: 'https://www.moveaheadmedia.co.th',
    hostingerAccount: 'u945611451',           // server1832, like the website
    gtm: 'GTM-NHTDCN6S',                       // the website's own container
    assets: '/quiz/assets/',                   // address of the shared assets folder
    pages: [
      { source: 'index.html', out: 'public_html/quiz/index.html' },
      { source: 'th/index.html', out: 'public_html/th/quiz/index.html' },
    ],
    /* The EN | TH switch. */
    links: { en: '/quiz/', th: '/th/quiz/' },
    files: {
      ...QUIZ_FOLDER,
      'public_html/th/quiz/.htaccess': 'deploy/htaccess/th-quiz.htaccess',
    },
    /* Leads: the relay passes them to n8n "MAM Forms => PIPEDRIVE", the
       workflow the website's enquiry forms post to. Its production webhook
       URL is read from this environment variable at build time and only
       ever written to dist/ (git-ignored) and the server. */
    relay: {
      webhookEnv: 'MAM_QUIZ_WEBHOOK_COTH',
      formNames: { en: 'Service Quiz', th: 'Service Quiz - TH' },
      timezone: 'Asia/Bangkok',
      dateFormat: 'd/m/Y G:i',                 // as Quform's _date on this site
    },
  },

  /* www.moveaheadmedia.com.au — the Australian page at /quiz/, no switch. */
  comau: {
    domain: 'moveaheadmedia.com.au',
    origin: 'https://www.moveaheadmedia.com.au',
    hostingerAccount: 'u945611451',
    gtm: 'GTM-NRK28BX5',
    assets: '/quiz/assets/',
    pages: [
      { source: 'au/index.html', out: 'public_html/quiz/index.html' },
    ],
    links: null,
    files: { ...QUIZ_FOLDER },
    relay: {
      webhookEnv: 'MAM_QUIZ_WEBHOOK_COMAU',
      formNames: { en: 'Service Quiz' },
      timezone: 'Australia/Sydney',
      dateFormat: 'm/d/Y g:i A',
    },
  },
};
