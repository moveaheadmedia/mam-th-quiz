/* ==========================================================================
   MAM quiz — Thai translation check

   Dependency-free, like planner.test.js. Load after config.js, data.js,
   planner.js, i18n/en.js and i18n/th.js. Runs in a browser (tests/i18n.html)
   or in Node.

   Fails when the Thai page would fall back to English anywhere a visitor can
   look: a new English sentence without Thai, a lost {placeholder}, or a
   heading / reason a plan can produce that has no Thai.
   ========================================================================== */
(function (root) {
  "use strict";

  var D = root.MAM_DATA;
  var P = root.MAM_PLANNER;
  var EN = root.MAM_TEXT.en.ui;
  var TH = root.MAM_TEXT.th;

  /* English-only on purpose. */
  var NOT_ON_THAI_SITE = ["chat.whatsapp"];          // the Australian chat button
  var SLOTS_DIFFER = ["lead.start"];                 // Thai opener has no answer slots (D-05)
  var NEVER_SHOWN_REASONS = ["retention", "creative"]; // their services never appear in v7

  var tests = [];
  var passed = 0;
  var failed = 0;
  var failureLines = [];

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
  function has(list, value) { return list.indexOf(value) !== -1; }
  function filled(value) { return typeof value === "string" && value.trim() !== ""; }
  function slots(text) { return (String(text).match(/\{[^{}]+\}/g) || []).sort().join(" "); }
  function report(missing, what) {
    if (missing.length) throw new Error(missing.length + " " + what + ":\n      " + missing.join("\n      "));
  }

  /* Every plan the quiz can produce, once. */
  var plans = [];
  var ids = function (qid) {
    return D.QUESTIONS.filter(function (q) { return q.id === qid; })[0].options.map(function (o) { return o.id; });
  };
  ids("profile").forEach(function (profile) {
    ids("type").forEach(function (type) {
      ids("budget").forEach(function (budget) {
        ids("objective").forEach(function (objective) {
          ids("challenge").forEach(function (challenge) {
            plans.push(P.plan({ profile: profile, type: type, budget: budget, objective: objective, challenge: challenge }));
          });
        });
      });
    });
  });

  test("every screen sentence has Thai", function () {
    report(Object.keys(EN).filter(function (key) {
      return !has(NOT_ON_THAI_SITE, key) && !filled(TH.ui[key]);
    }), "keys missing in i18n/th.js");
  });

  test("Thai keeps every {placeholder}", function () {
    report(Object.keys(EN).filter(function (key) {
      return TH.ui[key] && !has(SLOTS_DIFFER, key) && slots(EN[key]) !== slots(TH.ui[key]);
    }).map(function (key) {
      return key + ": English has [" + slots(EN[key]) + "], Thai has [" + slots(TH.ui[key]) + "]";
    }), "placeholder mismatches");
  });

  test("Thai has no screen keys English does not", function () {
    report(Object.keys(TH.ui).filter(function (key) {
      return !(key in EN) && key !== "lead.and";
    }), "unknown keys in i18n/th.js (typo?)");
  });

  test("every question and answer has Thai", function () {
    var missing = [];
    D.QUESTIONS.forEach(function (q) {
      var th = (TH.questions || {})[q.id] || {};
      ["shortLabel", "title", "subtitle"].forEach(function (field) {
        if (!filled(th[field])) missing.push(q.id + "." + field);
      });
      q.options.forEach(function (o) {
        var tho = (th.options || {})[o.id] || {};
        ["label", "desc", "noun", "phrase"].forEach(function (field) {
          if (field in o && !filled(tho[field])) missing.push(q.id + "/" + o.id + "." + field);
        });
      });
    });
    report(missing, "question texts without Thai");
  });

  test("every service card has Thai", function () {
    var missing = [];
    Object.keys(D.CATALOGUE).forEach(function (id) {
      var en = D.CATALOGUE[id];
      var th = (TH.services || {})[id] || {};
      ["name", "kicker", "blurb", "linkText"].forEach(function (field) {
        if (en[field] && !filled(th[field])) missing.push(id + "." + field);
      });
      if (!th.deliverables || th.deliverables.length !== en.deliverables.length ||
          !th.deliverables.every(filled)) {
        missing.push(id + ".deliverables");
      }
    });
    report(missing, "service texts without Thai");
  });

  test("every budget note has Thai", function () {
    report(Object.keys(D.BUDGET_NOTES).filter(function (key) {
      var th = (TH.budgetNotes || {})[key] || {};
      return !filled(th.tier) || !filled(th.text);
    }), "budget notes without Thai");
  });

  test("every heading, reason and delivery note a plan can show has Thai", function () {
    var missing = {};
    /* app.js's own fallback headings count too. */
    ["Start here", "Then add"].forEach(function (label) {
      if (!filled((TH.planLabels || {})[label])) missing['heading "' + label + '"'] = true;
    });
    plans.forEach(function (plan) {
      [plan.quota.label, plan.quota.nextLabel].forEach(function (label) {
        if (!filled((TH.planLabels || {})[label])) missing['heading "' + label + '"'] = true;
      });
      plan.all.forEach(function (id) {
        var key = P.reasonKeyFor(plan, id);
        if (key && !filled((TH.reasons || {})[key])) missing["reason " + key] = true;
      });
      (plan.overlays || []).forEach(function (o) {
        var th = (TH.overlays || {})[o.id] || {};
        if (!filled(th.label) || !filled(th.note)) missing["overlay " + o.id] = true;
      });
    });
    Object.keys(P.REASONS).forEach(function (key) {
      if (!has(NEVER_SHOWN_REASONS, key) && !filled((TH.reasons || {})[key])) missing["reason " + key] = true;
    });
    report(Object.keys(missing), "plan texts without Thai");
  });

  /* ── Runner ──────────────────────────────────────────────────────────── */

  function run() {
    writeLine("MAM quiz — Thai translation check", "heading");
    writeLine("");
    tests.forEach(function (item) {
      try {
        item.fn();
        passed++;
        writeLine("PASS " + item.name, "pass");
      } catch (error) {
        failed++;
        var line = "FAIL " + item.name + "\n      " + (error && error.message);
        failureLines.push(line);
        writeLine(line, "fail");
      }
    });
    var summary = "\nRESULT " + passed + " passed, " + failed + " failed; checked " +
      plans.length + " answer combinations";
    writeLine(summary, failed ? "summary fail" : "summary pass");
    root.MAM_I18N_TEST_RESULTS = { passed: passed, failed: failed, failures: failureLines };
    if (root.process && typeof root.process === "object") {
      root.process.exitCode = failed ? 1 : 0;
    } else if (!root.document && failed) {
      throw new Error(summary);
    }
  }

  run();
})(typeof window !== "undefined" ? window : this);
