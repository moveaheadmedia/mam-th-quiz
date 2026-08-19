/* ========================================================================
   MAM quiz v2 regression suite

   Dependency-free by design. Load after assets/js/data.js and engine.js.
   It runs in a browser or macOS JavaScriptCore (jsc).
   ======================================================================== */
(function (root) {
  "use strict";

  var D = root.MAM_DATA;
  var E = root.MAM_ENGINE;
  var tests = [];
  var passed = 0;
  var failed = 0;
  var failureLines = [];

  function writeLine(message, className) {
    if (typeof print === "function") {
      print(message);
    } else if (root.console && root.console.log) {
      root.console.log(message);
    }

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

  function stableValue(value) {
    if (Array.isArray(value)) {
      return value.map(stableValue);
    }
    if (value && typeof value === "object") {
      var sorted = {};
      Object.keys(value)
        .sort()
        .forEach(function (key) {
          sorted[key] = stableValue(value[key]);
        });
      return sorted;
    }
    return value;
  }

  function inspect(value) {
    return JSON.stringify(stableValue(value));
  }

  function fail(message) {
    throw new Error(message);
  }

  function assert(condition, message) {
    if (!condition) fail(message || "Assertion failed");
  }

  function equal(actual, expected, message) {
    if (actual !== expected) {
      fail(
        (message ? message + ": " : "") +
          "expected " +
          inspect(expected) +
          ", got " +
          inspect(actual),
      );
    }
  }

  function deepEqual(actual, expected, message) {
    var actualText = inspect(actual);
    var expectedText = inspect(expected);
    if (actualText !== expectedText) {
      fail(
        (message ? message + ": " : "") +
          "expected " +
          expectedText +
          ", got " +
          actualText,
      );
    }
  }

  function test(name, fn) {
    tests.push({ name: name, fn: fn });
  }

  function question(id) {
    for (var i = 0; i < D.QUESTIONS.length; i++) {
      if (D.QUESTIONS[i].id === id) return D.QUESTIONS[i];
    }
    return null;
  }

  function optionIds(questionId) {
    return question(questionId).options.map(function (option) {
      return option.id;
    });
  }

  function answers(profile, type, budget, challenge) {
    return {
      profile: profile,
      type: type,
      budget: budget,
      challenge: challenge,
    };
  }

  function caseLabel(answerSet) {
    return [
      answerSet.profile,
      answerSet.type,
      answerSet.budget,
      answerSet.challenge,
    ].join("/");
  }

  function topThree(result) {
    return [result.primary].concat(result.supporting);
  }

  function countBy(items) {
    var counts = {};
    items.forEach(function (item) {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }

  function unique(items) {
    var seen = {};
    return items.filter(function (item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function allCases() {
    var combinations = [];
    optionIds("profile").forEach(function (profile) {
      optionIds("type").forEach(function (type) {
        optionIds("budget").forEach(function (budget) {
          optionIds("challenge").forEach(function (challenge) {
            var answerSet = answers(profile, type, budget, challenge);
            combinations.push({
              answers: answerSet,
              result: E.score(answerSet),
            });
          });
        });
      });
    });
    return combinations;
  }

  function strongest(ids, scores) {
    return ids.slice().sort(function (a, b) {
      if ((scores[b] || 0) !== (scores[a] || 0)) {
        return (scores[b] || 0) - (scores[a] || 0);
      }
      return D.PRIORITY.indexOf(a) - D.PRIORITY.indexOf(b);
    })[0];
  }

  /* Eligibility restated from the business rules, independently of engine.js,
     so a change of heart in the engine has to be a deliberate change here too. */
  function eligible(serviceId, answerSet) {
    var challenge = answerSet.challenge;
    var type = answerSet.type;
    var budget = answerSet.budget;

    if (serviceId === "local-seo") {
      return (
        (type === "local" || type === "mixed") &&
        ["ranking", "ai", "unsure"].indexOf(challenge) !== -1
      );
    }
    if (serviceId === "web-dev" || serviceId === "uxui") {
      return challenge === "website";
    }
    if (serviceId === "content") {
      return (
        ["ranking", "ai", "traffic"].indexOf(challenge) !== -1 ||
        (challenge === "leads" &&
          ["100to300", "over300"].indexOf(budget) !== -1)
      );
    }
    if (serviceId === "cro") {
      return (
        type === "ecommerce" ||
        type === "mixed" ||
        challenge === "website" ||
        (["leads", "traffic"].indexOf(challenge) !== -1 &&
          ["100to300", "over300"].indexOf(budget) !== -1)
      );
    }
    if (serviceId === "programmatic") {
      return (
        ["100to300", "over300"].indexOf(budget) !== -1 &&
        ["national", "enterprise", "mixed"].indexOf(type) !== -1 &&
        ["leads", "traffic"].indexOf(challenge) !== -1
      );
    }
    if (serviceId === "consult") return challenge === "unsure";
    if (serviceId === "reseller" || serviceId === "outcome") return false;
    return true;
  }

  /* Additive scoring rebuilt from the raw data, so the oracle below never
     borrows the engine's own arithmetic. */
  function recomputeScores(answerSet) {
    var scores = {};
    function add(serviceId, points) {
      scores[serviceId] = (scores[serviceId] || 0) + points;
    }
    D.QUESTIONS.forEach(function (q) {
      var option = null;
      q.options.forEach(function (o) {
        if (o.id === answerSet[q.id]) option = o;
      });
      if (!option) return;
      Object.keys(option.weights || {}).forEach(function (serviceId) {
        add(serviceId, option.weights[serviceId]);
      });
    });
    (D.INTERACTION_RULES || []).forEach(function (rule) {
      var matches = Object.keys(rule.when || {}).every(function (key) {
        return answerSet[key] === rule.when[key];
      });
      if (matches && rule.any) {
        matches = rule.any.some(function (condition) {
          return Object.keys(condition).every(function (key) {
            return answerSet[key] === condition[key];
          });
        });
      }
      if (!matches) return;
      Object.keys(rule.weights).forEach(function (serviceId) {
        add(serviceId, rule.weights[serviceId]);
      });
    });
    return scores;
  }

  /* The oracle in one sentence: the three cards are the three highest-scoring
     eligible services, in that order. No pools, no bundles, no per-challenge
     reordering — if the business logic wants a different answer, the weights
     have to say so. */
  function expectedTopThree(answerSet) {
    var scores = recomputeScores(answerSet);
    var ranked = Object.keys(scores)
      .filter(function (serviceId) {
        return (
          scores[serviceId] > 0 &&
          D.SERVICES[serviceId] &&
          eligible(serviceId, answerSet)
        );
      })
      .sort(function (a, b) {
        if (scores[b] !== scores[a]) return scores[b] - scores[a];
        return D.PRIORITY.indexOf(a) - D.PRIORITY.indexOf(b);
      });
    var primary = ranked[0];
    var supporting = ranked
      .filter(function (serviceId) {
        return (
          serviceId !== primary && D.PRIMARY_ONLY.indexOf(serviceId) === -1
        );
      })
      .slice(0, 2);
    return [primary].concat(supporting);
  }

  function assertScoreSubset(result, expected, label) {
    Object.keys(expected).forEach(function (serviceId) {
      equal(
        result.scores[serviceId],
        expected[serviceId],
        label + " score for " + serviceId,
      );
    });
  }

  function expectedAppliedRuleIds(answerSet) {
    var ids = [];
    if (answerSet.type === "local" && answerSet.challenge === "leads") {
      ids.push("local-lead-generation");
    }
    if (
      answerSet.budget === "over300" &&
      answerSet.challenge === "leads" &&
      (answerSet.type === "national" || answerSet.type === "enterprise")
    ) {
      ids.push("scaled-demand-generation");
    }
    if (answerSet.type === "local" && answerSet.challenge === "ranking") {
      ids.push("local-search-ranking");
    }
    if (answerSet.type === "ecommerce" && answerSet.challenge === "traffic") {
      ids.push("ecommerce-traffic-efficiency");
    }
    if (
      answerSet.budget === "over300" &&
      answerSet.challenge === "traffic" &&
      (answerSet.type === "national" || answerSet.type === "enterprise")
    ) {
      ids.push("scaled-reach");
    }
    if (
      answerSet.challenge === "ai" &&
      (answerSet.profile === "enterprise" || answerSet.type === "enterprise")
    ) {
      ids.push("enterprise-ai-content");
    }
    return ids;
  }

  function expectedPhases(answerSet, result) {
    var recommendations = topThree(result);
    if (answerSet.budget === "under50") {
      return [
        { id: "now", serviceIds: [result.primary] },
        { id: "roadmap", serviceIds: result.supporting.slice() },
      ];
    }
    if (
      answerSet.budget === "50to100" ||
      answerSet.budget === "100to300"
    ) {
      return [
        { id: "now", serviceIds: recommendations.slice(0, 2) },
        { id: "next", serviceIds: recommendations.slice(2) },
      ];
    }
    if (answerSet.budget === "over300") {
      return [{ id: "now", serviceIds: recommendations }];
    }
    return [
      { id: "discovery", serviceIds: ["consult"] },
      {
        id: "explore",
        serviceIds: recommendations.filter(function (serviceId) {
          return serviceId !== "consult";
        }),
      },
    ];
  }

  function phaseEssentials(phases) {
    return phases.map(function (phase) {
      return { id: phase.id, serviceIds: phase.serviceIds };
    });
  }

  var combinations;

  test("data exposes the agreed 4 x 5 x 5 x 6 answer space", function () {
    assert(D && E, "MAM_DATA and MAM_ENGINE must be loaded first");
    deepEqual(
      D.QUESTIONS.map(function (item) {
        return item.id;
      }),
      ["profile", "type", "budget", "challenge"],
      "question IDs",
    );
    deepEqual(
      D.QUESTIONS.map(function (item) {
        return item.options.length;
      }),
      [4, 5, 5, 6],
      "option counts",
    );
    D.QUESTIONS.forEach(function (item) {
      assert(
        !item.weightMultiplier || item.weightMultiplier === 1,
        item.id + " must not have a hidden multiplier in v2",
      );
      equal(unique(optionIds(item.id)).length, item.options.length, item.id + " option IDs must be unique");
    });
  });

  test("all configured weight targets are valid", function () {
    D.QUESTIONS.forEach(function (item) {
      item.options.forEach(function (option) {
        Object.keys(option.weights).forEach(function (serviceId) {
          assert(D.SERVICES[serviceId], item.id + "/" + option.id + " has unknown service " + serviceId);
          assert(
            typeof option.weights[serviceId] === "number" &&
              isFinite(option.weights[serviceId]),
            item.id + "/" + option.id + "/" + serviceId + " must be finite",
          );
        });
      });
    });
    assert(
      !D.PRIMARY_POOLS,
      "primary pools must not come back — rank order is the recommendation",
    );
    /* Budget may shift emphasis, but never uniformly: a service that gains the
       same points at every tier is riding the budget answer rather than earning
       its place, which is what put Local SEO into small-budget lead plans. */
    var tiers = question("budget").options.filter(function (option) {
      return Object.keys(option.weights || {}).length > 0;
    });
    Object.keys(D.SERVICES).forEach(function (serviceId) {
      var awarded = tiers.map(function (option) {
        return (option.weights || {})[serviceId] || 0;
      });
      var everywhere = awarded.every(function (points) {
        return points > 0;
      });
      if (!everywhere) return;
      assert(
        unique(awarded).length > 1,
        "budget awards " + serviceId + " the same points at every tier",
      );
    });
    deepEqual(Object.keys(D.SCORE_GROUPS || {}), [], "v2 must not retain an AI-SEO shadow score");
  });

  test("interaction rules are complete, uniquely named and valid", function () {
    deepEqual(
      D.INTERACTION_RULES.map(function (rule) {
        return rule.id;
      }),
      [
        "local-lead-generation",
        "scaled-demand-generation",
        "local-search-ranking",
        "ecommerce-traffic-efficiency",
        "scaled-reach",
        "enterprise-ai-content",
      ],
      "interaction IDs",
    );
    equal(
      unique(
        D.INTERACTION_RULES.map(function (rule) {
          return rule.id;
        }),
      ).length,
      D.INTERACTION_RULES.length,
      "interaction IDs must be unique",
    );
    D.INTERACTION_RULES.forEach(function (rule) {
      Object.keys(rule.weights).forEach(function (serviceId) {
        assert(D.SERVICES[serviceId], rule.id + " has unknown service " + serviceId);
        assert(typeof rule.weights[serviceId] === "number" && isFinite(rule.weights[serviceId]), rule.id + " has a non-finite weight");
      });
    });
  });

  test("the worked SME lead persona returns Google Ads, Social, SEO", function () {
    /* The reference persona: a local SME on a small budget that needs leads.
       Paid search captures demand that already exists, social creates more of
       it cheaply, and SEO + AI Visibility is the long game underneath. */
    var result = E.score(answers("sme", "local", "under50", "leads"));
    deepEqual(topThree(result), ["google-ads", "social", "seo"], "SME lead persona");
    assertScoreSubset(
      result,
      { "google-ads": 37, social: 27, seo: 9 },
      "SME lead persona",
    );
  });

  test("budget shifts the plan without overriding the challenge", function () {
    var shifted = 0;
    optionIds("profile").forEach(function (profile) {
      optionIds("type").forEach(function (type) {
        optionIds("challenge").forEach(function (challenge) {
          var plans = optionIds("budget").map(function (budget) {
            return topThree(E.score(answers(profile, type, budget, challenge))).join(">");
          });
          if (unique(plans).length > 1) shifted += 1;
        });
      });
    });
    /* Budget must matter — a bigger budget should be able to buy a broader
       plan — without becoming the thing that decides the recommendation. */
    assert(shifted >= 40, "budget changed too few plans: " + shifted);
    assert(shifted <= 80, "budget is overriding the challenge: " + shifted);

    /* The reference persona keeps its answer at every budget it can fund. */
    ["under50", "50to100"].forEach(function (budget) {
      deepEqual(
        topThree(E.score(answers("sme", "local", budget, "leads"))),
        ["google-ads", "social", "seo"],
        budget + " local SME lead plan",
      );
    });
  });

  test("lead plans lead with demand capture unless the budget buys an engine", function () {
    allCases()
      .filter(function (answerSet) {
        return answerSet.challenge === "leads";
      })
      .forEach(function (answerSet) {
        var result = E.score(answerSet);
        var label = caseLabel(answerSet);
        var scaled =
          answerSet.budget === "over300" &&
          (answerSet.type === "national" || answerSet.type === "enterprise");
        if (scaled) {
          /* At this budget the brief changes: build demand, do not just buy it. */
          assert(
            ["seo", "google-ads"].indexOf(result.primary) !== -1,
            label + " scaled lead primary was " + result.primary,
          );
        } else {
          equal(result.primary, "google-ads", label + " lead primary");
        }
      });
  });

  test("Local SEO is a search-visibility service, never a lead channel", function () {
    allCases().forEach(function (answerSet) {
      var result = E.score(answerSet);
      if (topThree(result).indexOf("local-seo") === -1) return;
      assert(
        answerSet.type === "local" || answerSet.type === "mixed",
        caseLabel(answerSet) + " must not surface Local SEO for a non-local business",
      );
      assert(
        answerSet.challenge === "ranking" || answerSet.challenge === "ai",
        caseLabel(answerSet) + " must not surface Local SEO outside a visibility challenge",
      );
    });
  });

  test("canonical local ranking plan makes Local SEO primary", function () {
    var result = E.score(answers("inhouse", "local", "100to300", "ranking"));
    deepEqual(topThree(result), ["local-seo", "seo", "content"], "local ranking bundle");
    assertScoreSubset(
      result,
      { "local-seo": 40, seo: 38, content: 26, "google-ads": 12, social: 9 },
      "local ranking",
    );
  });

  test("content earns second place on ranking and AI visibility", function () {
    allCases()
      .filter(function (answerSet) {
        return (
          (answerSet.challenge === "ranking" || answerSet.challenge === "ai") &&
          answerSet.type !== "local" &&
          answerSet.type !== "mixed"
        );
      })
      .forEach(function (answerSet) {
        var plan = topThree(E.score(answerSet));
        deepEqual(plan.slice(0, 2), ["seo", "content"], caseLabel(answerSet) + " visibility pair");
      });

    var national = E.score(answers("sme", "national", "under50", "ranking"));
    assertScoreSubset(
      national,
      { seo: 36, content: 24, "google-ads": 13 },
      "national ranking",
    );
  });

  test("canonical enterprise AI plan applies its content interaction once", function () {
    var result = E.score(answers("enterprise", "enterprise", "over300", "ai"));
    deepEqual(topThree(result), ["seo", "content", "social"], "enterprise AI bundle");
    assertScoreSubset(
      result,
      { seo: 44, content: 40, social: 9, "google-ads": 7 },
      "enterprise AI",
    );
  });

  test("canonical traffic plans keep CRO for e-commerce and scale for enterprise", function () {
    var ecommerce = E.score(answers("sme", "ecommerce", "under50", "traffic"));
    deepEqual(topThree(ecommerce), ["google-ads", "seo", "cro"], "e-commerce traffic bundle");
    assertScoreSubset(
      ecommerce,
      { "google-ads": 32, cro: 28, seo: 28, social: 27 },
      "e-commerce traffic",
    );

    var local = E.score(answers("sme", "local", "under50", "traffic"));
    deepEqual(topThree(local), ["google-ads", "seo", "social"], "local SME traffic bundle");
    assertScoreSubset(local, { "google-ads": 31, seo: 25, social: 25 }, "local SME traffic");

    /* A very large media budget is what actually makes scaled reach buyable. */
    var national = E.score(answers("agency", "national", "over300", "traffic"));
    deepEqual(topThree(national), ["seo", "programmatic", "google-ads"], "scaled traffic bundle");
    assertScoreSubset(national, { seo: 38, programmatic: 27, "google-ads": 26 }, "scaled traffic");
  });

  test("website plans scale from a redesign to a rebuild as budget allows", function () {
    /* Below THB 50k a redesign is the realistic move; a full rebuild is what a
       larger budget actually buys. */
    var ecommerce = E.score(answers("sme", "ecommerce", "under50", "website"));
    deepEqual(topThree(ecommerce), ["uxui", "web-dev", "cro"], "small-budget website bundle");
    assertScoreSubset(ecommerce, { uxui: 32, "web-dev": 30, cro: 20 }, "small-budget website");

    var funded = E.score(answers("sme", "ecommerce", "over300", "website"));
    deepEqual(topThree(funded), ["web-dev", "uxui", "cro"], "funded website bundle");
    assertScoreSubset(funded, { "web-dev": 38, uxui: 24, cro: 22 }, "funded website");

    var mixed = E.score(answers("inhouse", "mixed", "50to100", "website"));
    deepEqual(topThree(mixed), ["web-dev", "uxui", "seo"], "mixed website bundle");

    var national = E.score(answers("sme", "national", "under50", "website"));
    deepEqual(topThree(national), ["uxui", "web-dev", "seo"], "national website bundle");
  });

  test("canonical consultation and AI plans preserve challenge intent", function () {
    var unsure = E.score(answers("enterprise", "enterprise", "unsure", "unsure"));
    deepEqual(topThree(unsure), ["consult", "seo", "google-ads"], "consultation bundle");
    assertScoreSubset(unsure, { consult: 40, seo: 14, "google-ads": 8, social: 8 }, "consultation");

    var ai = E.score(answers("agency", "national", "unsure", "ai"));
    deepEqual(topThree(ai), ["seo", "content", "social"], "national AI bundle");
    assertScoreSubset(ai, { seo: 38, content: 27, social: 9, "google-ads": 5 }, "national AI");
  });

  test("all 600 complete cases have a coherent result shape", function () {
    combinations = allCases();
    equal(combinations.length, 600, "complete combination count");

    combinations.forEach(function (item) {
      var label = caseLabel(item.answers);
      var result = item.result;
      var recommendations = topThree(result);

      equal(result.supporting.length, 2, label + " supporting count");
      equal(unique(recommendations).length, 3, label + " recommendations must be unique");
      recommendations.forEach(function (serviceId) {
        assert(D.SERVICES[serviceId], label + " returned unknown service " + serviceId);
        assert((result.scores[serviceId] || 0) > 0, label + " returned an unscored service " + serviceId);
        assert(
          typeof result.reasonFor(serviceId) === "string" &&
            result.reasonFor(serviceId).length > 0,
          label + " reason must be non-empty for " + serviceId,
        );
      });

      deepEqual(result.ranked.slice(0, 3), recommendations, label + " ranked prefix");
      equal(unique(result.ranked).length, result.ranked.length, label + " ranked IDs must be unique");
      result.ranked.forEach(function (serviceId) {
        assert(D.SERVICES[serviceId], label + " ranked unknown service " + serviceId);
      });
      Object.keys(result.scores).forEach(function (serviceId) {
        assert(
          typeof result.scores[serviceId] === "number" && isFinite(result.scores[serviceId]),
          label + " has non-finite score for " + serviceId,
        );
      });
      assert(result.budgetNote === D.BUDGET_NOTES[item.answers.budget], label + " budget note mismatch");
    });
  });

  test("all 600 bundles follow the explicit business-rule oracle", function () {
    combinations.forEach(function (item) {
      deepEqual(
        topThree(item.result),
        expectedTopThree(item.answers, item.result.scores),
        caseLabel(item.answers),
      );
    });
  });

  test("all 600 results expose auditable additive v2 metadata", function () {
    var deliveryModeByProfile = {};

    combinations.forEach(function (item) {
      var answerSet = item.answers;
      var result = item.result;
      var label = caseLabel(answerSet);
      var breakdown = result.breakdown;

      equal(result.logicVersion, 2, label + " logic version");
      assert(breakdown && typeof breakdown === "object", label + " breakdown");
      assert(breakdown.byService && typeof breakdown.byService === "object", label + " service breakdown");
      assert(Array.isArray(breakdown.appliedRules), label + " breakdown rules");
      assert(Array.isArray(result.appliedRules), label + " top-level rules");
      deepEqual(result.appliedRules, breakdown.appliedRules, label + " mirrored applied rules");
      deepEqual(
        result.appliedRules.map(function (rule) {
          return rule.id;
        }),
        expectedAppliedRuleIds(answerSet),
        label + " applied rule IDs",
      );

      result.appliedRules.forEach(function (appliedRule) {
        var configuredRule = D.INTERACTION_RULES.filter(function (rule) {
          return rule.id === appliedRule.id;
        })[0];
        assert(configuredRule, label + " exposes unknown applied rule " + appliedRule.id);
        equal(appliedRule.label, configuredRule.label, label + " applied rule label for " + appliedRule.id);
        deepEqual(appliedRule.weights, configuredRule.weights, label + " applied rule weights for " + appliedRule.id);
      });

      assert(
        !("primaryPool" in breakdown) && !("supportRule" in breakdown),
        label + " must not expose pool/bundle overrides",
      );
      deepEqual(
        result.ranked.slice(0, 3),
        [result.primary].concat(result.supporting),
        label + " ranked order must lead with the three cards",
      );

      Object.keys(result.scores).forEach(function (serviceId) {
        var row = breakdown.byService[serviceId];
        assert(row && typeof row === "object", label + " missing breakdown for " + serviceId);
        ["profile", "type", "budget", "challenge", "interactions", "total"].forEach(function (component) {
          assert(
            typeof row[component] === "number" && isFinite(row[component]),
            label + "/" + serviceId + " invalid breakdown component " + component,
          );
        });
        equal(row.total, result.scores[serviceId], label + "/" + serviceId + " breakdown total");
      });
      assert(!breakdown.byService["ai-seo"], label + " exposed an internal AI-SEO row");

      assert(result.focus && typeof result.focus === "object", label + " focus metadata");
      assert(typeof result.focus.mode === "string" && result.focus.mode.length > 0, label + " focus mode");
      equal(
        result.focus.mode,
        {
          leads: "lead-generation",
          ranking: "search-first",
          ai: "ai-first",
          traffic: "audience-growth",
          website: "experience-upgrade",
          unsure: "discovery",
        }[answerSet.challenge],
        label + " focus mode value",
      );
      equal(
        result.focus.activeWorkstreams,
        result.budgetNote.activeWorkstreams,
        label + " focus active workstreams",
      );

      assert(result.delivery && typeof result.delivery === "object", label + " delivery metadata");
      assert(typeof result.delivery.mode === "string" && result.delivery.mode.length > 0, label + " delivery mode");
      assert(typeof result.delivery.label === "string" && result.delivery.label.length > 0, label + " delivery label");
      assert(Array.isArray(result.delivery.overlays), label + " delivery overlays");
      equal(unique(result.delivery.overlays).length, result.delivery.overlays.length, label + " unique delivery overlays");
      result.delivery.overlays.forEach(function (overlay) {
        assert(typeof overlay === "string" && overlay.length > 0, label + " delivery overlay value");
      });
      if (!deliveryModeByProfile[answerSet.profile]) {
        deliveryModeByProfile[answerSet.profile] = result.delivery.mode;
      }
      equal(
        result.delivery.mode,
        deliveryModeByProfile[answerSet.profile],
        label + " profile delivery mode stability",
      );
      equal(
        result.delivery.mode,
        {
          sme: "managed",
          inhouse: "co-managed",
          enterprise: "enterprise-governance",
          agency: "white-label",
        }[answerSet.profile],
        label + " delivery mode value",
      );
      var expectedOverlays = [];
      if (answerSet.profile === "agency") expectedOverlays.push("white-label");
      if (
        answerSet.budget === "over300" &&
        (answerSet.profile === "enterprise" || answerSet.type === "enterprise")
      ) {
        expectedOverlays.push("outcome-aligned");
      }
      deepEqual(result.delivery.overlays, expectedOverlays, label + " delivery overlays value");

      assert(result.confidence && typeof result.confidence === "object", label + " confidence metadata");
      assert(typeof result.confidence.level === "string" && result.confidence.level.length > 0, label + " confidence level");
      assert(
        result.confidence.scoreGap === null ||
          (typeof result.confidence.scoreGap === "number" &&
            isFinite(result.confidence.scoreGap) &&
            result.confidence.scoreGap >= 0),
        label + " confidence score gap",
      );
      assert(typeof result.confidence.reason === "string" && result.confidence.reason.length > 0, label + " confidence reason");
      var otherPrimary = result.supporting[0];
      var expectedGap = otherPrimary
        ? result.scores[result.primary] - result.scores[otherPrimary]
        : null;
      equal(result.confidence.scoreGap, expectedGap, label + " confidence score-gap value");
      equal(
        result.confidence.level,
        answerSet.budget === "unsure"
          ? "medium"
          : expectedGap !== null && expectedGap <= 1
            ? "medium"
            : "high",
        label + " confidence level value",
      );

      assert(Array.isArray(result.phases), label + " phases");
      result.phases.forEach(function (phase) {
        assert(typeof phase.id === "string" && phase.id.length > 0, label + " phase ID");
        assert(typeof phase.label === "string" && phase.label.length > 0, label + " phase label");
        assert(Array.isArray(phase.serviceIds) && phase.serviceIds.length > 0, label + " phase services");
      });
      deepEqual(
        phaseEssentials(result.phases),
        expectedPhases(answerSet, result),
        label + " phase allocation",
      );
    });

    equal(Object.keys(deliveryModeByProfile).length, 4, "delivery-mode profile coverage");
    equal(
      unique(Object.keys(deliveryModeByProfile).map(function (profile) {
        return deliveryModeByProfile[profile];
      })).length,
      4,
      "each persona has a distinct delivery mode",
    );
  });

  test("all 600 primary and top-three distributions match the v3 baseline", function () {
    var primaryCounts = countBy(
      combinations.map(function (item) {
        return item.result.primary;
      }),
    );
    var appearanceCounts = countBy(
      combinations.reduce(function (all, item) {
        return all.concat(topThree(item.result));
      }, []),
    );

    deepEqual(
      primaryCounts,
      {
        seo: 278,
        "google-ads": 102,
        "web-dev": 80,
        consult: 100,
        "local-seo": 20,
        uxui: 20,
      },
      "primary distribution",
    );
    deepEqual(
      appearanceCounts,
      {
        seo: 514,
        "google-ads": 324,
        social: 291,
        content: 206,
        "web-dev": 100,
        uxui: 100,
        consult: 100,
        "local-seo": 80,
        cro: 77,
        programmatic: 8,
      },
      "top-three distribution",
    );
    equal(
      Object.keys(appearanceCounts).reduce(function (total, serviceId) {
        return total + appearanceCounts[serviceId];
      }, 0),
      1800,
      "total recommendation slots",
    );
  });

  test("primary eligibility and support-only constraints hold exhaustively", function () {
    var allowed = {
      leads: ["google-ads", "seo"],
      ranking: ["seo", "local-seo"],
      ai: ["seo"],
      traffic: ["seo", "google-ads"],
      website: ["web-dev", "uxui"],
      unsure: ["consult"],
    };
    var supportOnly = ["content", "cro", "programmatic", "reseller", "outcome"];
    var actionable = 0;
    var coreActionable = 0;

    combinations.forEach(function (item) {
      var answerSet = item.answers;
      var result = item.result;
      var recommendations = topThree(result);
      var label = caseLabel(answerSet);

      assert(allowed[answerSet.challenge].indexOf(result.primary) !== -1, label + " has ineligible primary " + result.primary);
      assert(supportOnly.indexOf(result.primary) === -1, label + " promoted a support-only service");
      assert(result.supporting.indexOf("consult") === -1, label + " placed Consultation in support");
      assert(recommendations.indexOf("reseller") === -1, label + " exposed the delivery overlay as a card");
      assert(recommendations.indexOf("outcome") === -1, label + " exposed the outcome overlay as a card");

      if (recommendations.indexOf("content") !== -1) {
        assert(recommendations.indexOf("seo") !== -1, label + " returned Content without SEO");
      }

      var paidCount = ["google-ads", "social", "programmatic"].filter(function (id) {
        return recommendations.indexOf(id) !== -1;
      }).length;
      assert(paidCount <= 2, label + " returned more than two paid-media cards");

      if (answerSet.challenge !== "website" && answerSet.challenge !== "unsure") {
        actionable += 1;
        if (["seo", "google-ads", "social"].indexOf(result.primary) !== -1) {
          coreActionable += 1;
        }
      }
    });

    equal(actionable, 400, "actionable acquisition/search cases");
    equal(coreActionable, 380, "core-service actionable primaries");
  });

  test("specialist services appear only in their intended contexts", function () {
    var programmaticCases = [];
    combinations.forEach(function (item) {
      var recommendations = topThree(item.result);
      var label = caseLabel(item.answers);
      if (recommendations.indexOf("programmatic") !== -1) {
        programmaticCases.push(item);
        assert(
          ["100to300", "over300"].indexOf(item.answers.budget) !== -1,
          label + " Programmatic budget",
        );
        assert(
          ["leads", "traffic"].indexOf(item.answers.challenge) !== -1,
          label + " Programmatic challenge",
        );
        assert(
          ["national", "enterprise", "mixed"].indexOf(item.answers.type) !== -1,
          label + " Programmatic business type",
        );
      }
      if (item.result.primary === "local-seo") {
        equal(item.answers.type, "local", label + " Local SEO primary type");
        equal(item.answers.challenge, "ranking", label + " Local SEO primary challenge");
      }
      if (recommendations.indexOf("local-seo") !== -1) {
        assert(
          ["ranking", "ai", "unsure"].indexOf(item.answers.challenge) !== -1,
          label + " Local SEO is a visibility or discovery answer only",
        );
        assert(
          item.answers.challenge !== "leads",
          label + " Local SEO must never appear in a lead plan",
        );
      }
      if (item.result.primary === "consult") {
        equal(item.answers.challenge, "unsure", label + " Consultation primary challenge");
      }
    });
    equal(programmaticCases.length, 8, "Programmatic case count");
  });

  test("tie rules are deterministic and one-point leads remain real wins", function () {
    /* Lead plans no longer hinge on a coin-flip between the two paid channels:
       Google Ads wins outright everywhere, so there is nothing left to tie. */
    var paidLeadTies = combinations.filter(function (item) {
      return (
        item.answers.challenge === "leads" &&
        item.result.scores["google-ads"] === item.result.scores.social
      );
    });
    equal(paidLeadTies.length, 0, "paid lead tie count");

    var ecommerceTrafficTies = combinations.filter(function (item) {
      return (
        item.answers.profile === "sme" &&
        item.answers.type === "ecommerce" &&
        item.answers.challenge === "traffic" &&
        item.result.scores.seo === item.result.scores["google-ads"]
      );
    });
    equal(ecommerceTrafficTies.length, 2, "SME e-commerce traffic tie count");
    ecommerceTrafficTies.forEach(function (item) {
      equal(item.result.primary, "seo", caseLabel(item.answers) + " tie winner");
    });

    var localLead = E.score(answers("sme", "local", "under50", "leads"));
    equal(localLead.result, undefined, "result objects must not be nested unexpectedly");
    equal(localLead.scores["google-ads"] - localLead.scores.social, 10, "local lead score gap");
    equal(localLead.primary, "google-ads", "Google Ads leads the lead plan");

    /* The same local business with the same traffic problem should get a
       different lead channel once it can fund a compounding one. */
    var localTrafficPrimary = {};
    optionIds("budget").forEach(function (budget) {
      localTrafficPrimary[budget] = E.score(
        answers("sme", "local", budget, "traffic"),
      ).primary;
    });
    equal(localTrafficPrimary.under50, "google-ads", "small-budget local traffic");
    equal(localTrafficPrimary["50to100"], "google-ads", "growth-budget local traffic");
    equal(localTrafficPrimary["100to300"], "seo", "scale-budget local traffic");
    equal(localTrafficPrimary.over300, "seo", "enterprise-budget local traffic");
  });

  test("answer object key order cannot alter scoring", function () {
    var normal = answers("agency", "national", "over300", "leads");
    var reversed = {
      challenge: "leads",
      budget: "over300",
      type: "national",
      profile: "agency",
    };
    var a = E.score(normal);
    var b = E.score(reversed);
    deepEqual(a.scores, b.scores, "scores by answer key order");
    deepEqual(a.ranked, b.ranked, "ranking by answer key order");
    deepEqual(topThree(a), topThree(b), "recommendations by answer key order");
  });

  test("budget notes encode delivery phasing without changing card count", function () {
    var expected = {
      under50: { tier: "Focused start", activeWorkstreams: 1, requiresSizing: false },
      "50to100": { tier: "Growth", activeWorkstreams: 2, requiresSizing: false },
      "100to300": { tier: "Scale", activeWorkstreams: 2, requiresSizing: false },
      over300: { tier: "Enterprise", activeWorkstreams: 3, requiresSizing: false },
      unsure: { tier: "To be sized", activeWorkstreams: null, requiresSizing: true },
    };

    Object.keys(expected).forEach(function (budget) {
      var note = D.BUDGET_NOTES[budget];
      equal(note.tier, expected[budget].tier, budget + " tier");
      equal(note.activeWorkstreams, expected[budget].activeWorkstreams, budget + " active workstreams");
      equal(!!note.requiresSizing, expected[budget].requiresSizing, budget + " sizing flag");
      assert(typeof note.supportHeading === "string" && note.supportHeading.length > 0, budget + " support heading");
    });

    var changedByBudget = 0;
    optionIds("profile").forEach(function (profile) {
      optionIds("type").forEach(function (type) {
        optionIds("challenge").forEach(function (challenge) {
          var primaries = optionIds("budget").map(function (budget) {
            return E.score(answers(profile, type, budget, challenge)).primary;
          });
          if (unique(primaries).length > 1) changedByBudget += 1;
        });
      });
    });
    equal(changedByBudget, 32, "persona/type/challenge groups whose primary changes by budget");

    var focusedLeadCases = combinations.filter(function (item) {
      return item.answers.budget === "under50" && item.answers.challenge === "leads";
    });
    equal(focusedLeadCases.length, 20, "focused lead case count");
    focusedLeadCases.forEach(function (item) {
      /* A small budget funds fewer workstreams; it does not change which
         channel generates leads fastest. */
      equal(item.result.primary, "google-ads", caseLabel(item.answers) + " focused lead primary");
      equal(item.result.phases[0].serviceIds.length, 1, caseLabel(item.answers) + " focused lead phasing");
    });

    combinations
      .filter(function (item) {
        return item.answers.budget === "unsure" && item.answers.challenge !== "unsure";
      })
      .forEach(function (item) {
        assert(item.result.primary !== "consult", caseLabel(item.answers) + " budget alone forced Consultation");
      });
  });

  test("incomplete and invalid answers use safe numeric fallback behavior", function () {
    var empty = E.score({});
    equal(empty.logicVersion, 2, "empty logic version");
    equal(empty.isComplete, false, "empty completeness");
    deepEqual(
      empty.missingQuestionIds,
      ["profile", "type", "budget", "challenge"],
      "empty missing questions",
    );
    deepEqual(empty.invalidAnswers, [], "empty invalid answers");
    deepEqual(empty.scores, {}, "empty scores");
    deepEqual(empty.ranked, [], "empty ranking");
    equal(empty.primary, undefined, "empty primary");
    deepEqual(empty.supporting, [], "empty supports");
    equal(empty.budgetNote, null, "empty budget note");
    deepEqual(empty.phases, [], "empty phases");
    equal(empty.confidence.level, "low", "empty confidence");
    equal(empty.confidence.scoreGap, null, "empty confidence gap");

    var profileOnly = E.score({ profile: "sme" });
    deepEqual(topThree(profileOnly), ["google-ads", "social", "local-seo"], "profile-only numeric fallback");
    equal(profileOnly.isComplete, false, "profile-only completeness");
    deepEqual(
      profileOnly.missingQuestionIds,
      ["type", "budget", "challenge"],
      "profile-only missing questions",
    );
    deepEqual(profileOnly.phases, [], "profile-only phases");

    var invalid = E.score({
      profile: "sme",
      type: "local",
      budget: "under50",
      challenge: "not-a-real-answer",
    });
    var omitted = E.score({ profile: "sme", type: "local", budget: "under50" });
    deepEqual(invalid.scores, omitted.scores, "invalid answer must behave like omission");
    deepEqual(invalid.ranked, omitted.ranked, "invalid answer fallback ranking");
    deepEqual(topThree(invalid), topThree(omitted), "invalid answer fallback recommendations");
    equal(invalid.isComplete, false, "invalid answer completeness");
    deepEqual(invalid.missingQuestionIds, [], "invalid answer is not also missing");
    deepEqual(
      invalid.invalidAnswers,
      [{ questionId: "challenge", answerId: "not-a-real-answer" }],
      "invalid answer diagnostics",
    );
    deepEqual(invalid.phases, [], "invalid answer phases");
    equal(invalid.confidence.level, "low", "invalid answer confidence");

    var withExtraKey = E.score({
      profile: "sme",
      type: "local",
      budget: "under50",
      challenge: "leads",
      futureField: "ignored",
    });
    var withoutExtraKey = E.score(answers("sme", "local", "under50", "leads"));
    deepEqual(withExtraKey.scores, withoutExtraKey.scores, "extra answer key scores");
    deepEqual(topThree(withExtraKey), topThree(withoutExtraKey), "extra answer key recommendations");
    equal(withExtraKey.isComplete, true, "extra answer key completeness");

    var nullResult = E.score(null);
    equal(nullResult.isComplete, false, "null completeness");
    deepEqual(nullResult.scores, {}, "null scores");
    deepEqual(nullResult.ranked, [], "null ranking");
  });

  function run() {
    if (!D || !E) {
      writeLine("FAIL setup: load data.js and engine.js before this file", "fail");
      if (typeof quit === "function") quit(1);
      return;
    }

    tests.forEach(function (item) {
      try {
        item.fn();
        passed += 1;
        writeLine("PASS " + item.name, "pass");
      } catch (error) {
        failed += 1;
        var detail = error && error.message ? error.message : String(error);
        var line = "FAIL " + item.name + " — " + detail;
        failureLines.push(line);
        writeLine(line, "fail");
      }
    });

    var summary =
      "RESULT " +
      passed +
      " passed, " +
      failed +
      " failed" +
      (combinations ? "; audited " + combinations.length + " complete combinations" : "");
    writeLine(summary, failed ? "summary fail" : "summary pass");

    root.MAM_TEST_RESULTS = {
      passed: passed,
      failed: failed,
      failures: failureLines,
      combinations: combinations ? combinations.length : 0,
    };

    if (root.process && typeof root.process === "object") {
      root.process.exitCode = failed ? 1 : 0;
    } else if (!root.document && failed) {
      /* JavaScriptCore's quit(status) does not reliably propagate the status
         on every macOS build. Throw only after reporting every failure. */
      throw new Error(summary);
    }
  }

  run();
})(window);
