/* ==========================================================================
   MAM quiz — logic v5 regression suite

   Dependency-free by design. Load after assets/js/data.js and planner.js.
   Runs in a browser, in Node, or in macOS JavaScriptCore (jsc).

   The 20 personas in section 3 are the acceptance oracle. They come straight
   from the signed persona sheet — if a future change breaks one of them, it
   has changed a decision the business already made, and the build fails.
   ========================================================================== */
(function (root) {
  "use strict";

  var D = root.MAM_DATA;
  var P = root.MAM_PLANNER;

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

  function fail(message) { throw new Error(message); }
  function assert(condition, message) { if (!condition) fail(message || "Assertion failed"); }
  function equal(actual, expected, message) {
    if (actual !== expected) {
      fail((message || "Values differ") + " — expected " + JSON.stringify(expected) +
        ", got " + JSON.stringify(actual));
    }
  }
  function same(actual, expected, message) {
    var a = JSON.stringify(actual);
    var b = JSON.stringify(expected);
    if (a !== b) fail((message || "Lists differ") + "\n      expected " + b + "\n      got      " + a);
  }
  function test(name, fn) { tests.push({ name: name, fn: fn }); }

  /* ── Shared fixtures ────────────────────────────────────────────────── */

  var PROFILES = ["sme", "inhouse", "enterprise", "agency"];
  var TYPES = ["local", "national", "ecommerce", "enterprise", "mixed"];
  var BUDGETS = ["under50", "50to100", "100to300", "over300", "unsure"];
  var SITUATION_KEYS = Object.keys(D.SITUATIONS);

  var KNOWN_NEEDS = [
    "paid", "paid2", "organic", "ai", "local", "website", "uiux",
    "conversion", "content", "technical", "authority", "reach",
    "retention", "creative",
  ];

  function planFor(profile, type, budget, key) {
    return P.plan({
      profile: profile,
      type: type,
      budget: budget,
      challenge: key.split("|"),
    });
  }

  /** Every legal answer combination the UI can produce. */
  var everyCase = [];
  PROFILES.forEach(function (profile) {
    TYPES.forEach(function (type) {
      BUDGETS.forEach(function (budget) {
        SITUATION_KEYS.forEach(function (key) {
          everyCase.push({
            profile: profile, type: type, budget: budget, key: key,
            result: planFor(profile, type, budget, key),
          });
        });
      });
    });
  });

  function label(c) {
    return "[" + c.profile + "/" + c.type + "/" + c.budget + "/" + c.key + "]";
  }
  function names(ids) {
    return ids.map(function (id) { return D.CATALOGUE[id].name; });
  }

  /* ══ 1. The catalogue ═══════════════════════════════════════════════ */

  test("the catalogue holds all 35 services with everything a card needs", function () {
    var ids = Object.keys(D.CATALOGUE);
    equal(ids.length, 35, "service count");

    var roles = { lead: 0, support: 0, platform: 0, overlay: 0 };
    ids.forEach(function (id) {
      var s = D.CATALOGUE[id];
      ["name", "category", "family", "role", "kicker", "blurb", "icon"].forEach(function (field) {
        assert(s[field], id + " is missing " + field);
      });
      assert(roles[s.role] !== undefined, id + " has unknown role " + s.role);
      roles[s.role]++;
      assert(Array.isArray(s.deliverables) && s.deliverables.length >= 3,
        id + " needs at least three deliverables");
      assert(typeof s.icon === "string" && s.icon.charAt(0) === "<",
        id + " icon must be raw SVG paths");
      assert(id in D.SERVICE_URLS, id + " has no URL slot");
      assert(typeof s.url === "string", id + " url must be a string, blank is fine");
    });

    same(roles, { lead: 11, support: 17, platform: 5, overlay: 2 }, "role split");
    equal(Object.keys(D.SERVICE_URLS).length, 35, "URL slots");
    Object.keys(D.SERVICE_URLS).forEach(function (id) {
      assert(D.CATALOGUE[id], "URL slot " + id + " has no service");
    });
  });

  test("the social card names the platforms it covers", function () {
    var platforms = D.CATALOGUE["social-media-campaigns"].platforms || [];
    assert(platforms.length >= 5, "the social card should name its platforms");
    platforms.forEach(function (id) {
      assert(D.CATALOGUE[id], "unknown platform " + id);
    });
    /* Every platform-role service must be named somewhere, or it is invisible. */
    Object.keys(D.CATALOGUE).forEach(function (id) {
      if (D.CATALOGUE[id].role !== "platform") return;
      assert(platforms.indexOf(id) !== -1, id + " is a platform nothing names");
    });
  });

  /* ══ 2. The situations table ════════════════════════════════════════ */

  test("there are exactly 30 situations and every need is one we can route", function () {
    equal(SITUATION_KEYS.length, 30, "situation count");

    var challenges = D.QUESTIONS.filter(function (q) { return q.id === "challenge"; })[0]
      .options.map(function (o) { return o.id; });

    SITUATION_KEYS.forEach(function (key) {
      key.split("|").forEach(function (part) {
        assert(challenges.indexOf(part) !== -1, key + " references unknown challenge " + part);
      });
      var needs = D.SITUATIONS[key];
      assert(Array.isArray(needs) && needs.length >= 3, key + " needs at least three entries");
      needs.forEach(function (raw) {
        var need = raw.charAt(raw.length - 1) === "!" ? raw.slice(0, -1) : raw;
        assert(KNOWN_NEEDS.indexOf(need) !== -1, key + " uses unknown need " + need);
      });
    });
  });

  test("'not sure' is never offered alone and always leads its pair", function () {
    SITUATION_KEYS.forEach(function (key) {
      var parts = key.split("|");
      if (parts.indexOf("unsure") === -1) return;
      equal(parts.length, 2, key + " — 'not sure' must be paired");
      equal(parts[0], "unsure", key + " — 'not sure' must be the main answer");
    });
    equal(D.SITUATIONS.unsure, undefined, "'not sure' alone must not be a situation");

    var unsure = D.QUESTIONS.filter(function (q) { return q.id === "challenge"; })[0]
      .options.filter(function (o) { return o.id === "unsure"; })[0];
    assert(unsure.requiresSecond, "the 'not sure' answer must be flagged requiresSecond");

    var alone = P.plan({ profile: "sme", type: "local", budget: "under50", challenge: ["unsure"] });
    equal(alone.isComplete, false, "'not sure' alone cannot produce a plan");
    assert(alone.missing.indexOf("challenge_second") !== -1, "it must say what is missing");
  });

  /* ══ 3. The 20 personas — the acceptance oracle ═════════════════════ */

  var PERSONAS = [
    [1, "sme", "local", "under50", ["leads", "ai"], ["Facebook Ads"], ["AI SEO"]],
    [2, "sme", "local", "under50", ["leads", "ranking"], ["Google Ads Campaigns"], ["SEO Campaigns"]],
    [3, "sme", "local", "under50", ["ranking", "traffic"], ["SEO Campaigns"], ["Local SEO"]],
    [4, "sme", "ecommerce", "under50", ["leads", "traffic"], ["Facebook Ads"], ["E-commerce SEO"]],
    [5, "sme", "ecommerce", "50to100", ["leads", "website"], ["Facebook Ads", "Google Ads Campaigns"], ["Web Design"]],
    [6, "inhouse", "ecommerce", "50to100", ["leads", "traffic"], ["Google Shopping", "Facebook Ads"], ["E-commerce SEO"]],
    [7, "inhouse", "national", "50to100", ["ai", "ranking"], ["AI SEO", "SEO Campaigns"], ["Content Marketing"]],
    [8, "inhouse", "national", "100to300", ["leads", "ai"], ["Google Ads Campaigns", "AI SEO"], ["Content Marketing", "SEO Campaigns"]],
    [9, "inhouse", "ecommerce", "100to300", ["leads", "website"], ["Google Shopping", "Facebook Ads"], ["Web Design", "Conversion Rate Optimisation (CRO)"]],
    [10, "enterprise", "enterprise", "100to300", ["ai", "ranking"], ["AI SEO", "SEO Campaigns"], ["Content Marketing", "Technical SEO"]],
    [11, "enterprise", "enterprise", "over300", ["leads", "traffic"], ["Google Ads Campaigns", "Facebook Ads"], ["SEO Campaigns", "Programmatic Ads"]],
    [12, "enterprise", "national", "over300", ["traffic", "ai"], ["SEO Campaigns", "AI SEO"], ["Content Marketing", "Programmatic Ads"]],
    [13, "enterprise", "ecommerce", "over300", ["leads", "website"], ["Google Shopping", "Facebook Ads"], ["Web Design", "Conversion Rate Optimisation (CRO)"]],
    [14, "agency", "mixed", "50to100", ["ranking", "traffic"], ["SEO Campaigns", "AI SEO"], ["Link Building"]],
    [15, "agency", "enterprise", "100to300", ["traffic", "ai"], ["SEO Campaigns", "AI SEO"], ["Link Building", "Content Marketing"]],
    [16, "sme", "mixed", "under50", ["website", "leads"], ["Web Design"], ["Google Ads Campaigns"]],
    [17, "inhouse", "mixed", "50to100", ["website", "traffic"], ["Web Design", "SEO Campaigns"], ["Conversion Rate Optimisation (CRO)"]],
    [18, "enterprise", "enterprise", "over300", ["website", "leads"], ["Web Design", "Google Ads Campaigns"], ["Conversion Rate Optimisation (CRO)", "UI/UX"]],
    [19, "sme", "local", "under50", ["unsure", "leads"], ["Google Ads Campaigns"], ["Facebook Ads"]],
    [20, "enterprise", "mixed", "over300", ["unsure", "leads"], ["Google Ads Campaigns", "Facebook Ads"], ["SEO Campaigns", "AI SEO"]],
  ];

  test("all 20 signed-off personas produce exactly the agreed plan", function () {
    PERSONAS.forEach(function (p) {
      var result = P.plan({
        profile: p[1], type: p[2], budget: p[3], challenge: p[4],
      });
      var tag = "persona " + p[0];
      assert(result.isComplete, tag + " must produce a complete plan");
      same(names(result.primaries), p[5], tag + " primaries");
      /* Supporting services are shown as a set; the sheet writes two of them
         in a different order from the brief, which is display only. */
      same(names(result.supporting).slice().sort(), p[6].slice().sort(),
        tag + " supporting");
    });
  });

  /* ══ 4. The guardrails, across every combination ════════════════════ */

  test("services that may never lead a plan never do", function () {
    var NEVER_PRIMARY = ["cro", "ui-ux", "technical-seo", "content-marketing", "link-building"];
    everyCase.forEach(function (c) {
      c.result.primaries.forEach(function (id) {
        equal(D.CATALOGUE[id].role, "lead",
          label(c) + " made " + id + " primary");
        assert(NEVER_PRIMARY.indexOf(id) === -1,
          label(c) + " made support-only service " + id + " primary");
      });
    });
  });

  test("two primaries are never from the same family", function () {
    everyCase.forEach(function (c) {
      if (c.result.primaries.length < 2) return;
      var a = D.CATALOGUE[c.result.primaries[0]].family;
      var b = D.CATALOGUE[c.result.primaries[1]].family;
      assert(a !== b, label(c) + " gave two primaries from " + a);
    });
  });

  test("platform and delivery services are never shown as cards", function () {
    everyCase.forEach(function (c) {
      c.result.all.forEach(function (id) {
        var role = D.CATALOGUE[id].role;
        assert(role === "lead" || role === "support",
          label(c) + " showed " + id + " (" + role + ") as a card");
      });
    });
  });

  test("every plan fills its budget quota exactly, with no repeats", function () {
    everyCase.forEach(function (c) {
      var r = c.result;
      assert(r.isComplete, label(c) + " should be complete");
      var quota = D.BUDGET_PLAN[c.budget];
      equal(r.primaries.length, quota.primary, label(c) + " primary count");
      equal(r.supporting.length, quota.supporting, label(c) + " supporting count");
      var seen = {};
      r.all.forEach(function (id) {
        assert(!seen[id], label(c) + " repeated " + id);
        seen[id] = true;
      });
    });
  });

  test("every card can explain why it is on the plan", function () {
    everyCase.forEach(function (c) {
      c.result.all.forEach(function (id) {
        assert(P.reasonFor(c.result, id), label(c) + " has no reason for " + id);
      });
    });
  });

  test("the 'also relevant' list never repeats a card or names an overlay", function () {
    everyCase.forEach(function (c) {
      (c.result.alsoRelevant || []).forEach(function (id) {
        assert(D.CATALOGUE[id], label(c) + " also-relevant names unknown " + id);
        assert(c.result.all.indexOf(id) === -1,
          label(c) + " also-relevant repeats card " + id);
        assert(D.CATALOGUE[id].role !== "overlay",
          label(c) + " also-relevant names overlay " + id);
      });
    });
  });

  /* ══ 5. Budget's one job ════════════════════════════════════════════ */

  test("budget changes how much is recommended, never what kind", function () {
    /* RULE 2.1. Budget may pick a different service INSIDE a family — Google
       Ads Campaigns or Google Shopping, Facebook Ads or CPAS — and it decides
       how many cards are shown. It must never swap one family for another,
       which is what let the old logic answer a website question with UI/UX on
       a small budget and Web Design on a large one. */
    var ordered = ["under50", "50to100", "100to300", "over300"];
    PROFILES.forEach(function (profile) {
      TYPES.forEach(function (type) {
        SITUATION_KEYS.forEach(function (key) {
          var previous = null;
          ordered.forEach(function (budget) {
            var families = planFor(profile, type, budget, key).primaries
              .map(function (id) { return D.CATALOGUE[id].family; });
            if (previous) {
              var shared = Math.min(previous.length, families.length);
              for (var i = 0; i < shared; i++) {
                equal(families[i], previous[i],
                  "[" + profile + "/" + type + "/" + key + "] budget " + budget +
                  " changed primary family at rank " + (i + 1));
              }
            }
            previous = families;
          });
        });
      });
    });
  });

  test("the same brief in a bigger budget only ever adds services", function () {
    ["50to100", "100to300", "over300"].forEach(function (budget) {
      PROFILES.forEach(function (profile) {
        TYPES.forEach(function (type) {
          SITUATION_KEYS.forEach(function (key) {
            var small = planFor(profile, type, "under50", key);
            var large = planFor(profile, type, budget, key);
            assert(large.all.length >= small.all.length,
              "[" + profile + "/" + type + "/" + key + "] " + budget +
              " shows fewer services than under50");
          });
        });
      });
    });
  });

  /* ══ 6. Nothing in the catalogue is dead ════════════════════════════ */

  test("every service that can be a card reaches one somewhere", function () {
    var seen = {};
    everyCase.forEach(function (c) {
      c.result.all.forEach(function (id) { seen[id] = (seen[id] || 0) + 1; });
    });
    var unreachable = Object.keys(D.CATALOGUE).filter(function (id) {
      var role = D.CATALOGUE[id].role;
      return (role === "lead" || role === "support") && !seen[id];
    });
    same(unreachable, [], "services that can never appear");
  });

  test("no single service dominates the way SEO did in the old logic", function () {
    var primaries = {};
    everyCase.forEach(function (c) {
      c.result.primaries.forEach(function (id) {
        primaries[id] = (primaries[id] || 0) + 1;
      });
    });
    var leaders = Object.keys(primaries);
    assert(leaders.length >= 8, "at least eight services should be able to lead a plan");
    var worst = leaders.reduce(function (max, id) {
      return Math.max(max, primaries[id]);
    }, 0);
    assert(worst / everyCase.length < 0.5,
      "one service leads " + Math.round(worst / everyCase.length * 100) +
      "% of plans — the old logic's 63% problem is back");
    assert(primaries["facebook-ads"] > 0, "paid social must be able to lead a plan");
    assert(primaries["local-seo"] > 0, "Local SEO must be able to lead a plan");
  });

  /* ══ 7. Overlays ════════════════════════════════════════════════════ */

  test("delivery overlays appear only where they were agreed", function () {
    everyCase.forEach(function (c) {
      var ids = (c.result.overlays || []).map(function (o) { return o.id; });
      if (c.profile === "agency") {
        assert(ids.indexOf("seo-reseller") !== -1, label(c) + " agency needs white-label delivery");
      } else {
        assert(ids.indexOf("seo-reseller") === -1, label(c) + " offered white-label to a non-agency");
      }
      if (ids.indexOf("outcome-marketing") !== -1) {
        equal(c.budget, "over300", label(c) + " offered Outcome Marketing below 300K");
        assert(["enterprise", "inhouse"].indexOf(c.profile) !== -1,
          label(c) + " offered Outcome Marketing to the wrong persona");
      }
    });
  });

  /* ══ 8. The n8n contract ════════════════════════════════════════════ */

  test("the payload keeps the shape the existing n8n workflow reads", function () {
    var answers = {
      profile: "inhouse", type: "ecommerce", budget: "100to300",
      challenge: ["leads", "website"],
    };
    var result = P.plan(answers);
    var payload = P.buildPayload(
      answers,
      { name: "Somchai", email: "s@example.com", phone: "0812345678", website: "example.com" },
      result, Date.now(), { recaptcha: { token: null } }
    );

    var rec = payload.recommendation;
    /* These five paths are what "Build lead row" maps today. */
    assert(typeof rec.primary.name === "string" && rec.primary.name, "primary.name");
    assert("url" in rec.primary, "primary.url");
    assert(Array.isArray(rec.supporting), "supporting must stay an array");
    assert(Array.isArray(rec.all_ranked), "all_ranked must stay an array");
    assert("budget_tier" in rec, "budget_tier");

    equal(rec.primary.name, names(result.primaries).join(" + "),
      "both primaries are joined the way the persona sheet writes them");
    equal(rec.supporting.length, result.supporting.length, "supporting holds only supporting");

    /* The second challenge has always been published; nothing reads it yet. */
    equal(payload.answers.challenge.id, "leads", "main challenge");
    equal(payload.answers.challenge_2.id, "website", "second challenge");
    equal(payload.version, 3, "payload version");
    equal(rec.logic_version, 5, "logic version");
  });

  /* ══ 9. Bad input ═══════════════════════════════════════════════════ */

  test("an answer we cannot plan from never produces a plan", function () {
    [
      [{}, "nothing answered"],
      [{ profile: "sme" }, "one answer"],
      [{ profile: "sme", type: "local", budget: "under50" }, "no challenge"],
      [{ profile: "sme", type: "local", budget: "under50", challenge: ["unsure"] }, "'not sure' alone"],
      [{ profile: "sme", type: "local", budget: "under50", challenge: ["nonsense"] }, "unknown challenge"],
      [{ profile: "sme", type: "local", budget: "under50", challenge: [] }, "empty challenge"],
    ].forEach(function (item) {
      var result = P.plan(item[0]);
      equal(result.isComplete, false, item[1] + " must not be complete");
      same(result.primaries, [], item[1] + " must recommend nothing");
    });
  });

  test("the order of the two challenges is part of the brief", function () {
    var base = { profile: "sme", type: "mixed", budget: "50to100" };
    var different = 0;
    ["leads", "ranking", "ai", "traffic", "website"].forEach(function (a) {
      ["leads", "ranking", "ai", "traffic", "website"].forEach(function (b) {
        if (a === b) return;
        var forward = P.plan({ profile: base.profile, type: base.type, budget: base.budget, challenge: [a, b] });
        var reverse = P.plan({ profile: base.profile, type: base.type, budget: base.budget, challenge: [b, a] });
        if (JSON.stringify(forward.all) !== JSON.stringify(reverse.all)) different++;
      });
    });
    assert(different >= 10,
      "swapping the two challenges changed only " + different +
      " of 20 plans — order should carry real meaning");
  });

  /* ── Runner ──────────────────────────────────────────────────────────── */

  function run() {
    writeLine("MAM quiz — logic v5 suite", "heading");
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

    var summary = "\nRESULT " + passed + " passed, " + failed + " failed; audited " +
      everyCase.length + " answer combinations across " + Object.keys(D.CATALOGUE).length +
      " services";
    writeLine(summary, failed ? "summary fail" : "summary pass");

    root.MAM_TEST_RESULTS = {
      passed: passed, failed: failed,
      failures: failureLines, combinations: everyCase.length,
    };

    if (root.process && typeof root.process === "object") {
      root.process.exitCode = failed ? 1 : 0;
    } else if (!root.document && failed) {
      throw new Error(summary);
    }
  }

  run();
})(typeof window !== "undefined" ? window : this);
