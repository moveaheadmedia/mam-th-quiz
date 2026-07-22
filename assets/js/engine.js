/* ==========================================================================
   ENGINE — turns answers into a ranked set of service recommendations.

   Scoring is additive: every chosen option contributes points to services,
   the challenge question counts double, and mismatched services can be
   pushed down with negative weights (e.g. Local SEO for an e-commerce brand).
   ========================================================================== */
(function () {
  'use strict';

  var D = window.MAM_DATA;

  function optionFor(question, answerId) {
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].id === answerId) return question.options[i];
    }
    return null;
  }

  /**
   * @param {Object} answers  { profile:'sme', type:'local', budget:'under50', challenge:'leads' }
   * @returns {Object} { scores, ranked, primary, supporting, reasons, budgetNote }
   */
  function score(answers) {
    var scores = {};
    var contributions = {};   // serviceId -> [{ questionId, optionLabel, points }]

    D.QUESTIONS.forEach(function (question) {
      var option = optionFor(question, answers[question.id]);
      if (!option) return;
      var multiplier = question.weightMultiplier || 1;

      Object.keys(option.weights).forEach(function (serviceId) {
        var points = option.weights[serviceId] * multiplier;
        scores[serviceId] = (scores[serviceId] || 0) + points;
        if (points > 0) {
          (contributions[serviceId] = contributions[serviceId] || []).push({
            questionId: question.id,
            optionId: option.id,
            optionLabel: option.label,
            points: points
          });
        }
      });
    });

    var ranked = Object.keys(scores)
      .filter(function (id) { return scores[id] > 0 && D.SERVICES[id]; })
      .sort(function (a, b) {
        if (scores[b] !== scores[a]) return scores[b] - scores[a];
        return D.PRIORITY.indexOf(a) - D.PRIORITY.indexOf(b);
      });

    var primary = ranked[0];
    var supporting = ranked
      .filter(function (id) { return id !== primary && D.PRIMARY_ONLY.indexOf(id) === -1; })
      .slice(0, 2);

    return {
      scores: scores,
      ranked: ranked,
      primary: primary,
      supporting: supporting,
      /* Why each recommended service surfaced — used for the result copy. */
      reasonFor: function (serviceId) {
        var list = contributions[serviceId] || [];
        if (!list.length) return '';
        var top = list.slice().sort(function (a, b) { return b.points - a.points; })[0];
        return top.optionLabel.replace(/\.$/, '');
      },
      budgetNote: D.BUDGET_NOTES[answers.budget] || null
    };
  }

  /* ── Lead payload sent to n8n ──────────────────────────────────────── */

  function readTracking() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']
      .forEach(function (key) { if (params.get(key)) utm[key] = params.get(key); });
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

  function buildPayload(answers, lead, result, startedAt) {
    var answerBlock = {};
    Object.keys(answers).forEach(function (questionId) {
      answerBlock[questionId] = { id: answers[questionId], label: labelOf(questionId, answers[questionId]) };
    });

    function serviceOut(id) {
      return { id: id, name: D.SERVICES[id].name, url: D.SERVICES[id].url, score: result.scores[id] };
    }

    return {
      source: 'mam-service-quiz',
      version: 1,
      submitted_at: new Date().toISOString(),
      lead: {
        name: lead.name,
        website: lead.website,
        email: lead.email,
        phone: lead.phone
      },
      answers: answerBlock,
      recommendation: {
        primary: serviceOut(result.primary),
        supporting: result.supporting.map(serviceOut),
        all_ranked: result.ranked.map(serviceOut),
        budget_tier: result.budgetNote ? result.budgetNote.tier : null
      },
      meta: {
        page_url: window.location.href,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen: window.innerWidth + 'x' + window.innerHeight,
        seconds_to_complete: Math.round((Date.now() - startedAt) / 1000),
        tracking: readTracking()
      }
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

    if (!url || url.indexOf('REPLACE_WITH') === 0) {
      console.warn('[MAM quiz] No webhook configured — payload not sent:', payload);
      return Promise.resolve({ ok: false, reason: 'not-configured' });
    }

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, config.webhookTimeoutMs);

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true
    }).then(function (response) {
      clearTimeout(timer);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return { ok: true };
    }).catch(function (error) {
      clearTimeout(timer);
      console.error('[MAM quiz] Webhook failed:', error);
      return { ok: false, reason: String(error && error.message || error) };
    });
  }

  /** The full option object for a given answer, or null. */
  function answerOption(questionId, answerId) {
    for (var i = 0; i < D.QUESTIONS.length; i++) {
      if (D.QUESTIONS[i].id === questionId) return optionFor(D.QUESTIONS[i], answerId);
    }
    return null;
  }

  window.MAM_ENGINE = {
    score: score, buildPayload: buildPayload, submit: submit,
    labelOf: labelOf, answerOption: answerOption
  };
})();
