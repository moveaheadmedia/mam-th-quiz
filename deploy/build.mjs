#!/usr/bin/env node
/* ==========================================================================
   Build the quiz for the live websites.

     node deploy/build.mjs           # every site in deploy/sites.mjs
     node deploy/build.mjs coth      # one site

   dist/<site>/ mirrors that website's folder on Hostinger
   (/home/<account>/domains/<domain>/) and is uploaded as it is; see
   deploy/README.md. On the way:
   - asset links become absolute (/quiz/assets/…), with ?v=<content hash> on
     scripts and styles — the Thai page lives at /th/quiz/ but shares
     /quiz/assets/;
   - the EN | TH switch links to the live addresses (a site without a switch
     must get pages without one);
   - the site's Google Tag Manager container goes into <head> and <body>;
   - window.MAM_DEPLOY sends leads to the site's relay (see config.js);
   - the relay's settings file is written beside public_html when the n8n
     webhook URL is in the environment (sites.mjs → relay.webhookEnv).
   Nothing outside dist/ is changed. No dependencies: Node 18 or later.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SITES } from './sites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function fail(message) {
  console.error('build: ' + message);
  process.exit(1);
}

function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full, base) : [path.relative(base, full)];
  }).sort();
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

/* Replace exactly one match of a regular expression, or stop the build. */
function replaceOne(text, pattern, replacement, what) {
  const all = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const found = (text.match(all) || []).length;
  if (found !== 1) fail(`${what}: expected one match, found ${found}`);
  return text.replace(pattern, replacement);
}

function gtm(id) {
  return {
    head: `<!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${id}');</script>
    <!-- End Google Tag Manager -->`,
    body: `<!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->`,
  };
}

function revision() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim() !== '';
    return sha + (dirty ? '-dirty' : '');
  } catch (e) {
    return 'unknown';
  }
}

function buildPage(site, page, version, build) {
  const what = `${site.domain} ${page.source}`;
  let html = fs.readFileSync(path.join(ROOT, page.source), 'utf8');

  /* 1. Asset links → the shared folder, versioned. */
  let assetLinks = 0;
  html = html.replace(/(\s(?:src|href)=")(?:\.\.\/)?assets\/([^"?#]+)"/g, (match, attr, file) => {
    assetLinks++;
    return `${attr}${site.assets}${file}${/\.(?:js|css)$/.test(file) ? `?v=${version}` : ''}"`;
  });
  if (!assetLinks) fail(`${what}: no asset links found`);
  if (/(?:src|href)="(?:\.\.?\/)*assets\//.test(html)) fail(`${what}: a relative asset link is left`);

  /* 2. The language switch. */
  const nav = html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/);
  if (site.links) {
    if (!nav) fail(`${what}: no language switch, but ${site.domain} has one`);
    let links = nav[0];
    for (const [lang, href] of Object.entries(site.links)) {
      links = replaceOne(links, new RegExp(`href="[^"]*"(\\s+lang="${lang}")`), `href="${href}"$1`,
        `${what}: switch link "${lang}"`);
    }
    const count = (links.match(/<a\s/g) || []).length;
    if (count !== Object.keys(site.links).length) fail(`${what}: the switch has ${count} links`);
    html = html.replace(nav[0], () => links);
  } else if (nav) {
    fail(`${what}: has a language switch, but ${site.domain} has none`);
  }

  /* 3. Google Tag Manager, as high in <head> as the charset allows. */
  const tags = gtm(site.gtm);
  html = replaceOne(html, /(<meta name="viewport"[^>]*>\n)/, (m, tag) => `${tag}    ${tags.head}\n`, `${what}: viewport meta`);
  html = replaceOne(html, /(<body[^>]*>\n)/, (m, tag) => `${tag}    ${tags.body}\n`, `${what}: <body>`);

  /* 4. Where leads go (config.js reads window.MAM_DEPLOY). */
  const deploy = { webhookUrl: site.assets.replace(/assets\/$/, 'submit.php'), webhookFormat: 'mam-forms' };
  html = replaceOne(html, /(\n[ \t]*)(<script src="[^"]*\/config\.js\?v=[^"]*"><\/script>)/,
    (m, indent, tag) => `${indent}<script>window.MAM_DEPLOY = ${JSON.stringify(deploy)};</script>${indent}${tag}`,
    `${what}: config.js script tag`);

  /* 5. Which build this is, for checking what is live. */
  html = replaceOne(html, /(<head>\n)/, (m, tag) => `${tag}    <!-- mam-th-quiz ${build} -->\n`, `${what}: <head>`);
  return html;
}

function relayConfig(site) {
  const webhook = process.env[site.relay.webhookEnv];
  if (!webhook) return null;
  if (!/^https:\/\/[^/]+\/webhook\/[^/?#]+$/.test(webhook)) {
    fail(`${site.relay.webhookEnv} does not look like an n8n production webhook URL`);
  }
  const settings = {
    webhook,
    origin: site.origin,
    path: site.assets.replace(/assets\/$/, ''),
    formNames: site.relay.formNames,
    timezone: site.relay.timezone,
    dateFormat: site.relay.dateFormat,
    rateLimit: { max: 10, seconds: 3600 },
  };
  return `<?php
/* Settings for public_html/quiz/submit.php, the MAM service quiz's lead relay.
   Written by deploy/build.mjs (mam-th-quiz) from deploy/sites.mjs. Not in git:
   it holds the n8n webhook URL. */
$settings = <<<'JSON'
${JSON.stringify(settings, null, 2)}
JSON;
return json_decode($settings, true);
`;
}

const wanted = process.argv.slice(2);
for (const id of wanted) if (!SITES[id]) fail(`unknown site "${id}" (known: ${Object.keys(SITES).join(', ')})`);

const assetFiles = files(path.join(ROOT, 'assets'));
const hash = crypto.createHash('sha256');
for (const file of assetFiles) hash.update(file + '\0').update(fs.readFileSync(path.join(ROOT, 'assets', file)));
const version = hash.digest('hex').slice(0, 10);
const build = `${revision()} build ${version}`;

for (const id of wanted.length ? wanted : Object.keys(SITES)) {
  const site = SITES[id];
  const out = path.join(DIST, id);
  fs.rmSync(out, { recursive: true, force: true });

  const assetsOut = path.join(out, 'public_html', site.assets.replace(/^\//, ''));
  for (const file of assetFiles) copy(path.join(ROOT, 'assets', file), path.join(assetsOut, file));
  for (const page of site.pages) {
    const html = buildPage(site, page, version, build);
    fs.mkdirSync(path.dirname(path.join(out, page.out)), { recursive: true });
    fs.writeFileSync(path.join(out, page.out), html);
  }
  for (const [target, source] of Object.entries(site.files)) copy(path.join(ROOT, source), path.join(out, target));

  const config = relayConfig(site);
  if (config) fs.writeFileSync(path.join(out, 'mam-quiz-relay.config.php'), config);

  const written = files(out);
  fs.writeFileSync(path.join(DIST, `${id}.json`), JSON.stringify({
    site: id, domain: site.domain, build, version, builtAt: new Date().toISOString(), files: written,
  }, null, 2) + '\n');
  console.log(`${id}: dist/${id}/ — ${written.length} files, ${build}`);
  if (!config) {
    console.log(`${id}: ${site.relay.webhookEnv} is not set, so mam-quiz-relay.config.php was not written` +
      ' (the copy already on the server stays as it is)');
  }
}
