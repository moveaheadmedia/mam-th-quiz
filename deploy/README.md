# Deploying the quiz to the websites

The quiz runs on Move Ahead Media's own WordPress sites as plain files next to
WordPress, on Hostinger (account u945611451, server1832):

| Page | Address | Folder on the server (`/home/u945611451/domains/<domain>/`) |
| --- | --- | --- |
| English | https://www.moveaheadmedia.co.th/quiz/ | `public_html/quiz/index.html` |
| Thai | https://www.moveaheadmedia.co.th/th/quiz/ | `public_html/th/quiz/index.html` |
| Australia | https://www.moveaheadmedia.com.au/quiz/ | `public_html/quiz/index.html` (on moveaheadmedia.com.au) |

Each site also gets `public_html/quiz/assets/` (shared by both co.th pages),
`public_html/quiz/submit.php` (the lead relay) and `mam-quiz-relay.config.php`
one level above `public_html` (the relay's settings, including the n8n webhook
URL — not in git, not reachable from the web).

## Build

```bash
MAM_QUIZ_WEBHOOK_COTH=https://n8n.moveaheadmedia.com/webhook/… \
MAM_QUIZ_WEBHOOK_COMAU=https://n8n.moveaheadmedia.com/webhook/… \
node deploy/build.mjs            # or: node deploy/build.mjs coth
```

`dist/<site>/` then mirrors the site's folder and is uploaded as it is.
Everything that differs per site is in [`sites.mjs`](sites.mjs): the GTM
container, the page addresses, the EN | TH links, the form names and the time
zone the relay stamps on each lead. The build:

- turns asset links into `/quiz/assets/…?v=<hash>` (the Thai page lives at
  `/th/quiz/` but uses the same assets; the hash changes whenever an asset does,
  so browsers never mix old and new files);
- points the EN | TH switch at the live addresses, and refuses a page with a
  switch on a site that has none (Australia);
- adds the site's Google Tag Manager container to `<head>` and `<body>`;
- adds `window.MAM_DEPLOY`, which sends leads to `/quiz/submit.php` in the
  website-form format (see `assets/js/config.js`);
- writes `mam-quiz-relay.config.php` only when that site's webhook variable is
  set. Without it the file is left out, and the copy already on the server
  stays as it is.

The webhook is the **production** URL of n8n **"MAM Forms => PIPEDRIVE"** —
the workflow the websites' Quform enquiry forms post to — the same URL for both
sites. That workflow labels and assigns the lead from the page address
(`.co.th` → Thailand, `.com.au` → Australia).

## Upload

Upload the contents of `dist/<site>/` to the site's folder (the one that holds
`public_html`), keeping the paths: hPanel → File Manager, FTP, or the Hostinger
API's File Browser upload (Mr Meeseeks uses `hostinger-deploy`). Nothing else
on the site changes: no WordPress page, no plugin, and no existing `.htaccess`.

`public_html/th/` on moveaheadmedia.co.th already exists (it holds the Thai
`llms.txt`), and its `.htaccess` sends every `/th/…` address that is not a file
to WordPress. `public_html/th/quiz/.htaccess` turns that off for the quiz
folder only, so `/th/quiz/` is served from there. Do not delete it.

## Check after every deploy

- `/quiz/` and `/th/quiz/` show the quiz; `/th/` and other Thai pages still
  show WordPress.
- The page source has the build comment `<!-- mam-th-quiz <commit> build <hash> -->`
  and the site's `GTM-…` id.
- `https://www.<domain>/quiz/submit.php` answers `405 {"ok":false,"error":"post-only"}`.
  `500 not-configured` means the settings file is missing.
- If the old version still shows, clear the cache in hPanel (or the Hostinger
  API's `cache/clear`).

## The relay (`relay/submit.php`)

The page posts the lead to `/quiz/submit.php` on its own site. The relay then
does what WordPress does for a Quform enquiry: it posts the fields to n8n from
the server, form-encoded, each one with and without a leading `_`, and adds
`_Form Name` (`Service Quiz`, or `Service Quiz - TH` from the Thai page),
`_ip` and `_date` (site time). So the n8n webhook URL never appears in the
page, and n8n sees a quiz lead the same way as a website enquiry.

It also:
- accepts only its own site's pages (`Origin`), and only the quiz's fields;
- needs a name and a valid email;
- keeps `_formURL` on its own site (it decides the Pipedrive label and owner);
- thanks a bot that filled in the hidden honeypot field and sends nothing on;
- takes at most 10 leads per visitor address per hour (`rateLimit`);
- answers `{"ok":true}` only once n8n has accepted the lead. Otherwise the quiz
  still shows the results, with the "we could not send your details" note and
  an email link.

There is no reCAPTCHA on the live pages: Quform checks the website forms'
reCAPTCHA inside WordPress, and the relay has no secret key for the quiz's
site key, so the page would load Google's script for a token nobody checks.
To add it, put the secret in the relay's settings and verify the token in
`submit.php` before the lead goes on.

## Roll back

Delete `public_html/quiz/` (and on co.th `public_html/th/quiz/`) in hPanel →
File Manager; the addresses then return to WordPress's 404 page. Or upload
the previous build.
