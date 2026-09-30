/* ==========================================================================
   MAM quiz — logic v7 regression suite

   Dependency-free by design. Load after assets/js/data.js and planner.js.
   Runs in a browser, in Node, or in macOS JavaScriptCore (jsc).

   v6 split the old single "challenge" question into two — an OBJECTIVE (the
   goal) and a CHALLENGE (the problem). v7 applies the reviewer's Goal +
   Challenge tables (see QUIZ-LOGIC.md). The 20 personas below are the
   acceptance oracle; if a future change breaks one, it has changed a
   decision the business has agreed, and the build fails.
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
    "paid", "paid2", "organic", "ai", "local", "gbp", "website", "uiux",
    "conversion", "content", "technical", "authority", "reach", "brandreach",
    "retention", "creative",
  ];

  /* v7 — a menu may also name an exact service by its catalogue id. */
  function knownNeed(need) {
    return KNOWN_NEEDS.indexOf(need) !== -1 || !!D.CATALOGUE[need];
  }

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

  test("the catalogue holds the 35 services + 2 quiz cards, with everything a card needs", function () {
    var ids = Object.keys(D.CATALOGUE);
    equal(ids.length, 37, "service count");

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

    /* v7: + Free Strategy Consultation (lead), + SEO & AI Visibility Audit
       (support), and TikTok Ads moved from platform to support. */
    same(roles, { lead: 12, support: 19, platform: 4, overlay: 2 }, "role split");
    equal(Object.keys(D.SERVICE_URLS).length, 37, "URL slots");
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
        assert(knownNeed(need), "objective " + key + " uses unknown need " + need);
      });
      (D.OBJECTIVE_MAINS[key] || []).forEach(function (need) {
        assert(D.OBJECTIVE_NEEDS[key].indexOf(need) !== -1,
          "objective " + key + " lets " + need + " lead but never asks for it");
      });
    });
    CHALLENGES.forEach(function (key) {
      D.CHALLENGE_NEEDS[key].forEach(function (need) {
        assert(knownNeed(need), "challenge " + key + " uses unknown need " + need);
      });
    });
    D.DEFAULT_NEEDS.forEach(function (need) {
      assert(knownNeed(need), "default mix uses unknown need " + need);
    });
    Object.keys(D.OBJECTIVE_ALIASES).forEach(function (old) {
      assert(D.OBJECTIVE_NEEDS[D.OBJECTIVE_ALIASES[old]], "alias " + old + " points nowhere");
    });
  });

  test("'not sure' on both questions recommends a Free Strategy Consultation", function () {
    /* v7 — no goal and no problem is "no clear match": the consultation leads
       and the SEO & AI Visibility Audit supports it, at every budget. */
    everyCase.filter(function (c) {
      return c.objective === "unsure" && c.challenge === "unsure";
    }).forEach(function (c) {
      assert(c.result.isComplete, label(c) + " both-unsure must still plan");
      same(c.result.primaries, ["strategy-consultation"], label(c) + " primary");
      same(c.result.supporting, ["seo-ai-visibility-audit"], label(c) + " supporting");
      assert(c.result.consultation, label(c) + " should be flagged as a consultation plan");
    });
    everyCase.forEach(function (c) {
      if (c.objective === "unsure" && c.challenge === "unsure") return;
      assert(c.result.all.indexOf("strategy-consultation") === -1,
        label(c) + " recommended the consultation card with a real goal or problem");
    });
  });

  test("an answer saved under a pre-v7 goal id still plans", function () {
    ["google-visibility", "ai-visibility"].forEach(function (old) {
      var result = P.plan({
        profile: "sme", type: "local", budget: "under50", objective: old, challenge: "ranking",
      });
      assert(result.isComplete, old + " should map onto the merged goal");
      equal(result.objective, "search-visibility", old + " maps to");
    });
  });

  /* ══ 3. The 20 personas — the acceptance oracle ═════════════════════ */

  /* [ #, profile, type, budget, objective, challenge, primaries, supporting ]
     Recommendations are compared as sets (the two primaries are equal to each
     other). The v7 oracle: 6 reproduce the v6.1 plan unchanged (1, 2, 8, 14,
     15, 16 — 14 and 15 now use the merged goal id); 14 were re-signed by the
     reviewer's tables, each marked with the rule that changed it:
       Google + AI goal .... 3, 7, 10, 12, 17   (AI SEO first; Audit support)
       goal decides SEO .... 4                  (SEO Campaigns unless "sales")
       sales goal .......... 6                  (CPAS replaces Facebook Ads)
       website challenge ... 5, 9, 13, 18       (UI/UX before CRO)
       brand challenge ..... 11                 (TikTok is the reach card)
       not-sure challenge .. 19, 20             (SEO & AI Visibility Audit) */
  var PERSONAS = [
    [1,  "sme","local","under50","leads","ai",                    ["Facebook Ads"],                        ["AI SEO"]],
    [2,  "sme","local","under50","leads","ranking",               ["Google Ads Campaigns"],                ["SEO Campaigns"]],
    [3,  "sme","local","under50","search-visibility","ranking",   ["AI SEO"],                              ["SEO Campaigns"]],
    [4,  "sme","ecommerce","under50","leads","ranking",           ["Google Ads Campaigns"],                ["SEO Campaigns"]],
    [5,  "sme","ecommerce","50to100","leads","website",           ["Facebook Ads","Web Design"],           ["UI/UX"]],
    [6,  "inhouse","ecommerce","50to100","sales","ranking",       ["Google Shopping","E-commerce SEO"],    ["CPAS Ads"]],
    [7,  "inhouse","national","50to100","search-visibility","ranking",["AI SEO","SEO Campaigns"],          ["SEO & AI Visibility Audit"]],
    [8,  "inhouse","national","100to300","leads","ai",            ["Google Ads Campaigns","AI SEO"],       ["Content Marketing","SEO Campaigns"]],
    [9,  "inhouse","ecommerce","100to300","leads","website",      ["Google Shopping","Web Design"],        ["UI/UX","Conversion Rate Optimisation (CRO)"]],
    [10, "enterprise","enterprise","100to300","search-visibility","ranking",["AI SEO","SEO Campaigns"],    ["SEO & AI Visibility Audit","Content Marketing"]],
    [11, "enterprise","enterprise","over300","leads","brand",     ["Google Ads Campaigns","Facebook Ads"], ["TikTok Ads","Conversion Rate Optimisation (CRO)"]],
    [12, "enterprise","national","over300","search-visibility","ai",["AI SEO","SEO Campaigns"],            ["Content Marketing","SEO & AI Visibility Audit"]],
    [13, "enterprise","ecommerce","over300","leads","website",    ["Google Shopping","Web Design"],        ["UI/UX","Conversion Rate Optimisation (CRO)"]],
    [14, "agency","mixed","50to100","search-visibility","ranking",["AI SEO","SEO Campaigns"],              ["Link Building"]],
    [15, "agency","enterprise","100to300","search-visibility","ai",["AI SEO","SEO Campaigns"],             ["Link Building","Content Marketing"]],
    [16, "sme","mixed","under50","leads","website",               ["Facebook Ads"],                        ["Web Design"]],
    [17, "inhouse","mixed","50to100","search-visibility","website",["AI SEO","Web Design"],                ["UI/UX"]],
    [18, "enterprise","enterprise","over300","leads","website",   ["Google Ads Campaigns","Web Design"],   ["UI/UX","Conversion Rate Optimisation (CRO)"]],
    [19, "sme","local","under50","leads","unsure",                ["Facebook Ads"],                        ["SEO & AI Visibility Audit"]],
    [20, "enterprise","mixed","over300","leads","unsure",         ["Google Ads Campaigns","Facebook Ads"], ["SEO & AI Visibility Audit","Conversion Rate Optimisation (CRO)"]],
  ];

  test("all 20 personas produce exactly the agreed v7 plan", function () {
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

  test("support services never lead, except CRO and Google Business Profile on their own goal", function () {
    /* UI/UX, Technical SEO, Content Marketing and Link Building can never be
       primary. Two scoped exceptions: CRO may head a plan only when the GOAL
       is "Improve website conversions" (the "traffic but no sales" challenge
       adds CRO as support, not as a headline), and v7 lets Google Business
       Profile head a plan only when the GOAL is "Get found by nearby / local
       customers". */
    var NEVER_PRIMARY = ["ui-ux", "technical-seo", "content-marketing", "link-building"];
    var EXCEPTION_GOAL = { cro: "conversions", "google-business-profile": "local-visibility" };
    everyCase.forEach(function (c) {
      c.result.primaries.forEach(function (id) {
        assert(NEVER_PRIMARY.indexOf(id) === -1,
          label(c) + " made support-only service " + id + " primary");
        if (EXCEPTION_GOAL[id]) {
          equal(c.objective, EXCEPTION_GOAL[id],
            label(c) + " let " + id + " lead outside its own goal");
        } else {
          equal(D.CATALOGUE[id].role, "lead", label(c) + " made non-lead " + id + " primary");
        }
      });
    });
  });

  test("two primaries are never from the same family, bar the local-goal pair", function () {
    /* v7 — the one exception: Google Business Profile + Local SEO on the local
       goal, the reviewer's first two priorities there. */
    everyCase.forEach(function (c) {
      if (c.result.primaries.length < 2) return;
      var a = D.CATALOGUE[c.result.primaries[0]].family;
      var b = D.CATALOGUE[c.result.primaries[1]].family;
      if (a === "seo-local" && b === "seo-local" && c.objective === "local-visibility") return;
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
      /* v7 — a consultation plan is two cards at every budget: we do not yet
         know what a bigger budget should buy. */
      var total = r.consultation ? 2 : quota.primary + quota.supporting;
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
     copy and a link, and can be raised in the consultation. v7 — Keyword
     Mapping joins them: the reviewer's ranking fixes are SEO Audit, On-page
     SEO and Technical SEO. */
  var NEVER_RECOMMENDED = ["video-seo", "email-marketing", "keyword-mapping"];

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
      assert(!offered[id], id + " is on the held-back list but is still offered");
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
    equal(rec.logic_version, 7, "logic version");
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

  /* ══ 10. The reviewer's v7 decisions, across every combination ═══════ */

  test("CRO always comes before Heat Maps, at every budget", function () {
    everyCase.forEach(function (c) {
      var at = c.result.all.indexOf("heat-maps");
      if (at === -1) return;
      var cro = c.result.all.indexOf("cro");
      assert(cro !== -1 && cro < at, label(c) + " showed Heat Maps without CRO ahead of it");
    });
  });

  test("the goal decides which SEO: E-commerce SEO only for online sales, never both", function () {
    everyCase.forEach(function (c) {
      var all = c.result.all.concat(c.result.alsoRelevant || []);
      if (all.indexOf("ecommerce-seo") !== -1) {
        equal(c.objective, "sales", label(c) + " offered E-commerce SEO outside the sales goal");
      }
      assert(!(c.result.all.indexOf("ecommerce-seo") !== -1 && c.result.all.indexOf("seo-campaigns") !== -1),
        label(c) + " carried both SEO cards");
    });
  });

  test("each reworked goal leads with the reviewer's first service", function () {
    var LEADS_WITH = {
      sales: "google-shopping",
      "search-visibility": "ai-seo",
      "local-visibility": "google-business-profile",
    };
    everyCase.forEach(function (c) {
      var first = LEADS_WITH[c.objective];
      if (!first) return;
      /* An agency buys fulfilment, not a catchment area — no Google Business
         Profile for it, the same rule as Local SEO. */
      if (first === "google-business-profile" && c.profile === "agency") return;
      equal(c.result.primaries[0], first, label(c) + " headline");
    });
  });

  test("the sales goal puts CPAS in place of Facebook Ads", function () {
    /* The brand challenge asks for Facebook Ads by name, so it is the one
       exception. A challenge's own fix may take CPAS's slot on a small budget
       (goal + challenge are read together), but Facebook Ads never does. */
    everyCase.forEach(function (c) {
      if (c.objective !== "sales" || c.challenge === "brand") return;
      assert(c.result.all.indexOf("facebook-ads") === -1,
        label(c) + " gave the sales goal Facebook Ads instead of CPAS");
    });
    ["under50", "50to100", "100to300", "over300"].forEach(function (budget) {
      var result = planFor("inhouse", "ecommerce", budget, "sales", "ranking");
      assert(budget === "under50" || result.primaries.indexOf("cpas-ads") !== -1 ||
        result.supporting.indexOf("cpas-ads") !== -1, budget + " sales + ranking should carry CPAS");
    });
  });

  test("on the ads challenge the first paid card is framed as fixing the campaigns", function () {
    everyCase.forEach(function (c) {
      if (c.challenge !== "ads") return;
      var paid = c.result.all.filter(function (id) {
        var family = D.CATALOGUE[id].family;
        return family === "paid-search" || family === "paid-social";
      })[0];
      if (!paid) return;
      assert(/campaigns need fixing/.test(P.reasonFor(c.result, paid)),
        label(c) + " " + paid + " should explain it fixes the current campaigns");
    });
  });

  test("the website challenge puts UI/UX before CRO", function () {
    everyCase.forEach(function (c) {
      if (c.challenge !== "website") return;
      var uiux = c.result.all.indexOf("ui-ux");
      var cro = c.result.all.indexOf("cro");
      if (uiux === -1 || cro === -1 || c.objective === "conversions") return;
      assert(uiux < cro, label(c) + " put CRO ahead of UI/UX");
    });
  });

  test("the brand challenge names every reach channel the reviewer listed", function () {
    /* The brand fix takes ONE reach card; the others lead "Also often
       relevant". (A goal that asks for reach itself — traffic, awareness — or
       a spare budget slot may still add another reach channel.) */
    var REACH = ["tiktok-ads", "youtube-ads", "programmatic-ads"];
    everyCase.forEach(function (c) {
      if (c.challenge !== "brand") return;
      var fromFix = c.result.trace.filter(function (t) {
        return t.need === "brandreach" && (t.outcome === "primary" || t.outcome === "supporting");
      });
      assert(fromFix.length <= 1, label(c) + " gave the brand fix more than one reach card");
      REACH.forEach(function (id) {
        assert(c.result.all.indexOf(id) !== -1 || (c.result.alsoRelevant || []).indexOf(id) !== -1,
          label(c) + " never named " + id);
      });
    });
  });

  /* ── Runner ──────────────────────────────────────────────────────────── */

  function run() {
    writeLine("MAM quiz — logic v7 suite", "heading");
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
