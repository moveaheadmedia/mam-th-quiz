#!/usr/bin/env node
/* ==========================================================================
   Build the live pages.

     node deploy/build.mjs                  # every page in deploy/sites.mjs
     node deploy/build.mjs live-mam-th      # one page

   dist/<branch>/ is the complete folder for one live page — its index.html,
   its own copy of assets/ and its .htaccess — exactly what goes on the server
   and on the live branch of that name (deploy/README.md). On the way:
   - asset links become assets/… with ?v=<content hash> on scripts and
     styles, so a browser never mixes old and new files;
   - the EN | TH switch links to the live addresses (a page without a switch
     must stay without one);
   - the site's Google Tag Manager container goes into <head> and <body>;
   - window.MAM_DEPLOY tells config.js where leads go and how to label them.
   Nothing outside dist/ is changed. No dependencies: Node 18 or later.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PAGES } from './sites.mjs';

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

function buildPage(branch, page, version, build) {
  const what = `${branch} (${page.source})`;
  let html = fs.readFileSync(path.join(ROOT, page.source), 'utf8');

  /* 1. Asset links → this folder's own assets/, versioned. */
  let assetLinks = 0;
  html = html.replace(/(\s(?:src|href)=")(?:\.\.\/)?assets\/([^"?#]+)"/g, (match, attr, file) => {
    assetLinks++;
    return `${attr}assets/${file}${/\.(?:js|css)$/.test(file) ? `?v=${version}` : ''}"`;
  });
  if (!assetLinks) fail(`${what}: no asset links found`);

  /* 2. The language switch. */
  const nav = html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/);
  if (page.links) {
    if (!nav) fail(`${what}: no language switch, but the live page has one`);
    let links = nav[0];
    for (const [lang, href] of Object.entries(page.links)) {
      links = replaceOne(links, new RegExp(`href="[^"]*"(\\s+lang="${lang}")`), `href="${href}"$1`,
        `${what}: switch link "${lang}"`);
    }
    const count = (links.match(/<a\s/g) || []).length;
    if (count !== Object.keys(page.links).length) fail(`${what}: the switch has ${count} links`);
    html = html.replace(nav[0], () => links);
  } else if (nav) {
    fail(`${what}: has a language switch, but the live page has none`);
  }
  if (/(?:src|href)="\.\.\//.test(html)) fail(`${what}: a link outside the page's folder is left`);

  /* 3. Google Tag Manager, as high in <head> as the charset allows. */
  const tags = gtm(page.gtm);
  html = replaceOne(html, /(<meta name="viewport"[^>]*>\n)/, (m, tag) => `${tag}    ${tags.head}\n`, `${what}: viewport meta`);
  html = replaceOne(html, /(<body[^>]*>\n)/, (m, tag) => `${tag}    ${tags.body}\n`, `${what}: <body>`);

  /* 4. Where leads go and how they are labelled (config.js reads this). */
  html = replaceOne(html, /(\n[ \t]*)(<script src="assets\/js\/config\.js\?v=[^"]*"><\/script>)/,
    (m, indent, tag) => `${indent}<script>window.MAM_DEPLOY = ${JSON.stringify(page.deploy)};</script>${indent}${tag}`,
    `${what}: config.js script tag`);

  /* 5. Which build this is, for checking what is live. */
  html = replaceOne(html, /(<head>\n)/, (m, tag) => `${tag}    <!-- mam-th-quiz ${build} — ${branch} -->\n`, `${what}: <head>`);
  return html;
}

const wanted = process.argv.slice(2);
for (const branch of wanted) if (!PAGES[branch]) fail(`unknown page "${branch}" (known: ${Object.keys(PAGES).join(', ')})`);

const assetFiles = files(path.join(ROOT, 'assets'));
const hash = crypto.createHash('sha256');
for (const file of assetFiles) hash.update(file + '\0').update(fs.readFileSync(path.join(ROOT, 'assets', file)));
const version = hash.digest('hex').slice(0, 10);
const build = `${revision()} build ${version}`;

for (const branch of wanted.length ? wanted : Object.keys(PAGES)) {
  const page = PAGES[branch];
  const out = path.join(DIST, branch);
  fs.rmSync(out, { recursive: true, force: true });

  for (const file of assetFiles) copy(path.join(ROOT, 'assets', file), path.join(out, 'assets', file));
  fs.writeFileSync(path.join(out, 'index.html'), buildPage(branch, page, version, build));
  copy(path.join(ROOT, page.htaccess), path.join(out, '.htaccess'));

  const written = files(out);
  fs.writeFileSync(path.join(DIST, `${branch}.json`), JSON.stringify({
    branch, url: page.url, hostinger: page.hostinger, build, version,
    builtAt: new Date().toISOString(), files: written,
  }, null, 2) + '\n');
  console.log(`${branch}: dist/${branch}/ — ${written.length} files, ${build} → ${page.url}`);
}
