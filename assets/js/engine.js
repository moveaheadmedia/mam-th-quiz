/* ==========================================================================
   LEAD DELIVERY — answer helpers, spam signals, reCAPTCHA and the POST to n8n.

   This file used to score the recommendation too. It no longer does: every
   decision about WHAT is recommended now lives in planner.js, written as
   readable business rules instead of weights. What remains here is the
   plumbing that gets a finished plan safely to n8n.

   The MAM_ENGINE name is kept so app.js keeps working unchanged.
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
    submit: submit,
    answerIds: answerIds,
    answerOption: answerOption,
    answerOptions: answerOptions,
    loadRecaptcha: loadRecaptcha,
    recaptchaToken: recaptchaToken,
    spamSignals: spamSignals,
  };
})();
