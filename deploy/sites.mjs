/* ==========================================================================
   The live pages — everything that differs from one to the next.

   Each live page is a folder of its own on its website, separate from the
   website's WordPress code. deploy/build.mjs builds it from one page of
   this repository into dist/<branch>/, and deploy/push-live-branches.sh
   keeps it on the git branch of the same name: a live branch holds exactly
   what is in that folder on the server.
   ========================================================================== */

/* n8n "MAM Forms => PIPEDRIVE" — the workflow the websites' enquiry forms
   post to. Every live page posts its leads straight to this webhook. */
const FORMS_WEBHOOK = 'https://n8n.moveaheadmedia.com/webhook/dca138b4-dd5e-489e-88fd-e3096222296d';

export const PAGES = {
  /* English, www.moveaheadmedia.co.th/quiz/ */
  'live-mam-en': {
    url: 'https://www.moveaheadmedia.co.th/quiz/',
    source: 'index.html',
    hostinger: { account: 'u945611451', domain: 'moveaheadmedia.co.th', folder: 'public_html/quiz' },
    gtm: 'GTM-NHTDCN6S',
    links: { en: '/quiz/', th: '/th/quiz/' },       // the EN | TH switch
    htaccess: 'deploy/htaccess/quiz.htaccess',
    deploy: {
      webhookUrl: FORMS_WEBHOOK, webhookFormat: 'mam-forms',
      formName: 'Service Quiz', timeZone: 'Asia/Bangkok', dateStyle: 'd/m/Y',
    },
  },

  /* Thai, www.moveaheadmedia.co.th/th/quiz/ */
  'live-mam-th': {
    url: 'https://www.moveaheadmedia.co.th/th/quiz/',
    source: 'th/index.html',
    hostinger: { account: 'u945611451', domain: 'moveaheadmedia.co.th', folder: 'public_html/th/quiz' },
    gtm: 'GTM-NHTDCN6S',
    links: { en: '/quiz/', th: '/th/quiz/' },
    htaccess: 'deploy/htaccess/th-quiz.htaccess',
    deploy: {
      webhookUrl: FORMS_WEBHOOK, webhookFormat: 'mam-forms',
      formName: 'Service Quiz - TH', timeZone: 'Asia/Bangkok', dateStyle: 'd/m/Y',
    },
  },

  /* Australia, www.moveaheadmedia.com.au/quiz/ — no language switch. */
  'live-mam-au': {
    url: 'https://www.moveaheadmedia.com.au/quiz/',
    source: 'au/index.html',
    hostinger: { account: 'u945611451', domain: 'moveaheadmedia.com.au', folder: 'public_html/quiz' },
    gtm: 'GTM-NRK28BX5',
    links: null,
    htaccess: 'deploy/htaccess/quiz.htaccess',
    deploy: {
      webhookUrl: FORMS_WEBHOOK, webhookFormat: 'mam-forms',
      formName: 'Service Quiz - AU', timeZone: 'Australia/Sydney', dateStyle: 'm/d/Y',
    },
  },
};
