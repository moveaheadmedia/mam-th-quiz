/* ==========================================================================
   MAM quiz — logic v6 regression suite

   Dependency-free by design. Load after assets/js/data.js and planner.js.
   Runs in a browser, in Node, or in macOS JavaScriptCore (jsc).

   v6 splits the old single "challenge" question into two — an OBJECTIVE (the
   goal) and a CHALLENGE (the problem). The 20 personas below are the v6
   acceptance oracle: 9 reproduce the v5 signed sheet unchanged; 11 were
   re-approved with new (sensible) recommendations when the two-question
   model gave a different answer. If a future change breaks one, it has
   changed a decision the business has agreed, and the build fails.
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
  var OBJECTIVES = Object.keys(D.OBJECTIVE_NEEDS);
  var CHALLENGES = Object.keys(D.CHALLENGE_NEEDS);

  var KNOWN_NEEDS = [
    "paid", "paid2", "organic", "ai", "local", "website", "uiux",
    "conversion", "content", "technical", "authority", "reach",
    "retention", "creative",
  ];

  function planFor(profile, type, budget, objective, challenge) {
    return P.plan({
      profile: profile, type: type, budget: budget,
      objective: objective, challenge: challenge,
    });
  }

  /** Every legal answer combination the UI can produce. */
  var everyCase = [];
  PROFILES.forEach(function (profile) {
    TYPES.forEach(function (type) {
      BUDGETS.forEach(function (budget) {
        OBJECTIVES.forEach(function (objective) {
          CHALLENGES.forEach(function (challenge) {
            everyCase.push({
              profile: profile, type: type, budget: budget,
              objective: objective, challenge: challenge,
              result: planFor(profile, type, budget, objective, challenge),
            });
          });
        });
      });
    });
  });

  function label(c) {
    return "[" + c.profile + "/" + c.type + "/" + c.budget + "/" +
      c.objective + "+" + c.challenge + "]";
  }
  function names(ids) {
    return ids.map(function (id) { return D.CATALOGUE[id].name; });
  }
  function sortedNames(ids) { return names(ids).slice().sort(); }

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
    Object.keys(D.CATALOGUE).forEach(function (id) {
      if (D.CATALOGUE[id].role !== "platform") return;
      assert(platforms.indexOf(id) !== -1, id + " is a platform nothing names");
    });
  });

  /* ══ 2. The objective & challenge menus ═════════════════════════════ */

  test("every menu answer matches a question option and routes to known needs", function () {
    var objectiveOptions = D.QUESTIONS.filter(function (q) { return q.id === "objective"; })[0]
      .options.map(function (o) { return o.id; });
    var challengeOptions = D.QUESTIONS.filter(function (q) { return q.id === "challenge"; })[0]
      .options.map(function (o) { return o.id; });

    same(OBJECTIVES.slice().sort(), objectiveOptions.slice().sort(), "objective keys match options");
    same(CHALLENGES.slice().sort(), challengeOptions.slice().sort(), "challenge keys match options");

    OBJECTIVES.forEach(function (key) {
      D.OBJECTIVE_NEEDS[key].forEach(function (need) {
        assert(KNOWN_NEEDS.indexOf(need) !== -1, "objective " + key + " uses unknown need " + need);
      });
    });
    CHALLENGES.forEach(function (key) {
      D.CHALLENGE_NEEDS[key].forEach(function (need) {
        assert(KNOWN_NEEDS.indexOf(need) !== -1, "challenge " + key + " uses unknown need " + need);
      });
    });
    D.DEFAULT_NEEDS.forEach(function (need) {
      assert(KNOWN_NEEDS.indexOf(need) !== -1, "default mix uses unknown need " + need);
    });
  });

  test("'not sure' on both questions still produces a complete plan", function () {
    everyCase.filter(function (c) {
      return c.objective === "unsure" && c.challenge === "unsure";
    }).forEach(function (c) {
      assert(c.result.isComplete, label(c) + " both-unsure must still plan");
      assert(c.result.primaries.length >= 1, label(c) + " needs at least one primary");
    });
  });

  /* ══ 3. The 20 personas — the acceptance oracle ═════════════════════ */

  /* [ #, profile, type, budget, objective, challenge, primaries, supporting ]
     Recommendations are compared as sets (the two primaries are equal to each
     other). The v6.1 acceptance oracle: 19 reproduce the v6 sheet unchanged;
     persona 3 was re-signed when the goal-driven routing replaced the
     auto-added Local SEO with the ranking fix the client actually asked for. */
  var PERSONAS = [
    [1,  "sme","local","under50","leads","ai",                    ["Facebook Ads"],                        ["AI SEO"]],
    [2,  "sme","local","under50","leads","ranking",               ["Google Ads Campaigns"],                ["SEO Campaigns"]],
    [3,  "sme","local","under50","google-visibility","ranking",   ["SEO Campaigns"],                       ["SEO Audit"]],
    [4,  "sme","ecommerce","under50","leads","ranking",           ["Google Ads Campaigns"],                ["E-commerce SEO"]],
    [5,  "sme","ecommerce","50to100","leads","website",           ["Facebook Ads","Web Design"],           ["Conversion Rate Optimisation (CRO)"]],
    [6,  "inhouse","ecommerce","50to100","sales","ranking",       ["Google Shopping","E-commerce SEO"],    ["Facebook Ads"]],
    [7,  "inhouse","national","50to100","ai-visibility","ranking",["AI SEO","SEO Campaigns"],              ["Content Marketing"]],
    [8,  "inhouse","national","100to300","leads","ai",            ["Google Ads Campaigns","AI SEO"],       ["Content Marketing","SEO Campaigns"]],
    [9,  "inhouse","ecommerce","100to300","leads","website",      ["Google Shopping","Web Design"],        ["Conversion Rate Optimisation (CRO)","Facebook Ads"]],
    [10, "enterprise","enterprise","100to300","ai-visibility","ranking",["AI SEO","SEO Campaigns"],        ["Content Marketing","Technical SEO"]],
    [11, "enterprise","enterprise","over300","leads","brand",     ["Google Ads Campaigns","Facebook Ads"], ["Programmatic Ads","Conversion Rate Optimisation (CRO)"]],
    [12, "enterprise","national","over300","google-visibility","ai",["SEO Campaigns","AI SEO"],            ["Content Marketing","Technical SEO"]],
    [13, "enterprise","ecommerce","over300","leads","website",    ["Google Shopping","Web Design"],        ["Conversion Rate Optimisation (CRO)","Facebook Ads"]],
    [14, "agency","mixed","50to100","google-visibility","ranking",["SEO Campaigns","AI SEO"],              ["Link Building"]],
    [15, "agency","enterprise","100to300","google-visibility","ai",["SEO Campaigns","AI SEO"],             ["Link Building","Content Marketing"]],
    [16, "sme","mixed","under50","leads","website",               ["Facebook Ads"],                        ["Web Design"]],
    [17, "inhouse","mixed","50to100","google-visibility","website",["Web Design","SEO Campaigns"],         ["Conversion Rate Optimisation (CRO)"]],
    [18, "enterprise","enterprise","over300","leads","website",   ["Google Ads Campaigns","Web Design"],   ["Conversion Rate Optimisation (CRO)","Facebook Ads"]],
    [19, "sme","local","under50","leads","unsure",                ["Facebook Ads"],                        ["Heat Maps"]],
    [20, "enterprise","mixed","over300","leads","unsure",         ["Google Ads Campaigns","Facebook Ads"], ["Conversion Rate Optimisation (CRO)","Technical SEO"]],
  ];

  test("all 20 personas produce exactly the agreed v6 plan", function () {
    PERSONAS.forEach(function (p) {
      var result = P.plan({
        profile: p[1], type: p[2], budget: p[3], objective: p[4], challenge: p[5],
      });
      var tag = "persona " + p[0];
      assert(result.isComplete, tag + " must produce a complete plan");
      /* Both primaries are equal to each other, so compare as a set. */
      same(sortedNames(result.primaries), p[6].slice().sort(), tag + " primaries");
      same(sortedNames(result.supporting), p[7].slice().sort(), tag + " supporting");
    });
  });

  /* ══ 4. The guardrails, across every combination ════════════════════ */

  test("support services never lead, except CRO for a conversions goal", function () {
    /* UI/UX, Technical SEO, Content Marketing and Link Building can never be
       primary. CRO is the one v6.1 exception: it may head a plan, but only when
       the GOAL is "Improve website conversions". The "traffic but no sales"
       challenge adds CRO as support, not as a headline. */
    var NEVER_PRIMARY = ["ui-ux", "technical-seo", "content-marketing", "link-building"];
    everyCase.forEach(function (c) {
      c.result.primaries.forEach(function (id) {
        assert(NEVER_PRIMARY.indexOf(id) === -1,
          label(c) + " made support-only service " + id + " primary");
        if (id === "cro") {
          equal(c.objective, "conversions",
            label(c) + " let CRO lead outside a conversions goal");
        } else {
          equal(D.CATALOGUE[id].role, "lead", label(c) + " made non-lead " + id + " primary");
        }
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

  test("every plan fills its budget's total card count, with no repeats", function () {
    /* v6.1 — budget fixes the TOTAL number of cards; the brief decides how many
       of them are mains. So the main/support split flexes (a single-lead brief
       shows 1 main + more support), but the total is always filled exactly, the
       main count never exceeds the budget's cap, and every plan has a main. */
    everyCase.forEach(function (c) {
      var r = c.result;
      assert(r.isComplete, label(c) + " should be complete");
      var quota = D.BUDGET_PLAN[c.budget];
      var total = quota.primary + quota.supporting;
      assert(r.primaries.length >= 1, label(c) + " has no main service");
      assert(r.primaries.length <= quota.primary,
        label(c) + " has more mains than the budget allows");
      equal(r.primaries.length + r.supporting.length, total,
        label(c) + " total card count");
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
    var ordered = ["under50", "50to100", "100to300", "over300"];
    PROFILES.forEach(function (profile) {
      TYPES.forEach(function (type) {
        OBJECTIVES.forEach(function (objective) {
          CHALLENGES.forEach(function (challenge) {
            var previous = null;
            ordered.forEach(function (budget) {
              var families = planFor(profile, type, budget, objective, challenge).primaries
                .map(function (id) { return D.CATALOGUE[id].family; });
              if (previous) {
                var shared = Math.min(previous.length, families.length);
                for (var i = 0; i < shared; i++) {
                  equal(families[i], previous[i],
                    "[" + profile + "/" + type + "/" + objective + "+" + challenge +
                    "] budget " + budget + " changed primary family at rank " + (i + 1));
                }
              }
              previous = families;
            });
          });
        });
      });
    });
  });

  test("the same answers in a bigger budget only ever add services", function () {
    ["50to100", "100to300", "over300"].forEach(function (budget) {
      PROFILES.forEach(function (profile) {
        TYPES.forEach(function (type) {
          OBJECTIVES.forEach(function (objective) {
            CHALLENGES.forEach(function (challenge) {
              var small = planFor(profile, type, "under50", objective, challenge);
              var large = planFor(profile, type, budget, objective, challenge);
              assert(large.all.length >= small.all.length,
                "[" + profile + "/" + type + "/" + objective + "+" + challenge + "] " +
                budget + " shows fewer services than under50");
            });
          });
        });
      });
    });
  });

  /* ══ 6. Nothing in the catalogue is dead ════════════════════════════ */

  /* Services the quiz deliberately never recommends. Nothing in the answers
     can honestly point to them, so offering one would be a guess dressed up
     as advice. Video SEO (no way to know a client has video) and Email
     Marketing (no menu points to retention) stay in the catalogue with full
     copy and a link, and can be raised in the consultation. */
  var NEVER_RECOMMENDED = ["video-seo", "email-marketing"];

  test("every service is either recommendable or knowingly held back", function () {
    var onACard = {};
    var offered = {};
    everyCase.forEach(function (c) {
      c.result.all.forEach(function (id) { onACard[id] = true; });
      (c.result.alsoRelevant || []).forEach(function (id) { offered[id] = true; });
    });

    var invisible = Object.keys(D.CATALOGUE).filter(function (id) {
      if (D.CATALOGUE[id].role === "overlay") return false;
      if (NEVER_RECOMMENDED.indexOf(id) !== -1) return false;
      return !onACard[id] && !offered[id];
    });
    same(invisible, [], "services a visitor could never see");

    NEVER_RECOMMENDED.forEach(function (id) {
      assert(D.CATALOGUE[id], "unknown service on the held-back list: " + id);
      assert(!onACard[id], id + " is on the held-back list but reaches a card");
    });
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
      objective: "leads", challenge: "website",
    };
    var result = P.plan(answers);
    var payload = P.buildPayload(
      answers,
      { name: "Somchai", email: "s@example.com", phone: "0812345678", website: "example.com" },
      result, Date.now(), { recaptcha: { token: null } }
    );

    var rec = payload.recommendation;
    assert(typeof rec.primary.name === "string" && rec.primary.name, "primary.name");
    assert("url" in rec.primary, "primary.url");
    assert(Array.isArray(rec.supporting), "supporting must stay an array");
    assert(Array.isArray(rec.all_ranked), "all_ranked must stay an array");
    assert("budget_tier" in rec, "budget_tier");

    equal(rec.primary.name, names(result.primaries).join(" + "),
      "both primaries are joined the way the sheet writes them");
    equal(rec.supporting.length, result.supporting.length, "supporting holds only supporting");

    /* v6 publishes both answers — objective and the single challenge. */
    equal(payload.answers.objective.id, "leads", "objective answer");
    equal(payload.answers.challenge.id, "website", "challenge answer");
    equal(rec.objective, "leads", "recommendation objective");
    equal(rec.challenge, "website", "recommendation challenge");
    equal(payload.version, 4, "payload version");
    equal(rec.logic_version, 6, "logic version");
  });

  /* ══ 9. Bad input ═══════════════════════════════════════════════════ */

  test("an answer we cannot plan from never produces a plan", function () {
    [
      [{}, "nothing answered"],
      [{ profile: "sme" }, "one answer"],
      [{ profile: "sme", type: "local", budget: "under50" }, "no objective or challenge"],
      [{ profile: "sme", type: "local", budget: "under50", objective: "leads" }, "no challenge"],
      [{ profile: "sme", type: "local", budget: "under50", challenge: "ranking" }, "no objective"],
      [{ profile: "sme", type: "local", budget: "under50", objective: "nonsense", challenge: "ranking" }, "unknown objective"],
      [{ profile: "sme", type: "local", budget: "under50", objective: "leads", challenge: "nonsense" }, "unknown challenge"],
    ].forEach(function (item) {
      var result = P.plan(item[0]);
      equal(result.isComplete, false, item[1] + " must not be complete");
      same(result.primaries, [], item[1] + " must recommend nothing");
    });
  });

  test("the objective sets direction and the challenge changes the plan", function () {
    /* Swapping the challenge under a fixed objective should change the plan
       often — the two answers carry independent meaning. */
    var base = { profile: "inhouse", type: "mixed", budget: "100to300", objective: "leads" };
    var plans = CHALLENGES.map(function (challenge) {
      return JSON.stringify(P.plan({
        profile: base.profile, type: base.type, budget: base.budget,
        objective: base.objective, challenge: challenge,
      }).all);
    });
    var distinct = {};
    plans.forEach(function (p) { distinct[p] = true; });
    assert(Object.keys(distinct).length >= 4,
      "changing the challenge under one goal produced only " +
      Object.keys(distinct).length + " distinct plans");
  });

  /* ── Runner ──────────────────────────────────────────────────────────── */

  function run() {
    writeLine("MAM quiz — logic v6 suite", "heading");
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
