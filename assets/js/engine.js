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
      /* Google's reCAPTCHA notice follows the page language (hl=th on /th/). */
      var pageLang = (document.documentElement.lang || "en").slice(0, 2);
      script.src =
        "https://www.google.com/recaptcha/api.js?render=" +
        encodeURIComponent(siteKey) +
        (pageLang === "en" ? "" : "&hl=" + encodeURIComponent(pageLang));
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

  /* ── The website's enquiry-form workflow ──────────────────────────────
     On moveaheadmedia.co.th and .com.au a lead goes where the website's own
     enquiry forms send theirs: n8n "MAM Forms => PIPEDRIVE". That workflow
     reads Quform's field names with a leading "_" and builds the Pipedrive
     person, lead and note from them, so a quiz lead is sent in that shape.
     The website's relay (deploy/relay/submit.php, served at
     /quiz/submit.php) adds _Form Name, _ip and _date and passes it on from
     the server, as WordPress does for Quform.
     ------------------------------------------------------------------ */

  function label(answer) {
    return (answer && answer.label) || "";
  }

  /** Pipedrive "Service Interest" options for the recommended services. */
  function serviceInterest(services) {
    var map = ((window.MAM_CONFIG.forms || {}).serviceInterest) || {};
    var out = [];
    (services || []).forEach(function (service) {
      Object.keys(map).forEach(function (option) {
        if (map[option].indexOf(service.id) !== -1 && out.indexOf(option) === -1) {
          out.push(option);
        }
      });
    });
    return out;
  }

  /**
   * The lead as the enquiry-form fields n8n "MAM Forms => PIPEDRIVE" reads.
   * Everything is a string; the note in Pipedrive lists every non-empty one.
   * @param {Object} payload  PLANNER.buildPayload(), plus .language and .market
   * @param {Object} utm      { utm_source, utm_medium, utm_campaign }
   */
  function formFields(payload, utm) {
    var forms = window.MAM_CONFIG.forms || {};
    var lead = payload.lead || {};
    var answers = payload.answers || {};
    var plan = payload.recommendation || {};
    var names = function (list) {
      return (list || []).map(function (service) { return service.name; });
    };
    utm = utm || {};

    /* Pipedrive gets "<Country Code> <Phone Number>". Like the website's
       phone field, the code defaults to the market's; a number typed with
       its own "+code " keeps it. */
    var phone = String(lead.phone || "").trim();
    var dialCode = (forms.dialCodes || {})[payload.market] || "";
    var typed = /^(\+\d{1,4})[\s.-]+(\S.*)$/.exec(phone);
    if (typed) { dialCode = typed[1]; phone = typed[2]; }
    else if (/^\+/.test(phone)) { dialCode = ""; }

    return {
      _Name: lead.name || "",
      "_Email address": lead.email || "",
      "_Country Code": dialCode,
      "_Phone Number": phone,
      _Website: lead.website || "",
      /* The quiz's budget answers are in THB on every page. */
      "_Monthly Project Budget (THB)": label(answers.budget),
      "_Service of interest": serviceInterest(plan.primaries).join(", "),
      "_Quiz: About you": label(answers.profile),
      "_Quiz: Business type": label(answers.type),
      "_Quiz: Goal": label(answers.objective),
      "_Quiz: Challenge": [label(answers.challenge), label(answers.challenge_2)]
        .filter(Boolean).join(" / "),
      "_Quiz: Recommended": names(plan.primaries).join(" + "),
      "_Quiz: Also in the plan": names(plan.supporting).join(", "),
      "_Quiz: Budget tier": plan.budget_tier || "",
      "_Quiz: Language": payload.language === "th" ? "Thai" : "English",
      _utm_source: utm.utm_source || "",
      _utm_medium: utm.utm_medium || "",
      _utm_campaign: utm.utm_campaign || "",
      /* The page address decides the Pipedrive label and owner
         (.co.th → Thailand, .com.au → Australia). */
      _formURL: (payload.meta && payload.meta.page_url) || "",
    };
  }

  /** The request body for the configured webhook format. */
  function requestBody(payload) {
    if (window.MAM_CONFIG.webhookFormat !== "mam-forms") return payload;
    var signals = (payload.security && payload.security.signals) || {};
    var utm = window.MAM_UTM ? window.MAM_UTM.values() : {};
    return {
      fields: formFields(payload, utm),
      lang: payload.language === "th" ? "th" : "en",
      /* A filled-in honeypot: the relay thanks the bot and sends nothing on. */
      hp: signals.honeypot_filled ? 1 : 0,
    };
  }

  /**
   * POST the lead to n8n (or to the website's relay). Never rejects — the
   * visitor sees their results regardless of what the automation layer does.
   * @returns {Promise<{ok:boolean, reason?:string}>}
   */
  function submit(payload) {
    var config = window.MAM_CONFIG;
    var url = config.webhookUrl;
    var body = requestBody(payload);

    if (!url || url.indexOf("REPLACE_WITH") === 0) {
      console.warn(
        "[MAM quiz] No webhook configured — payload not sent:",
        body,
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
      body: JSON.stringify(body),
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
    formFields: formFields,
    requestBody: requestBody,
    answerIds: answerIds,
    answerOption: answerOption,
    answerOptions: answerOptions,
    loadRecaptcha: loadRecaptcha,
    recaptchaToken: recaptchaToken,
    spamSignals: spamSignals,
  };
})();
