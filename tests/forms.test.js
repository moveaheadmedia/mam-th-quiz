/* ==========================================================================
   MAM quiz — the lead as website-form fields (engine.js → formFields)

   On the live websites a quiz lead goes to n8n "MAM Forms => PIPEDRIVE"
   through the relay (deploy/relay/submit.php). This suite checks the fields
   the page sends: their names (the workflow reads them by name), the
   Pipedrive "Service Interest" names, and that the relay lets every one of
   them through (it needs the relay's text; tests/run-node.mjs provides it).

   Dependency-free; load after config.js, data.js, engine.js and planner.js.
   ========================================================================== */
(function (root) {
  "use strict";

  var CFG = root.MAM_CONFIG;
  var D = root.MAM_DATA;
  var E = root.MAM_ENGINE;
  var P = root.MAM_PLANNER;
  var tests = [];
  var passed = 0;
  var failed = 0;

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

  /* The Pipedrive options n8n matches "Service of interest" against
     (Service Interest field, read 2026-10-28). */
  var PIPEDRIVE_SERVICE_INTEREST = ["SEO", "AI SEO", "GBP / Local SEO", "Google Ads", "Social Media",
    "Website Design and Development", "Content Marketing", "TikTok Ads", "LinkedIn",
    "Digital Marketing", "Email Campaigns", "Graphic Design", "Website Maintenance"];

  var LEAD = { name: "Somchai Test", email: "somchai@example.com", phone: "081 234 5678", website: "https://example.co.th" };
  var UTM = { utm_source: "Meta", utm_medium: "Organic_FB", utm_campaign: "post" };

  function payloadFor(answers, extra) {
    var result = P.plan(answers);
    var payload = P.buildPayload(answers, LEAD, result, Date.now(), {
      recaptcha: { configured: true, token: null },
      signals: { honeypot_filled: false },
      client_spam_score: 0,
    });
    payload.language = "en";
    payload.market = "TH";
    payload.meta.page_url = "https://www.moveaheadmedia.co.th/quiz/?utm_source=facebook&utm_medium=social&utm_campaign=post";
    for (var key in extra || {}) payload[key] = extra[key];
    return payload;
  }

  var LEADS_ANSWERS = { profile: "sme", type: "local", budget: "50to100", objective: "leads", challenge: ["ranking", "ai"] };

  test("a lead becomes the website form's fields", function () {
    same(E.formFields(payloadFor(LEADS_ANSWERS), UTM), {
      _Name: "Somchai Test",
      "_Email address": "somchai@example.com",
      "_Country Code": "+66",
      "_Phone Number": "081 234 5678",
      _Website: "https://example.co.th",
      "_Monthly Project Budget (THB)": "THB 50,000 – 100,000/month",
      "_Service of interest": "Google Ads, SEO",
      "_Quiz: About you": "Small Business / SME",
      "_Quiz: Business type": "Local Business / SME",
      "_Quiz: Goal": "Generate more leads / enquiries",
      "_Quiz: Challenge": "My website doesn't rank well on Google. / My business isn't visible in AI Search.",
      "_Quiz: Recommended": "Google Ads Campaigns + SEO Campaigns",
      "_Quiz: Also in the plan": "Facebook Ads",
      "_Quiz: Budget tier": "Growth",
      "_Quiz: Language": "English",
      _utm_source: "Meta",
      _utm_medium: "Organic_FB",
      _utm_campaign: "post",
      _formURL: "https://www.moveaheadmedia.co.th/quiz/?utm_source=facebook&utm_medium=social&utm_campaign=post",
    });
  });

  test("country code: the market's default, unless the number has its own +", function () {
    same(E.formFields(payloadFor(LEADS_ANSWERS), UTM)["_Country Code"], "+66");
    same(E.formFields(payloadFor(LEADS_ANSWERS, { market: "AU" }), UTM)["_Country Code"], "+61");
    function phone(typed) {
      var payload = payloadFor(LEADS_ANSWERS);
      payload.lead.phone = typed;
      var fields = E.formFields(payload, UTM);
      return [fields["_Country Code"], fields["_Phone Number"]];
    }
    same(phone("+61 412 345 678"), ["+61", "412 345 678"]);
    same(phone("+1-212-555-0100"), ["+1", "212-555-0100"]);
    same(phone("+66812345678"), ["", "+66812345678"], "no gap after the code: kept whole");
    same(phone("  02 260 0424 "), ["+66", "02 260 0424"]);
  });

  test("the Thai page says so in the note; the lead itself stays English", function () {
    var fields = E.formFields(payloadFor(LEADS_ANSWERS, { language: "th" }), UTM);
    same(fields["_Quiz: Language"], "Thai");
    same(fields["_Quiz: Goal"], "Generate more leads / enquiries");
  });

  test("the free consultation plan names no service of interest", function () {
    var fields = E.formFields(payloadFor({ profile: "sme", type: "local", budget: "unsure", objective: "unsure", challenge: ["unsure", "brand"] }), UTM);
    same(fields["_Service of interest"], "");
    same(fields["_Quiz: Recommended"], "Free Strategy Consultation");
  });

  test("missing UTM values are sent blank, like an empty Quform field", function () {
    var fields = E.formFields(payloadFor(LEADS_ANSWERS), {});
    same([fields._utm_source, fields._utm_medium, fields._utm_campaign], ["", "", ""]);
  });

  test("every value is text", function () {
    var fields = E.formFields(payloadFor(LEADS_ANSWERS), UTM);
    Object.keys(fields).forEach(function (key) {
      assert(typeof fields[key] === "string", key + " is " + typeof fields[key]);
    });
  });

  test("every service maps to one Pipedrive option, except the consultation", function () {
    var map = CFG.forms.serviceInterest;
    Object.keys(D.CATALOGUE).forEach(function (id) {
      var options = Object.keys(map).filter(function (option) { return map[option].indexOf(id) !== -1; });
      if (id === "strategy-consultation") same(options, [], id);
      else assert(options.length === 1, id + " maps to " + JSON.stringify(options));
    });
  });

  test("the service map names only real services and real Pipedrive options", function () {
    var map = CFG.forms.serviceInterest;
    Object.keys(map).forEach(function (option) {
      assert(PIPEDRIVE_SERVICE_INTEREST.indexOf(option) !== -1, '"' + option + '" is not a Pipedrive option');
      map[option].forEach(function (id) { assert(D.CATALOGUE[id], option + ": unknown service " + id); });
    });
  });

  test('"quiz" format: the whole payload, as before', function () {
    var payload = payloadFor(LEADS_ANSWERS);
    var saved = CFG.webhookFormat;
    CFG.webhookFormat = "quiz";
    try { assert(E.requestBody(payload) === payload, "the payload itself"); }
    finally { CFG.webhookFormat = saved; }
  });

  test('"mam-forms" format: fields, page language, honeypot, and the page\'s UTM values', function () {
    var payload = payloadFor(LEADS_ANSWERS, { language: "th" });
    payload.security.signals.honeypot_filled = true;
    var saved = [CFG.webhookFormat, root.MAM_UTM];
    CFG.webhookFormat = "mam-forms";
    root.MAM_UTM = { values: function () { return UTM; } };
    try {
      var body = E.requestBody(payload);
      same(Object.keys(body), ["fields", "lang", "hp"]);
      same([body.lang, body.hp, body.fields._utm_medium], ["th", 1, "Organic_FB"]);
    } finally {
      CFG.webhookFormat = saved[0];
      root.MAM_UTM = saved[1];
    }
  });

  test("the relay lets every field through", function () {
    var php = root.MAM_RELAY_SOURCE;
    if (!php) { writeLine("      (no relay source: skipped)"); return; }
    var block = /\$allowed = array\(([\s\S]*?)\);/.exec(php);
    assert(block, "no $allowed list in submit.php");
    var allowed = block[1].match(/'[^']*'/g).map(function (s) { return s.slice(1, -1); });
    assert(/strpos\(\$key, '_Quiz: '\) === 0/.test(php), "the relay no longer allows _Quiz: fields");
    Object.keys(E.formFields(payloadFor(LEADS_ANSWERS), UTM)).forEach(function (key) {
      assert(allowed.indexOf(key) !== -1 || key.indexOf("_Quiz: ") === 0, key + " would be dropped by the relay");
    });
  });

  function run() {
    tests.forEach(function (item) {
      try {
        item.fn();
        passed++;
        writeLine("PASS " + item.name, "pass");
      } catch (error) {
        failed++;
        writeLine("FAIL " + item.name + "\n      " + (error && error.message), "fail");
      }
    });
    var summary = "\nRESULT " + passed + " passed, " + failed + " failed";
    writeLine(summary, failed ? "summary fail" : "summary pass");
    root.MAM_TEST_RESULTS = { passed: passed, failed: failed };
    if (root.process && typeof root.process === "object") {
      root.process.exitCode = failed ? 1 : (root.process.exitCode || 0);
    } else if (!root.document && failed) {
      throw new Error(summary);
    }
  }

  run();
})(typeof window !== "undefined" ? window : this);
