# The live pages

Each live page is a folder of its own on its website, separate from the
website's WordPress code, and a git branch of its own here:

| Branch | Address | Folder on the server (Hostinger u945611451) |
| --- | --- | --- |
| `live-mam-en` | https://www.moveaheadmedia.co.th/quiz/ | `moveaheadmedia.co.th/public_html/quiz/` |
| `live-mam-th` | https://www.moveaheadmedia.co.th/th/quiz/ | `moveaheadmedia.co.th/public_html/th/quiz/` |
| `live-mam-au` | https://www.moveaheadmedia.com.au/quiz/ | `moveaheadmedia.com.au/public_html/quiz/` |

A live branch holds exactly what is in that folder: `index.html`, the page's
own copy of `assets/`, and `.htaccess`. It is built from the source on `main`
(this branch's history), so **never edit a live branch by hand**. Change the
source, then build, push and upload.

## Leads

Every live page posts its leads straight to the webhook of n8n
**"MAM Forms => PIPEDRIVE"**, the workflow the websites' enquiry forms post to,
in the same `_Field` shape (`assets/js/engine.js` → `formFields`). It is
form-encoded like Quform, so the browser sends it without a CORS preflight.
The page adds:

- `_Form Name`: `Service Quiz`, `Service Quiz - TH` or `Service Quiz - AU`;
- `_date`, in site time, written the way that site's Quform writes it.

n8n then creates the Pipedrive person, a lead titled `<Lead Source> | <name>`
and a note listing the answers and the plan. The page address decides the
label and owner (.co.th → Thailand, .com.au → Australia).

Nothing goes through WordPress, and **every lead is sent**: nothing is
filtered as spam on the page (operator's decision — spam is removed in
Pipedrive). What looks like spam (the hidden anti-bot field filled in, the form
filled in under 2 seconds, a throwaway email domain…) is written in the note as
`Quiz: Spam check`. If the request gets no answer, the page sends it once more
as a beacon. There is no reCAPTCHA, because the workflow does not check a
token.

## Release

```bash
node tests/run-node.mjs              # all suites must pass
node deploy/build.mjs                # dist/live-mam-en/, dist/live-mam-th/, dist/live-mam-au/
deploy/push-live-branches.sh         # commit each dist/<branch>/ to its branch and push
```

Then upload each `dist/<branch>/` into its folder: hPanel → File Manager, FTP,
or the Hostinger API (Mr Meeseeks uses
`hostinger-deploy push dist/<branch> --dest <folder> --replace --delete-extra`).
Only the page's own folder changes.

Everything that differs per page is in [`sites.mjs`](sites.mjs): the address,
the source page, the GTM container, the EN | TH links, the form name, the time
zone and the webhook. The build:

- points asset links at the page's own `assets/…?v=<hash>` (the hash changes
  whenever an asset does, so browsers never mix old and new files);
- points the EN | TH switch at the live addresses, and refuses a page with a
  switch where the live page has none (Australia);
- adds the site's Google Tag Manager container to `<head>` and `<body>`;
- adds `window.MAM_DEPLOY`, which tells `config.js` where leads go and how to
  label them;
- stamps `<!-- mam-th-quiz <commit> build <hash> — <branch> -->` into the page.

## The Thai folder

`public_html/th/` on moveaheadmedia.co.th belongs to the website. It holds the
Thai `llms.txt`, and its `.htaccess` sends every `/th/…` address that is not a
file to WordPress. The quiz's own `public_html/th/quiz/.htaccess` (from
`htaccess/th-quiz.htaccess`) switches that off for the quiz folder only, so
`/th/quiz/` is served from there. Nothing outside the quiz folders is touched.

## Check after every release

- Each address shows the quiz, with the build comment and the right `GTM-…` id
  in the page source.
- `/th/` and other Thai pages still show WordPress.
- If an old version still shows, clear the cache in hPanel.

## Roll back

Upload the previous commit of the live branch, or delete the page's folder in
hPanel → File Manager (the address then shows WordPress's 404 page).
