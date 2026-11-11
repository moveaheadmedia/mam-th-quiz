/* ==========================================================================
   MAM quiz — UTM attribution suite (assets/js/utm.js)

   Two parts:
   1. The plugin's own rule table, row by row, with the values the website
      stores — so the rules are readable here.
   2. Side by side with the plugin itself: tests/fixtures/
      mam-quform-utms-scripts.js is the website's scripts.js (v1.4.3/1.4.4,
      changed 2026-10-12). Every scenario runs through both, and the three
      cookies must come out the same. When the plugin changes, replace the
      fixture with the new file: this part then shows what the quiz must
      learn. It needs the fixture's text (tests/run-node.mjs provides it);
      in a browser without it, part 2 is skipped.

   Dependency-free; load after assets/js/utm.js.
   ========================================================================== */
(function (root) {
  "use strict";

  var R = root.MAM_UTM._rules;
  var SITE = "https://www.moveaheadmedia.co.th";
  var tests = [];
  var passed = 0;
  var failed = 0;
  var skipped = 0;

  function writeLine(message, className) {
    if (typeof print === "function") print(message);
    else if (root.console && root.console.log) root.console.log(message);
    if (root.document) {
      var output = root.document.getElementById("test-output");
      if (output) {
        var line = root.document.createElement("div");
        line.className = className || "";
        line.textContent = message;
        output.appendChild(line);
      }
    }
  }

  function test(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
  function same(actual, expected, message) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) throw new Error((message ? message + ": " : "") + "got " + a + ", expected " + e);
  }

  /* A cookie jar shaped like js-cookie's Cookies.get / Cookies.set. */
  function jar(initial) {
    var data = {};
    for (var key in initial || {}) data[key] = initial[key];
    return {
      data: data,
      get: function (name) { return data[name]; },
      set: function (name, value) { data[name] = String(value); },
    };
  }

  var C = R.COOKIES;

  function stored(cookies) {
    return [cookies.data[C.source], cookies.data[C.medium], cookies.data[C.campaign]];
  }

  /* The quiz's rules for one visit. */
  function port(visit) {
    var cookies = jar(visit.cookies);
    R.save({ href: visit.href, referrer: visit.referrer || "", siteUrl: SITE, cookies: cookies });
    return stored(cookies);
  }

  /* The website plugin's own script for the same visit. */
  function plugin(source, visit) {
    var cookies = jar(visit.cookies);
    var run = new Function("window", "document", "mam_utm", "Cookies", "jQuery", "URL", source);
    run(
      { location: { href: visit.href } },
      { referrer: visit.referrer || "" },
      { site_url: SITE },
      cookies,
      function () { return { ready: function (fn) { fn(); } }; },
      URL,
    );
    return stored(cookies);
  }

  function had(source, medium, campaign) {
    var out = {};
    if (source !== undefined) out[C.source] = source;
    if (medium !== undefined) out[C.medium] = medium;
    if (campaign !== undefined) out[C.campaign] = campaign;
    return out;
  }

  var PAGE = SITE + "/quiz/";

  /* Every visit: the address, the referrer, what was stored before, and what
     the website stores afterwards. */
  var VISITS = [
    { name: "no tags, no referrer", href: PAGE, expect: ["Direct", "Contact Form", "direct_contact_form"] },
    { name: "no tags, from the website itself", href: PAGE, referrer: SITE + "/seo/", expect: ["Direct", "Contact Form", "direct_contact_form"] },
    { name: "Google search", href: PAGE, referrer: "https://www.google.com/", expect: ["Google", "Organic", "google_organic"] },
    { name: "Google Thailand", href: PAGE, referrer: "https://www.google.co.th/", expect: ["Google", "Organic", "google_organic"] },
    { name: "Gemini (on google.com) is an LLM, not search", href: PAGE, referrer: "https://gemini.google.com/", expect: ["Referral", "LLM", "https://gemini.google.com/"] },
    { name: "ChatGPT", href: PAGE, referrer: "https://chatgpt.com/", expect: ["Referral", "LLM", "https://chatgpt.com/"] },
    { name: "chat.openai.com", href: PAGE, referrer: "https://chat.openai.com/", expect: ["Referral", "LLM", "https://chat.openai.com/"] },
    { name: "Claude", href: PAGE, referrer: "https://claude.ai/", expect: ["Referral", "LLM", "https://claude.ai/"] },
    { name: "Perplexity with www", href: PAGE, referrer: "https://www.perplexity.ai/", expect: ["Referral", "LLM", "https://www.perplexity.ai/"] },
    { name: "Copilot", href: PAGE, referrer: "https://copilot.microsoft.com/", expect: ["Referral", "LLM", "https://copilot.microsoft.com/"] },
    { name: "Facebook (in-app link)", href: PAGE, referrer: "https://l.facebook.com/", expect: ["Meta", "Organic_FB", "https://l.facebook.com/"] },
    { name: "Facebook mobile", href: PAGE, referrer: "https://m.facebook.com/", expect: ["Meta", "Organic_FB", "https://m.facebook.com/"] },
    { name: "fb.com", href: PAGE, referrer: "https://fb.com/", expect: ["Meta", "Organic_FB", "https://fb.com/"] },
    { name: "Instagram", href: PAGE, referrer: "https://l.instagram.com/", expect: ["Meta", "Organic_IG", "https://l.instagram.com/"] },
    { name: "Clutch", href: PAGE, referrer: "https://clutch.co/profile/move-ahead-media", expect: ["Referral", "Third-party Sites", "clutch.co"] },
    { name: "any other site", href: PAGE, referrer: "https://www.bing.com/", expect: ["Referral", "Third-party Sites", "https://www.bing.com/"] },
    { name: "a referrer that is not an address", href: PAGE, referrer: "android-app", expect: ["Referral", "Third-party Sites", "android-app"] },
    { name: "Google Ads tags kept as they are", href: PAGE + "?utm_source=google&utm_medium=cpc&utm_campaign=Search_Brand&gclid=abc", expect: ["google", "cpc", "Search_Brand"] },
    { name: "utm_source alone: medium and campaign become -", href: PAGE + "?utm_source=newsletter", expect: ["newsletter", "-", "-"] },
    { name: "Facebook social → Meta / Organic_FB", href: PAGE + "?utm_source=facebook&utm_medium=social&utm_campaign=post", expect: ["Meta", "Organic_FB", "post"] },
    { name: "Instagram social → Meta / Organic_IG", href: PAGE + "?utm_source=instagram&utm_medium=social", expect: ["Meta", "Organic_IG", "-"] },
    { name: "Facebook paid keeps its medium", href: PAGE + "?utm_source=facebook&utm_medium=paid&utm_campaign=TH_Leads", expect: ["Meta", "paid", "TH_Leads"] },
    { name: "ChatGPT ads → ChatGPT / CPC", href: PAGE + "?utm_source=chatgpt&utm_medium=cpc&utm_campaign=mam-thailand-chatgpt-ads", expect: ["ChatGPT", "CPC", "mam-thailand-chatgpt-ads"] },
    { name: "ChatGPT link → Referral / LLM / source", href: PAGE + "?utm_source=chatgpt.com", expect: ["Referral", "LLM", "chatgpt.com"] },
    { name: "Perplexity tag → Referral / LLM", href: PAGE + "?utm_source=perplexity&utm_medium=referral", expect: ["Referral", "LLM", "perplexity"] },
    { name: "Google Business Profile", href: PAGE + "?utm_source=mamgbp&utm_medium=organic", expect: ["Google", "Organic", "GBP"] },
    { name: "Clutch tag", href: PAGE + "?utm_source=clutch.co&utm_medium=referral", expect: ["Referral", "Third-party Sites", "clutch.co"] },
    { name: "Clutch in the medium", href: PAGE + "?utm_source=directory&utm_medium=clutch.co", expect: ["Referral", "Third-party Sites", "clutch.co"] },
    { name: "the first of two campaigns wins (Google Ads brand URLs)", href: PAGE + "?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_campaign=Search_Brand", expect: ["google", "cpc", "brand"] },
    { name: "+ and %20 become spaces", href: PAGE + "?utm_source=line&utm_medium=Line+OA&utm_campaign=Oct%20Promo", expect: ["line", "Line OA", "Oct Promo"] },
    { name: "first touch: a stored Google visit survives an internal page view", href: PAGE, cookies: had("Google", "Organic", "google_organic"), expect: ["Google", "Organic", "google_organic"] },
    { name: "a stored Direct visit is re-checked", href: PAGE, referrer: "https://www.google.com/", cookies: had("Direct", "Contact Form", "direct_contact_form"), expect: ["Google", "Organic", "google_organic"] },
    { name: "a campaign-tagged source is never auto-overwritten", href: PAGE, referrer: "https://www.google.com/", cookies: had("newsletter", "email", "oct"), expect: ["newsletter", "email", "oct"] },
    { name: "a later referrer replaces an earlier auto value", href: PAGE, referrer: "https://www.google.com/", cookies: had("Meta", "Organic_FB", "https://l.facebook.com/"), expect: ["Google", "Organic", "google_organic"] },
    { name: "new tags win over stored ones", href: PAGE + "?utm_source=google&utm_medium=cpc&utm_campaign=PMax", cookies: had("Meta", "Organic_FB", "x"), expect: ["google", "cpc", "PMax"] },
    { name: "utm_source alone keeps a stored medium (plugin behaviour)", href: PAGE + "?utm_source=google", cookies: had("Meta", "Organic_FB", "x"), expect: ["google", "Organic_FB", "x"] },
    { name: "an empty utm_source is no source", href: PAGE + "?utm_source=&utm_medium=cpc", expect: ["Direct", "Contact Form", "direct_contact_form"] },
    { name: "tag names are case-sensitive, as on the website", href: PAGE + "?UTM_SOURCE=google", expect: ["Direct", "Contact Form", "direct_contact_form"] },
    { name: "tags after a # are still read (plugin regex)", href: PAGE + "#x?utm_source=google", expect: ["google", "-", "-"] },
  ];

  VISITS.forEach(function (visit) {
    test("rule: " + visit.name, function () {
      same(port(visit), visit.expect);
    });
  });

  test("a malformed %-escape is kept as typed instead of stopping the script", function () {
    same(port({ href: PAGE + "?utm_source=google&utm_campaign=50%off" }), ["google", "-", "50%off"]);
  });

  test("values() gives the three fields a website form sends, blank when unset", function () {
    same(R.values(jar(had("Google", "Organic", "google_organic"))),
      { utm_source: "Google", utm_medium: "Organic", utm_campaign: "google_organic" });
    same(R.values(jar({})), { utm_source: "", utm_medium: "", utm_campaign: "" });
  });

  /* ── Cookies: the same encoding as js-cookie 3 ──────────────────────── */

  /* A document whose cookie property behaves like a browser's. */
  function fakeDocument(refuse) {
    var values = {};
    var doc = {};
    Object.defineProperty(doc, "cookie", {
      get: function () {
        return Object.keys(values).map(function (name) { return name + "=" + values[name]; }).join("; ");
      },
      set: function (line) {
        if (refuse) return;
        var pair = line.split(";")[0];
        var at = pair.indexOf("=");
        values[pair.slice(0, at)] = pair.slice(at + 1);
      },
    });
    doc.raw = values;
    return doc;
  }

  test("cookies are written like js-cookie (path=/, : and / left readable)", function () {
    var doc = fakeDocument();
    var lines = [];
    var spy = { set cookie(line) { lines.push(line); doc.cookie = line; }, get cookie() { return doc.cookie; } };
    R.writeCookie(spy, C.campaign, "https://l.facebook.com/");
    same(lines, ["user_utm_campaign=https://l.facebook.com/; path=/"]);
    R.writeCookie(spy, C.medium, "Third-party Sites");
    same(lines[1], "user_utm_medium=Third-party%20Sites; path=/");
  });

  test("what one side writes, the other reads back unchanged", function () {
    var samples = ["Direct", "Third-party Sites", "https://www.bing.com/search?q=seo&form=QBLH",
      "แคมเปญ ตุลาคม", "50% off", "a+b", "\"quoted\""];
    samples.forEach(function (value) {
      var doc = fakeDocument();
      R.writeCookie(doc, C.campaign, value);
      same(R.readCookie(doc, C.campaign), value, "round trip of " + value);
    });
  });

  test("a value js-cookie wrote is read as js-cookie reads it", function () {
    var doc = fakeDocument();
    doc.raw[C.source] = "Referral";
    doc.raw[C.medium] = "Third-party%20Sites";
    doc.raw[C.campaign] = "https://chatgpt.com/";
    same([R.readCookie(doc, C.source), R.readCookie(doc, C.medium), R.readCookie(doc, C.campaign)],
      ["Referral", "Third-party Sites", "https://chatgpt.com/"]);
    same(R.readCookie(doc, "user_utm_missing"), undefined);
  });

  test("with cookies refused, this page's values are still sent", function () {
    var store = R.cookieStore(fakeDocument(true));
    R.save({ href: PAGE + "?utm_source=facebook&utm_medium=social&utm_campaign=post", referrer: "", siteUrl: SITE, cookies: store });
    same(R.values(store), { utm_source: "Meta", utm_medium: "Organic_FB", utm_campaign: "post" });
  });

  test("a stored cookie wins over this page's copy", function () {
    var doc = fakeDocument();
    var store = R.cookieStore(doc);
    R.save({ href: PAGE, referrer: "https://www.google.com/", siteUrl: SITE, cookies: store });
    doc.raw[C.source] = "Meta"; // another tab of the website changed it
    same(R.values(store).utm_source, "Meta");
  });

  /* ── Side by side with the website's plugin ─────────────────────────── */

  var source = root.MAM_UTM_PLUGIN_SOURCE;
  VISITS.forEach(function (visit) {
    test("same as the website: " + visit.name, function () {
      if (!source) { skipped++; throw { skip: true }; }
      same(port(visit), plugin(source, visit));
    });
  });

  test("the plugin really is the fixture under test (it sets cookies at all)", function () {
    if (!source) { skipped++; throw { skip: true }; }
    same(plugin(source, { href: PAGE + "?utm_source=mamgbp" }), ["Google", "Organic", "GBP"]);
  });

  function run() {
    tests.forEach(function (item) {
      try {
        item.fn();
        passed++;
        writeLine("PASS " + item.name, "pass");
      } catch (error) {
        if (error && error.skip) { writeLine("SKIP " + item.name + " (no plugin source)", ""); return; }
        failed++;
        writeLine("FAIL " + item.name + "\n      " + (error && error.message), "fail");
      }
    });
    var summary = "\nRESULT " + passed + " passed, " + failed + " failed" +
      (skipped ? ", " + skipped + " skipped" : "") + "; " + VISITS.length + " visits";
    writeLine(summary, failed ? "summary fail" : "summary pass");
    root.MAM_TEST_RESULTS = { passed: passed, failed: failed, skipped: skipped };
    if (root.process && typeof root.process === "object") {
      root.process.exitCode = failed ? 1 : (root.process.exitCode || 0);
    } else if (!root.document && failed) {
      throw new Error(summary);
    }
  }

  run();
})(typeof window !== "undefined" ? window : this);
