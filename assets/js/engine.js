/* ==========================================================================
   ENGINE — turns answers into a ranked set of service recommendations.

   V2 separates service fit from recommendation structure:
   1. answer weights and cross-answer rules build transparent fit scores;
   2. eligibility gates remove services that do not fit the selected context;
   3. the challenge selects the valid primary-service pool; and
   4. a complementary bundle rule chooses two supporting services.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MAM_DATA;

  function optionFor(question, answerId) {
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].id === answerId) return question.options[i];
    }
    return null;
  }

  function questionFor(questionId) {
    for (var i = 0; i < D.QUESTIONS.length; i++) {
      if (D.QUESTIONS[i].id === questionId) return D.QUESTIONS[i];
    }
    return null;
  }

  /* An answer is either one option id or, for a multi-select question, an
     ordered list. Order carries meaning: the first entry is what the visitor
     called their main answer. Everything downstream reads answers through
     here, so a single id and a one-item list behave identically. */
  function answerIds(answer) {
    if (answer === undefined || answer === null || answer === "") return [];
    if (!Array.isArray(answer)) return [answer];
    return answer.filter(function (id) {
      return id !== undefined && id !== null && id !== "";
    });
  }

  /* The main answer scores in full; a second scores at the configured
     fraction. Every challenge weight is even, so scores stay whole numbers. */
  function rankWeight(index) {
    if (index === 0) return 1;
    var secondary = D.SECONDARY_CHALLENGE_WEIGHT;
    return typeof secondary === "number" ? secondary : 0.5;
  }

  function challengeIds(answers) {
    return answerIds(answers.challenge);
  }

  function hasChallenge(answers, challengeId) {
    return challengeIds(answers).indexOf(challengeId) !== -1;
  }

  /* A service stays eligible if it answers *either* stated challenge. */
  function anyChallenge(answers, challengeIdList) {
    return challengeIdList.some(function (challengeId) {
      return hasChallenge(answers, challengeId);
    });
  }

  /* What a rule triggered by a given challenge is worth. A bonus fired by the
     second challenge is scaled like that challenge, otherwise a secondary pick
     would swing more points through a bonus than through its own weights. */
  function challengeWeight(answers, challengeId) {
    var index = challengeIds(answers).indexOf(challengeId);
    return index === -1 ? 0 : rankWeight(index);
  }

  /** Pick the strongest scoring signal behind a grouped public service. */
  function bestScoreSignal(scores, serviceId) {
    var signalIds = (D.SCORE_GROUPS && D.SCORE_GROUPS[serviceId]) || [
      serviceId,
    ];
    var winnerId = serviceId;
    var winnerScore = scores[serviceId] || 0;

    signalIds.forEach(function (signalId) {
      var signalScore = scores[signalId] || 0;
      if (signalScore > winnerScore) {
        winnerId = signalId;
        winnerScore = signalScore;
      }
    });

    return { id: winnerId, score: winnerScore };
  }

  function collapseScoreGroups(scores, contributions, breakdown) {
    Object.keys(D.SCORE_GROUPS || {}).forEach(function (serviceId) {
      var winner = bestScoreSignal(scores, serviceId);
      var signalIds = D.SCORE_GROUPS[serviceId];

      scores[serviceId] = winner.score;
      contributions[serviceId] = (contributions[winner.id] || []).slice();
      if (breakdown[winner.id]) {
        breakdown[serviceId] = Object.assign({}, breakdown[winner.id]);
      }

      signalIds.forEach(function (signalId) {
        if (signalId === serviceId) return;
        delete scores[signalId];
        delete contributions[signalId];
        delete breakdown[signalId];
      });
    });
  }

  /* Identifies one reason. Keyed by option rather than by question, so a
     second challenge counts as a reason of its own instead of being swallowed
     by the first. */
  function sourceKey(item) {
    return item.questionId + ":" + (item.optionId || item.ruleId || "");
  }

  function bestUnusedContribution(list, usedSources) {
    if (!list || !list.length) return null;
    var byPoints = list.slice().sort(function (a, b) {
      return b.points - a.points;
    });
    var used = usedSources || [];
    var unused = byPoints.filter(function (item) {
      return used.indexOf(sourceKey(item)) === -1;
    });
    return unused[0] || byPoints[0];
  }

  function priorityIndex(order, serviceId) {
    var index = order.indexOf(serviceId);
    return index === -1 ? order.length : index;
  }

  function sortByScore(ids, scores, tieOrder) {
    return ids.slice().sort(function (a, b) {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      var tieDifference =
        priorityIndex(tieOrder || [], a) -
        priorityIndex(tieOrder || [], b);
      if (tieDifference) return tieDifference;
      return priorityIndex(D.PRIORITY, a) - priorityIndex(D.PRIORITY, b);
    });
  }

  function allMatch(expected, answers) {
    return Object.keys(expected || {}).every(function (questionId) {
      if (questionId === "challenge") {
        return hasChallenge(answers, expected[questionId]);
      }
      return answers[questionId] === expected[questionId];
    });
  }

  /* Scale a matched rule by the rank of the challenge that triggered it.
     Rules with no challenge condition apply in full. */
  function ruleScale(rule, answers) {
    var triggers = [];
    if (rule.when && rule.when.challenge) triggers.push(rule.when.challenge);
    (rule.any || []).forEach(function (alternative) {
      if (alternative.challenge) triggers.push(alternative.challenge);
    });
    if (!triggers.length) return 1;
    return triggers.reduce(function (strongest, challengeId) {
      return Math.max(strongest, challengeWeight(answers, challengeId));
    }, 0);
  }

  function ruleMatches(rule, answers) {
    if (!allMatch(rule.when, answers)) return false;
    if (!rule.any || !rule.any.length) return true;
    return rule.any.some(function (alternative) {
      return allMatch(alternative, answers);
    });
  }

  function isEligible(serviceId, answers, isComplete) {
    /* Partial answers power the developer sandbox. Do not hide a service until
       all four signals are available and the final context is known. */
    if (!isComplete) return true;

    var type = answers.type;
    var budget = answers.budget;
    var funded = ["100to300", "over300"].indexOf(budget) !== -1;

    if (serviceId === "local-seo") {
      /* A visibility service, not a lead channel — plus the discovery case,
         where a local business's map presence is a likely starting point. */
      return (
        (type === "local" || type === "mixed") &&
        anyChallenge(answers, ["ranking", "ai", "unsure"])
      );
    }
    if (serviceId === "web-dev" || serviceId === "uxui") {
      return anyChallenge(answers, ["website"]);
    }
    if (serviceId === "content") {
      /* Content answers visibility problems. On a lead problem it only earns a
         place once the budget can fund it alongside the channels that convert. */
      return (
        anyChallenge(answers, ["ranking", "ai", "traffic"]) ||
        (anyChallenge(answers, ["leads"]) && funded)
      );
    }
    if (serviceId === "cro") {
      /* Optimising conversion needs traffic worth optimising: an e-commerce or
         mixed model, a website rebuild, or enough budget to be running volume. */
      return (
        type === "ecommerce" ||
        type === "mixed" ||
        anyChallenge(answers, ["website"]) ||
        (anyChallenge(answers, ["leads", "traffic"]) && funded)
      );
    }
    if (serviceId === "programmatic") {
      return (
        funded &&
        ["national", "enterprise", "mixed"].indexOf(type) !== -1 &&
        anyChallenge(answers, ["leads", "traffic"])
      );
    }
    if (serviceId === "consult") return anyChallenge(answers, ["unsure"]);
    /* These are delivery/engagement overlays in v2, not ranked services. */
    if (serviceId === "reseller" || serviceId === "outcome") return false;
    return true;
  }

  function deliveryFor(answers) {
    var modes = {
      sme: { mode: "managed", label: "Managed delivery" },
      inhouse: { mode: "co-managed", label: "Co-managed with your team" },
      enterprise: {
        mode: "enterprise-governance",
        label: "Enterprise programme governance",
      },
      agency: { mode: "white-label", label: "White-label delivery" },
    };
    var delivery = modes[answers.profile] || {
      mode: "managed",
      label: "Managed delivery",
    };
    var overlays = [];
    if (answers.profile === "agency") overlays.push("white-label");
    if (
      answers.budget === "over300" &&
      (answers.profile === "enterprise" || answers.type === "enterprise")
    ) {
      overlays.push("outcome-aligned");
    }
    return {
      mode: delivery.mode,
      label: delivery.label,
      overlays: overlays,
    };
  }

  function focusFor(answers, budgetNote) {
    var modes = {
      leads: "lead-generation",
      ranking: "search-first",
      ai: "ai-first",
      traffic: "audience-growth",
      website: "experience-upgrade",
      unsure: "discovery",
    };
    var stated = challengeIds(answers);
    return {
      mode: modes[stated[0]] || "discovery",
      secondaryMode: stated.length > 1 ? modes[stated[1]] || null : null,
      challengeCount: stated.length,
      activeWorkstreams: budgetNote ? budgetNote.activeWorkstreams : null,
    };
  }

  function phasesFor(budgetId, primary, supporting) {
    if (!primary) return [];
    var plan = [primary].concat(supporting);
    if (budgetId === "under50") {
      return [
        { id: "now", label: "Start now", serviceIds: plan.slice(0, 1) },
        { id: "roadmap", label: "Roadmap", serviceIds: plan.slice(1) },
      ];
    }
    if (budgetId === "50to100" || budgetId === "100to300") {
      return [
        { id: "now", label: "Run now", serviceIds: plan.slice(0, 2) },
        { id: "next", label: "Next phase", serviceIds: plan.slice(2) },
      ];
    }
    if (budgetId === "over300") {
      return [{ id: "now", label: "Integrated programme", serviceIds: plan }];
    }
    return [
      {
        id: "discovery",
        label: "Size the budget first",
        serviceIds: ["consult"],
      },
      {
        id: "explore",
        label: "Indicative recommendations",
        serviceIds: plan.filter(function (id) {
          return id !== "consult";
        }),
      },
    ];
  }

  /**
   * @param {Object} answers  { profile:'sme', type:'local', budget:'under50', challenge:'leads' }
   * @returns {Object} Legacy recommendation fields plus v2 diagnostics and
   *                   budget-aware implementation metadata.
   */
  function score(answers) {
    answers = answers || {};
    var scores = {};
    var contributions = {}; // serviceId -> [{ questionId, optionLabel, points }]
    var breakdown = {};
    var missingQuestionIds = [];
    var invalidAnswers = [];

    function addPoints(serviceId, points, sourceId, sourceLabel, extra) {
      scores[serviceId] = (scores[serviceId] || 0) + points;
      breakdown[serviceId] = breakdown[serviceId] || {
        profile: 0,
        type: 0,
        budget: 0,
        challenge: 0,
        interactions: 0,
        total: 0,
      };
      if (sourceId === "interaction") {
        breakdown[serviceId].interactions += points;
      } else {
        breakdown[serviceId][sourceId] += points;
      }
      breakdown[serviceId].total += points;
      if (points > 0) {
        (contributions[serviceId] = contributions[serviceId] || []).push({
          questionId: sourceId,
          optionId: extra && extra.optionId,
          ruleId: extra && extra.ruleId,
          optionLabel: sourceLabel,
          points: points,
        });
      }
    }

    D.QUESTIONS.forEach(function (question) {
      var selected = answerIds(answers[question.id]);
      if (!selected.length) {
        missingQuestionIds.push(question.id);
        return;
      }

      function reject(answerId) {
        invalidAnswers.push({ questionId: question.id, answerId: answerId });
      }

      /* Reject a malformed selection outright rather than scoring part of it.
         A silently half-scored question is far harder to notice than a result
         that reports itself incomplete. */
      var limit = question.multi ? question.maxSelections || 1 : 1;
      if (selected.length > limit) {
        reject(answers[question.id]);
        return;
      }
      var duplicated = selected.some(function (answerId, index) {
        return selected.indexOf(answerId) !== index;
      });
      if (duplicated) {
        reject(answers[question.id]);
        return;
      }

      var options = selected.map(function (answerId) {
        return optionFor(question, answerId);
      });
      var unknown = options.some(function (option) {
        return !option;
      });
      if (unknown) {
        options.forEach(function (option, index) {
          if (!option) reject(selected[index]);
        });
        return;
      }
      /* An exclusive answer contradicts anything paired with it — "I'm not sure
         where to start" cannot be true alongside a specific problem. */
      var exclusive = options.some(function (option) {
        return option.exclusive;
      });
      if (exclusive && options.length > 1) {
        reject(answers[question.id]);
        return;
      }

      options.forEach(function (option, index) {
        var multiplier = rankWeight(index);
        Object.keys(option.weights).forEach(function (serviceId) {
          addPoints(
            serviceId,
            option.weights[serviceId] * multiplier,
            question.id,
            option.label,
            { optionId: option.id, rank: index + 1 },
          );
        });
      });
    });

    var appliedRules = [];
    (D.INTERACTION_RULES || []).forEach(function (rule) {
      if (!ruleMatches(rule, answers)) return;
      var scale = ruleScale(rule, answers);
      var applied = {};
      Object.keys(rule.weights).forEach(function (serviceId) {
        applied[serviceId] = rule.weights[serviceId] * scale;
        addPoints(
          serviceId,
          applied[serviceId],
          "interaction",
          rule.label,
          { ruleId: rule.id },
        );
      });
      appliedRules.push({
        id: rule.id,
        label: rule.label,
        scale: scale,
        weights: applied,
      });
    });

    collapseScoreGroups(scores, contributions, breakdown);

    var isComplete =
      missingQuestionIds.length === 0 && invalidAnswers.length === 0;

    var rawRanked = Object.keys(scores)
      .filter(function (id) {
        return (
          scores[id] > 0 &&
          D.SERVICES[id] &&
          isEligible(id, answers, isComplete)
        );
      });
    rawRanked = sortByScore(rawRanked, scores, D.PRIORITY);

    /* The score order IS the recommendation. Everything that shapes it —
       business type, challenge, eligibility and interaction rules — has already
       been applied, so the top service is primary and the next two support it.
       No per-challenge pool may override what the scoring decided. */
    var primary = rawRanked[0];
    var supporting = rawRanked
      .filter(function (id) {
        return id !== primary && D.PRIMARY_ONLY.indexOf(id) === -1;
      })
      .slice(0, 2);

    /* The three cards, then the rest of the eligible field behind them. */
    var ranked = [];
    [primary].concat(supporting, rawRanked).forEach(function (id) {
      if (id && ranked.indexOf(id) === -1) ranked.push(id);
    });

    var budgetNote = D.BUDGET_NOTES[answers.budget] || null;
    var runnerUp = supporting[0];
    var scoreGap = runnerUp ? scores[primary] - scores[runnerUp] : null;
    var confidence;
    if (!isComplete) {
      confidence = {
        level: "low",
        scoreGap: null,
        reason: "Complete all four questions for a final recommendation.",
      };
    } else if (answers.budget === "unsure") {
      confidence = {
        level: "medium",
        scoreGap: scoreGap,
        reason: "The service direction is useful, but the budget still needs sizing.",
      };
    } else if (scoreGap !== null && scoreGap <= 1) {
      confidence = {
        level: "medium",
        scoreGap: scoreGap,
        reason: "The leading options are close, so validation should decide the final channel mix.",
      };
    } else {
      confidence = {
        level: "high",
        scoreGap: scoreGap,
        reason: "The selected challenge and business context point to a clear starting service.",
      };
    }

    return {
      logicVersion: 3,
      scores: scores,
      ranked: ranked,
      rawRanked: rawRanked,
      primary: primary,
      supporting: supporting,
      isComplete: isComplete,
      missingQuestionIds: missingQuestionIds,
      invalidAnswers: invalidAnswers,
      breakdown: {
        byService: breakdown,
        appliedRules: appliedRules,
      },
      appliedRules: appliedRules,
      delivery: deliveryFor(answers),
      focus: focusFor(answers, budgetNote),
      confidence: confidence,
      phases: isComplete
        ? phasesFor(answers.budget, primary, supporting)
        : [],
      /* Why each recommended service surfaced — used for the result copy.
         The challenge dominates every score, so asking each card for its single
         biggest contribution prints the same sentence three times. Pass the
         answers already used by earlier cards and each one cites what actually
         sets it apart, falling back to its strongest reason if nothing is
         left. */
      reasonFor: function (serviceId, usedSources) {
        var best = bestUnusedContribution(contributions[serviceId], usedSources);
        return best ? best.optionLabel.replace(/\.$/, "") : "";
      },
      /* The question each card's reason came from, so the caller can keep the
         three lines distinct without knowing how scoring works. */
      reasonSourceFor: function (serviceId, usedSources) {
        var best = bestUnusedContribution(contributions[serviceId], usedSources);
        return best ? sourceKey(best) : null;
      },
      budgetNote: budgetNote,
    };
  }

  /* ── Lead payload sent to n8n ──────────────────────────────────────── */

  function readTracking() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ].forEach(function (key) {
      if (params.get(key)) utm[key] = params.get(key);
    });
    return utm;
  }

  function labelOf(questionId, answerId) {
    for (var i = 0; i < D.QUESTIONS.length; i++) {
      if (D.QUESTIONS[i].id !== questionId) continue;
      var option = optionFor(D.QUESTIONS[i], answerId);
      return option ? option.label : answerId;
    }
    return answerId;
  }

  /* ── reCAPTCHA v3 ──────────────────────────────────────────────────
     Loaded lazily and only when a site key is configured, so no Google
     script is fetched (and no user data leaves the page) otherwise.
     ------------------------------------------------------------------ */

  var recaptchaLoad = null;

  function loadRecaptcha() {
    var siteKey = (window.MAM_CONFIG.spam || {}).recaptchaSiteKey;
    if (!siteKey) return Promise.resolve(false);
    if (recaptchaLoad) return recaptchaLoad;

    recaptchaLoad = new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src =
        "https://www.google.com/recaptcha/api.js?render=" +
        encodeURIComponent(siteKey);
      script.async = true;
      script.onload = function () {
        resolve(true);
      };
      script.onerror = function () {
        console.warn(
          "[MAM quiz] reCAPTCHA failed to load — submitting unverified.",
        );
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return recaptchaLoad;
  }

  /** Resolves to a token, or null if unavailable. Never rejects. */
  function recaptchaToken() {
    var spam = window.MAM_CONFIG.spam || {};
    if (!spam.recaptchaSiteKey) return Promise.resolve(null);

    return loadRecaptcha().then(function (ready) {
      if (!ready || !window.grecaptcha) return null;
      return new Promise(function (resolve) {
        var settled = false;
        var done = function (value) {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        };
        /* Never let a hanging CAPTCHA hold the visitor's results hostage. */
        setTimeout(function () {
          done(null);
        }, 6000);
        window.grecaptcha.ready(function () {
          window.grecaptcha
            .execute(spam.recaptchaSiteKey, {
              action: spam.recaptchaAction || "quiz_submit",
            })
            .then(done, function (error) {
              console.warn("[MAM quiz] reCAPTCHA execute failed:", error);
              done(null);
            });
        });
      });
    });
  }

  /**
   * Advisory only — computed in the browser, therefore trivially forgeable.
   * n8n must treat this as a hint alongside its own server-side checks.
   * @returns {{signals:Object, client_spam_score:number}}
   */
  function spamSignals(lead, timing, honeypotFilled) {
    var spam = window.MAM_CONFIG.spam || {};
    var email = (lead.email || "").toLowerCase();
    var domain = email.split("@")[1] || "";
    var digits = (lead.phone || "").replace(/\D/g, "");

    var signals = {
      honeypot_filled: !!honeypotFilled,
      seconds_on_form: timing.secondsOnForm,
      seconds_total: timing.secondsTotal,
      faster_than_minimum: timing.secondsOnForm < (spam.minSecondsOnForm || 0),
      name_contains_url: /https?:\/\/|www\.|\[url|<a\s/i.test(lead.name || ""),
      name_has_no_letters: !/[a-z฀-๿]/i.test(lead.name || ""),
      email_domain: domain,
      email_disposable:
        (spam.disposableEmailDomains || []).indexOf(domain) !== -1,
      phone_repeated_digit: digits.length > 0 && /^(\d)\1+$/.test(digits),
      timezone: (function () {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
          return null;
        }
      })(),
    };

    var score = 0;
    if (signals.honeypot_filled) score += 60;
    if (signals.name_contains_url) score += 20;
    if (signals.faster_than_minimum) score += 25;
    if (signals.email_disposable) score += 15;
    if (signals.name_has_no_letters) score += 10;
    if (signals.phone_repeated_digit) score += 10;

    return { signals: signals, client_spam_score: Math.min(score, 100) };
  }

  function buildPayload(answers, lead, result, startedAt, security) {
    var answerBlock = {};
    Object.keys(answers).forEach(function (questionId) {
      var selected = answerIds(answers[questionId]);
      if (!selected.length) return;
      /* Downstream automations read answers.<questionId>.label, so the main
         answer keeps exactly the shape it has always had. A second selection is
         published beside it under a new key, which existing workflows ignore —
         the data is already flowing whenever a column is added for it. */
      answerBlock[questionId] = {
        id: selected[0],
        label: labelOf(questionId, selected[0]),
      };
      selected.slice(1).forEach(function (answerId, index) {
        answerBlock[questionId + "_" + (index + 2)] = {
          id: answerId,
          label: labelOf(questionId, answerId),
        };
      });
    });

    function serviceOut(id) {
      return {
        id: id,
        name: D.SERVICES[id].name,
        url: D.SERVICES[id].url,
        score: result.scores[id],
      };
    }

    return {
      source: "mam-service-quiz",
      version: 2,
      submitted_at: new Date().toISOString(),
      lead: {
        name: lead.name,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
      },
      answers: answerBlock,
      recommendation: {
        logic_version: result.logicVersion || 1,
        primary: serviceOut(result.primary),
        supporting: result.supporting.map(serviceOut),
        all_ranked: result.ranked.map(serviceOut),
        budget_tier: result.budgetNote ? result.budgetNote.tier : null,
        delivery: result.delivery || null,
        focus: result.focus || null,
        confidence: result.confidence || null,
        phases: result.phases || [],
      },
      meta: {
        page_url: window.location.href,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen: window.innerWidth + "x" + window.innerHeight,
        seconds_to_complete: Math.round((Date.now() - startedAt) / 1000),
        tracking: readTracking(),
      },
      /* Advisory. n8n MUST verify security.recaptcha.token server-side; every
         other value here was produced by the browser and can be faked. */
      security: security,
    };
  }

  /**
   * POST the lead to n8n. Never rejects — the visitor sees their results
   * regardless of what the automation layer does.
   * @returns {Promise<{ok:boolean, reason?:string}>}
   */
  function submit(payload) {
    var config = window.MAM_CONFIG;
    var url = config.webhookUrl;

    if (!url || url.indexOf("REPLACE_WITH") === 0) {
      console.warn(
        "[MAM quiz] No webhook configured — payload not sent:",
        payload,
      );
      return Promise.resolve({ ok: false, reason: "not-configured" });
    }

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, config.webhookTimeoutMs);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    })
      .then(function (response) {
        clearTimeout(timer);
        if (!response.ok) throw new Error("HTTP " + response.status);
        return { ok: true };
      })
      .catch(function (error) {
        clearTimeout(timer);
        console.error("[MAM quiz] Webhook failed:", error);
        return { ok: false, reason: String((error && error.message) || error) };
      });
  }

  /** Every option object behind an answer, in the order the visitor ranked them. */
  function answerOptions(questionId, answer) {
    var question = questionFor(questionId);
    if (!question) return [];
    return answerIds(answer)
      .map(function (answerId) {
        return optionFor(question, answerId);
      })
      .filter(Boolean);
  }

  /** The main option object for a given answer, or null. */
  function answerOption(questionId, answer) {
    return answerOptions(questionId, answer)[0] || null;
  }

  window.MAM_ENGINE = {
    score: score,
    buildPayload: buildPayload,
    submit: submit,
    labelOf: labelOf,
    answerIds: answerIds,
    answerOption: answerOption,
    answerOptions: answerOptions,
    bestScoreSignal: bestScoreSignal,
    loadRecaptcha: loadRecaptcha,
    recaptchaToken: recaptchaToken,
    spamSignals: spamSignals,
  };
})();
