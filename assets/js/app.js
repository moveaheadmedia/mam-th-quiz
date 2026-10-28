/* ==========================================================================
   APP — screen flow, rendering and form handling.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.MAM_CONFIG;
  var D = window.MAM_DATA;
  var ENGINE = window.MAM_ENGINE;
  /* Logic v5. ENGINE is still used for reCAPTCHA, spam signals and the POST
     itself; everything about WHAT is recommended now comes from PLANNER. */
  var PLANNER = window.MAM_PLANNER;
  /* Every sentence on screen comes from T — English or Thai, decided by the
     page's <html lang>. See i18n.js. */
  var T = window.MAM_I18N;

  /* Shared by both languages, so switching language mid-quiz keeps the answers. */
  var STORAGE_KEY = 'mam-quiz-state-v3';
  var STEP_LABELS = [1, 2, 3, 4, 5].map(function (n) {
    return T.t('progress.step', { n: n });
  }).concat(T.t('progress.getResults'));

  var el = {
    stage: document.getElementById('stage'),
    stageNote: document.getElementById('stageNote'),
    progress: document.getElementById('progress'),
    progressSteps: document.getElementById('progressSteps'),
    progressFill: document.getElementById('progressFill')
  };

  var state = {
    screen: 'question',       // no splash screen — question 1 is the landing view
    index: 0,
    answers: {},
    lead: null,
    result: null,
    startedAt: Date.now(),
    formShownAt: 0,
    delivery: null,
    notice: ''                // transient message under a multi-select question
  };

  /* ── Helpers ────────────────────────────────────────────────────────── */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(paths, extraClass) {
    return '<svg class="icon ' + (extraClass || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>';
  }

  function save() {
    if (!CFG.persistAnswers) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen: state.screen === 'results' ? 'results' : state.screen,
        index: state.index,
        answers: state.answers,
        lead: state.lead,
        startedAt: state.startedAt
      }));
    } catch (e) { /* private mode — progress simply isn't remembered */ }
  }

  function restore() {
    if (!CFG.persistAnswers) return;
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || !saved.answers) return;
      state.answers = saved.answers;
      /* Logic v7 merged two goals into one — carry an answer saved under an
         old goal id across, so the goal step still shows it as chosen. */
      var alias = (D.OBJECTIVE_ALIASES || {})[state.answers.objective];
      if (alias) state.answers.objective = alias;
      state.startedAt = saved.startedAt || Date.now();
      state.index = Math.min(saved.index || 0, D.QUESTIONS.length);
      var restored = PLANNER.plan(state.answers);
      if (saved.screen === 'results' && saved.lead && restored.isComplete) {
        state.lead = saved.lead;
        state.result = restored;
        state.screen = 'results';
      } else if (saved.screen === 'form' && answeredCount() === D.QUESTIONS.length &&
                 restored.isComplete) {
        state.screen = 'form';
      } else if (answeredCount() > 0) {
        state.screen = 'question';
      }
    } catch (e) { /* ignore corrupt state */ }
  }

  function chosenIds(questionId) {
    return ENGINE.answerIds(state.answers[questionId]);
  }

  function answeredCount() {
    return D.QUESTIONS.filter(function (q) { return chosenIds(q.id).length > 0; }).length;
  }

  function announceHeight() {
    if (!CFG.embedResize || window.parent === window) return;
    var height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'mam-quiz:height', height: height }, '*');
  }

  function scrollToTop() {
    if (window.parent !== window) return;   // the host page controls scroll when embedded
    var top = el.progress.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  }

  /* ── Progress bar ───────────────────────────────────────────────────── */

  function currentStepNumber() {
    if (state.screen === 'question') return state.index + 1;
    if (state.screen === 'form') return 6;      // lead form — the "Get results" step
    return 7;                                   // results — everything complete
  }

  function renderProgress() {
    el.progress.hidden = false;
    var step = currentStepNumber();

    el.progressSteps.innerHTML = STEP_LABELS.map(function (label, i) {
      var number = i + 1;
      var done = step > number;
      var active = step === number;
      var caption = i < D.QUESTIONS.length ? T.question(D.QUESTIONS[i]).shortLabel : T.t('progress.yourPlan');
      return '' +
        '<li class="pstep ' + (done ? 'is-done ' : '') + (active ? 'is-active' : '') + '"' +
            (active ? ' aria-current="step"' : '') + '>' +
          '<span class="pstep__dot">' + (done ? icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') : number) + '</span>' +
          '<span class="pstep__text"><span class="pstep__label">' + esc(label) + '</span>' +
          '<span class="pstep__caption">' + esc(caption) + '</span></span>' +
        '</li>';
    }).join('');

    var pct = Math.min(100, Math.max(0, ((step - 1) / (STEP_LABELS.length - 1)) * 100));
    el.progressFill.style.width = pct + '%';
    el.progressSteps.setAttribute('aria-label', T.t('progress.aria', { n: Math.min(step, 6) }));
  }

  /* ── Screens ────────────────────────────────────────────────────────── */

  /* Shown under question 1 only. The splash screen used to carry this proof;
     it still has to land before the visitor decides whether to answer. */
  function trustHTML() {
    var reviews = CFG.reviews || {};
    return '' +
    '<ul class="trust">' +
      '<li>' + icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') + esc(T.t('trust.time')) + '</li>' +
      '<li>' + icon('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8L12 3Z"/>') +
        esc(T.t('trust.reviews', { rating: reviews.rating, count: reviews.count })) + '</li>' +
      '<li>' + icon('<path d="M4 7.5 12 4l8 3.5v5c0 4.4-3.3 7.6-8 8.5-4.7-.9-8-4.1-8-8.5v-5Z"/><path d="m9 12 2 2 4-4"/>') + esc(T.t('trust.noHardSell')) + '</li>' +
    '</ul>' +
    '<p class="trust__meta">' + esc(T.t('trust.clients')) + '</p>';
  }

  function questionHTML() {
    var question = D.QUESTIONS[state.index];
    var copy = T.question(question);
    var multi = !!question.multi;
    var limit = multi ? (question.maxSelections || 1) : 1;
    var chosen = chosenIds(question.id);

    var options = question.options.map(function (option, i) {
      /* Position in the list is the rank: 1 is the answer the visitor called
         their main one, and it scores accordingly. 0 means unselected. */
      var rank = chosen.indexOf(option.id) + 1;
      var selected = rank > 0;
      var stateClass = selected ? (multi ? ' is-rank' + rank : ' is-selected') : '';
      var answer = T.option(question.id, option);
      /* Only the challenge step ranks its answers, so only it gets a badge. */
      var rankLabel = !multi ? '' : rank === 1 ? T.t('multi.main') : rank === 2 ? T.t('multi.also') : '';
      return '' +
      '<button type="button" class="option' + stateClass + '"' +
        (multi
          ? ' role="checkbox" aria-checked="' + selected + '"'
          : ' role="radio" aria-checked="' + selected + '" tabindex="' +
            (selected || (!chosen.length && i === 0) ? '0' : '-1') + '"') +
        ' data-option="' + esc(option.id) + '">' +
        '<span class="option__key" aria-hidden="true">' +
          (multi && selected ? rank : String.fromCharCode(65 + i)) + '</span>' +
        '<span class="option__body">' +
          '<span class="option__label">' + esc(answer.label) + '</span>' +
          (rankLabel ? '<span class="option__rank">' + esc(rankLabel) + '</span>' : '') +
          '<span class="option__desc">' + esc(answer.desc) + '</span>' +
        '</span>' +
        '<span class="option__check" aria-hidden="true">' + icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') + '</span>' +
      '</button>';
    }).join('');

    /* Every step says what to do next. Neither "up to two" nor "you still have
       to press Continue" should have to be inferred from the tick marks. */
    var text;
    if (multi) {
      text = state.notice ||
        (chosen.length === 0
          ? T.t('multi.hintEmpty')
          : needsPartner(question.id)
            ? T.t('multi.hintNeedsSecond')
            : chosen.length < limit
              ? T.t('multi.hintAddSecond')
              : T.t('multi.hintBoth'));
    } else {
      text = chosen.length === 0 ? T.t('hint.choose') : T.t('hint.change');
    }
    var warn = !!state.notice || needsPartner(question.id);
    var hint = '<p class="options__hint' + (warn ? ' options__hint--warn' : '') +
      '" role="status">' + esc(text) + '</p>';

    return '' +
    '<section class="card card--question">' +
      '<p class="eyebrow">' + esc(T.t('question.eyebrow', { n: state.index + 1, 'short label': copy.shortLabel })) + '</p>' +
      '<h1 class="question__title">' + esc(copy.title) + '</h1>' +
      '<p class="question__subtitle">' + esc(copy.subtitle) + '</p>' +
      '<div class="options" role="' + (multi ? 'group' : 'radiogroup') + '"' +
        ' aria-label="' + esc(copy.title) + '">' + options + '</div>' + hint +
      /* Question 1 with nothing chosen has neither button — emitting the nav
         anyway would leave a divider rule above empty space. */
      (state.index > 0 || chosen.length
        ? '<div class="card__nav">' +
            (state.index > 0
              ? '<button type="button" class="btn btn--text" data-action="back">' +
                  icon('<path d="M19 12H6"/><path d="m11.5 6-6 6 6 6"/>', 'icon--arrow-back') + esc(T.t('nav.back')) + '</button>'
              : '<span></span>') +
            (chosen.length && !needsPartner(question.id)
              ? '<button type="button" class="btn btn--primary" data-action="next">' + esc(T.t('nav.continue')) +
                icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</button>'
              : '') +
          '</div>'
        : '') +
    '</section>' +
    (state.index === 0 ? trustHTML() : '');
  }

  function formHTML() {
    var lead = state.lead || {};
    function field(name, label, type, placeholder, hint, required) {
      return '' +
      '<div class="field">' +
        '<label class="field__label" for="f-' + name + '">' + esc(label) +
          (required ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__opt">' + esc(T.t('form.optional')) + '</span>') + '</label>' +
        '<input class="field__input" id="f-' + name + '" name="' + name + '" type="' + type + '"' +
          ' placeholder="' + esc(placeholder) + '" value="' + esc(lead[name] || '') + '"' +
          (required ? ' required' : '') + ' autocomplete="' +
          ({ name: 'name', email: 'email', phone: 'tel', website: 'url' }[name] || 'on') + '">' +
        (hint ? '<p class="field__hint">' + esc(hint) + '</p>' : '') +
        '<p class="field__error" id="e-' + name + '" role="alert"></p>' +
      '</div>';
    }

    /* Google's policy pages open in the visitor's language. */
    var googleLang = T.lang === 'en' ? '' : '?hl=' + T.lang;
    function googleLink(page, key) {
      return '<a href="https://policies.google.com/' + page + googleLang + '" target="_blank" rel="noopener">' +
        esc(T.t(key)) + '</a>';
    }

    return '' +
    '<section class="card card--form">' +
      '<p class="eyebrow">' + esc(T.t('form.eyebrow')) + '</p>' +
      '<h1 class="question__title">' + esc(T.t('form.title')) + '</h1>' +
      '<p class="question__subtitle">' + esc(T.t('form.subtitle')) + '</p>' +
      '<form class="form" id="leadForm" novalidate>' +
        '<div class="form__grid">' +
          field('name', T.t('form.name'), 'text', T.t('form.namePlaceholder'), '', true) +
          field('email', T.t('form.email'), 'email', 'you@company.com', '', true) +
          field('phone', T.t('form.phone'), 'tel', '08X XXX XXXX', '', true) +
          field('website', T.t('form.website'), 'text', 'yourcompany.com', T.t('form.websiteHint'), false) +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Do not fill this in<input type="text" name="company_fax" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form__error" id="formError" role="alert"></p>' +
        '<button type="submit" class="btn btn--primary btn--lg btn--block" id="submitBtn">' +
          esc(T.t('form.submit')) + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') +
        '</button>' +
        '<p class="form__consent">' + esc(T.t('form.consent')) + '</p>' +
        /* Required by Google whenever reCAPTCHA runs — shown only when it does. */
        ((CFG.spam || {}).recaptchaSiteKey
          ? '<p class="form__legal">' + T.html('form.recaptcha', {
              privacy: googleLink('privacy', 'form.privacy'),
              terms: googleLink('terms', 'form.terms')
            }) + '</p>'
          : '') +
      '</form>' +
      '<div class="card__nav card__nav--form">' +
        '<button type="button" class="btn btn--text" data-action="back">' +
          icon('<path d="M19 12H6"/><path d="m11.5 6-6 6 6 6"/>', 'icon--arrow-back') + esc(T.t('nav.back')) + '</button>' +
      '</div>' +
    '</section>';
  }

  /* The name a visitor sees for a service, in the page's language. */
  function serviceName(id) {
    return D.CATALOGUE[id] ? T.service(id).name : null;
  }

  function serviceCardHTML(serviceId, variant) {
    var service = D.CATALOGUE[serviceId];
    var copy = T.service(serviceId);
    var reason = T.reason(PLANNER.reasonKeyFor(state.result, serviceId),
      PLANNER.reasonFor(state.result, serviceId));
    var chips = copy.deliverables.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');
    /* Platform choice is made in the consultation, not by four questions. */
    var platforms = (service.platforms || []).map(serviceName).filter(Boolean);

    return '' +
    '<article class="rec rec--' + variant + '">' +
      '<div class="rec__head">' +
        '<span class="rec__icon">' + icon(service.icon) + '</span>' +
        '<div>' +
          '<p class="rec__kicker">' + esc(copy.kicker) + '</p>' +
          '<h3 class="rec__name">' + esc(copy.name) + '</h3>' +
        '</div>' +
      '</div>' +
      '<p class="rec__blurb">' + esc(copy.blurb) + '</p>' +
      (reason ? '<p class="rec__reason">' + icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') +
        '<span>' + T.html('card.because', { reason: '<strong>' + esc(reason) + '</strong>' }) + '</span></p>' : '') +
      '<ul class="rec__chips">' + chips + '</ul>' +
      (platforms.length ? '<p class="rec__platforms">' +
        esc(T.t('card.platforms', { 'platform names': platforms.join(' \u00b7 ') })) + '</p>' : '') +
      (service.url ? '<a class="rec__link" href="' + esc(service.url) + '" target="_blank" rel="noopener">' +
        esc(copy.linkText || T.t('card.explore', { 'service name': copy.name })) +
        icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</a>' : '') +
    '</article>';
  }

  /* ── Chat button (logic v7) ─────────────────────────────────────────────
     TH shows LINE, AU shows WhatsApp — the `market` setting in config.js.
     The chat opens with the plan already typed so the team has the context:
     service names only, never the visitor's name, email or phone. */
  function chatButtonHTML(result) {
    var chat = (CFG.chat || {})[CFG.market];
    if (!chat) return '';
    var names = (result.all || []).map(serviceName).filter(Boolean);
    var message = T.t('chat.message', { 'service names': names.join(' + ') });
    var href = '';
    if (chat.app === 'line') {
      /* LINE's pre-typed-message link only works inside the LINE app. On a
         computer it falls back to LINE's homepage, so computers open the
         account page instead and phones get the pre-typed chat. */
      var onPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      href = onPhone && chat.lineId
        ? 'https://line.me/R/oaMessage/' + chat.lineId + '/?' + encodeURIComponent(message)
        : chat.pageUrl || '';
    } else if (chat.app === 'whatsapp') {
      var number = String(chat.number || '').replace(/\D/g, '');
      if (number) href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
    }
    if (!href) return '';
    return '<a class="btn btn--lg btn--chat btn--chat-' + esc(chat.app) + '" href="' + esc(href) +
      '" target="_blank" rel="noopener">' + icon(D.ICONS.chat, 'icon--chat') + esc(T.t('chat.' + chat.app)) + '</a>';
  }

  function resultsHTML() {
    var result = state.result;
    var firstName = (state.lead.name || '').trim().split(/\s+/)[0] || T.t('results.nameFallback');
    /* The answers' own words, in the page's language. */
    function answerText(questionId) {
      var option = ENGINE.answerOption(questionId, state.answers[questionId]);
      return option ? T.option(questionId, option) : null;
    }
    var typeOption = answerText('type');
    /* v6 reads the two answers together: the goal, then the problem. */
    var objectiveOption = answerText('objective');
    var challengeOption = answerText('challenge');
    var phrases = [
      objectiveOption && objectiveOption.phrase,
      challengeOption && challengeOption.phrase,
    ].filter(Boolean);
    var noun = (typeOption && typeOption.noun) || T.t('lead.fallbackNoun');
    /* English grammar only — the Thai sentence has no slot for it. */
    var article = /^[aeiou]/i.test(noun) ? 'an' : 'a';
    var challenge = phrases.length
      ? phrases.join(T.t('lead.and'))
      : T.t('lead.fallbackSituation');
    var note = T.budgetNote(state.answers.budget);
    var quota = result.quota || { label: 'Start here', nextLabel: 'Then add' };

    /* One or two primaries, one or two supporting — the budget decides how
       many, never which. Both primaries carry equal weight. */
    var primaryCards = result.primaries.map(function (id) {
      return serviceCardHTML(id, 'primary');
    }).join('');
    var support = result.supporting.map(function (id) {
      return serviceCardHTML(id, 'support');
    }).join('');

    /* Services a strategist would raise in the meeting. Named, linked, and
       explicitly not presented as something the quiz chose. */
    var also = (result.alsoRelevant || []).map(function (id) {
      var service = D.CATALOGUE[id];
      if (!service) return '';
      return service.url
        ? '<a href="' + esc(service.url) + '" target="_blank" rel="noopener">' + esc(serviceName(id)) + '</a>'
        : '<span>' + esc(serviceName(id)) + '</span>';
    }).filter(Boolean).join('<i aria-hidden="true">\u00b7</i>');

    var overlays = (result.overlays || []).map(function (item) {
      var copy = T.overlay(item);
      return '<li><strong>' + esc(copy.label) + '</strong> ' + esc(copy.note) + '</li>';
    }).join('');

    var deliveryWarning = state.delivery && !state.delivery.ok && state.delivery.reason !== 'not-configured'
      ? '<p class="notice notice--warn">' + T.html('results.deliveryWarning', {
          email: '<a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a>'
        }) + '</p>'
      : '';

    return '' +
    '<section class="card card--results">' +
      deliveryWarning +
      '<p class="eyebrow">' + esc(T.t('results.eyebrow')) + '</p>' +
      '<h1 class="results__title">' + esc(T.t('results.title', { 'first name': firstName })) + '</h1>' +
      '<p class="results__lead">' + T.html('lead.start', {
          article: esc(article),
          'business words': '<strong>' + esc(noun) + '</strong>',
          situation: esc(challenge)
        }) +
        esc(T.t(result.consultation
          /* v7 — no goal and no problem yet: the plan is a conversation. */
          ? 'lead.endConsult'
          : result.primaries.length > 1 ? 'lead.endPair' : 'lead.endSingle')) + '</p>' +

      '<p class="results__rank">' + esc(T.planLabel(quota.label)) + '</p>' +
      '<div class="results__primary' +
        (result.primaries.length > 1 ? ' results__primary--pair' : '') + '">' +
        primaryCards +
      '</div>' +

      (support ? '<p class="results__rank results__rank--support">' + esc(T.planLabel(quota.nextLabel)) + '</p>' +
        '<div class="results__support">' + support + '</div>' : '') +

      (overlays ? '<div class="overlays"><p class="overlays__title">' + esc(T.t('results.overlaysTitle')) + '</p>' +
        '<ul class="overlays__list">' + overlays + '</ul></div>' : '') +

      /* The budget note is about funding services, so a consultation plan
         (v7) skips it — sizing the budget is part of the conversation. */
      (note && !result.consultation ? '<div class="budget-note">' +
        '<p class="budget-note__tier">' + esc(note.tier) + '</p>' +
        '<p class="budget-note__text">' + esc(note.text) + '</p>' +
      '</div>' : '') +

      (also ? '<p class="results__also"><span>' + esc(T.t('results.also')) + '</span> ' +
        also + '</p>' : '') +

      '<div class="cta">' +
        /* v7 — "I'm not sure what's wrong": the consultation box speaks to
           that directly (the reviewer's Audit + Free Strategy Consultation). */
        (result.challenge === 'unsure'
          ? '<h2 class="cta__title">' + esc(T.t('cta.unsureTitle')) + '</h2>' +
            '<p class="cta__text">' + esc(T.t('cta.unsureText')) + '</p>'
          : '<h2 class="cta__title">' + esc(T.t('cta.title')) + '</h2>' +
            '<p class="cta__text">' + esc(T.t('cta.text')) + '</p>') +
        '<div class="cta__actions">' +
          '<a class="btn btn--primary btn--lg" href="' + esc(CFG.consultationUrl) + '" target="_blank" rel="noopener">' +
            esc(T.t('cta.book')) + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</a>' +
          '<a class="btn btn--ghost btn--lg" href="' + esc(CFG.phoneHref) + '">' + esc(T.t('cta.call', { phone: CFG.phone })) + '</a>' +
          chatButtonHTML(result) +
        '</div>' +
        '<p class="cta__meta"><a href="' + esc(CFG.caseStudiesUrl) + '" target="_blank" rel="noopener">' +
          esc(T.t('cta.caseStudies')) + '</a></p>' +
      '</div>' +

      '<div class="card__nav card__nav--results">' +
        '<button type="button" class="btn btn--text" data-action="restart">' + esc(T.t('cta.retake')) + '</button>' +
      '</div>' +
    '</section>';
  }

  /* ── Analytics ──────────────────────────────────────────────────────── */

  /* dataLayer events for Google Tag Manager; the live pages load the
     website's container. Nothing personal is pushed — no name, email or
     phone. GTM needs a Custom Event trigger on these names to use them:
       mam_quiz_step  a new screen: quiz_step 1–5 = questions, 6 = the form,
                      7 = results; quiz_screen = question id, form or results
       mam_quiz_lead  the lead form was sent; quiz_delivered false means the
                      relay or n8n did not confirm it */
  var lastScreen = null;

  function track(event, data) {
    var item = { event: event, quiz_market: CFG.market, quiz_language: T.lang };
    for (var key in data) item[key] = data[key];
    (window.dataLayer = window.dataLayer || []).push(item);
  }

  function trackScreen() {
    var screen = state.screen === 'question' ? D.QUESTIONS[state.index].id : state.screen;
    if (screen === lastScreen) return;
    lastScreen = screen;
    track('mam_quiz_step', { quiz_step: currentStepNumber(), quiz_screen: screen });
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  function render(focusTarget) {
    var html;
    if (state.screen === 'question') html = questionHTML();
    else if (state.screen === 'form') html = formHTML();
    else html = resultsHTML();

    el.stage.innerHTML = html;
    el.stage.firstElementChild.classList.add('is-entering');

    renderProgress();
    el.stageNote.textContent = state.screen === 'question' || state.screen === 'form'
      ? T.t('stage.note') : '';

    if (state.screen === 'form') {
      state.formShownAt = Date.now();
      /* Fetch the reCAPTCHA script while the visitor types, so requesting a
         token at submit time costs nothing. */
      ENGINE.loadRecaptcha();
    }
    if (focusTarget !== false) {
      var heading = el.stage.querySelector('h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    announceHeight();
    trackScreen();
  }

  /* ── Flow ───────────────────────────────────────────────────────────── */

  function goToQuestion(index) {
    state.screen = 'question';
    state.index = index;
    state.notice = '';
    save();
    render();
    scrollToTop();
  }

  function needsPartner(questionId) {
    var chosen = chosenIds(questionId);
    if (!chosen.length) return false;
    var main = ENGINE.answerOption(questionId, chosen[0]);
    return !!(main && main.requiresSecond && chosen.length < 2);
  }

  function advance() {
    var questionId = D.QUESTIONS[state.index].id;
    if (!chosenIds(questionId).length) return;
    if (needsPartner(questionId)) {
      state.notice = T.t('multi.noticeNeedsSecond');
      render(false);
      return;
    }
    state.notice = '';
    if (state.index < D.QUESTIONS.length - 1) {
      goToQuestion(state.index + 1);
    } else {
      state.screen = 'form';
      save();
      render();
      scrollToTop();
    }
  }

  function goBack() {
    if (state.screen === 'form') { goToQuestion(D.QUESTIONS.length - 1); return; }
    if (state.index > 0) { goToQuestion(state.index - 1); }
    /* Question 1 is the landing view, so there is nowhere further back. */
  }

  /* Picking an answer never moves the visitor on. Changing your mind after
     the page has already jumped is a bad experience, and on the challenge
     step there may be a second answer still to add — so Continue is always
     an explicit choice. */
  function selectOption(optionId) {
    var question = D.QUESTIONS[state.index];
    state.answers[question.id] = optionId;
    state.notice = '';
    save();
    render(false);

    var again = el.stage.querySelector('.option[data-option="' + optionId + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  function toggleOption(optionId) {
    var question = D.QUESTIONS[state.index];
    var limit = question.maxSelections || 1;
    var option = ENGINE.answerOption(question.id, optionId);
    var chosen = chosenIds(question.id);
    var at = chosen.indexOf(optionId);

    state.notice = '';

    if (at !== -1) {
      /* Deselecting the main answer promotes the second one — the list order
         is the ranking, so there is never a gap at the top. */
      chosen.splice(at, 1);
    } else if (option && option.requiresSecond) {
      /* "I'm not sure where to start" is always the main answer — it cannot
         be a second thought. Anything already picked becomes the second. */
      chosen = [optionId].concat(chosen).slice(0, limit);
    } else if (option && option.exclusive) {
      chosen = [optionId];
    } else {
      chosen = chosen.filter(function (id) {
        var other = ENGINE.answerOption(question.id, id);
        return !(other && other.exclusive && !other.requiresSecond);
      });
      if (chosen.length >= limit) {
        state.notice = T.t('multi.noticeLimit', { n: limit });
      } else {
        chosen.push(optionId);
      }
    }

    state.answers[question.id] = chosen;
    save();
    render(false);

    /* Every card is redrawn because the rank badges shift, so put focus back
       where the visitor left it. */
    var again = el.stage.querySelector('.option[data-option="' + optionId + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  function restart() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    state.answers = {};
    state.lead = null;
    state.result = null;
    state.delivery = null;
    state.startedAt = Date.now();
    state.index = 0;
    state.screen = 'question';
    render();
    scrollToTop();
  }

  /* ── Form handling ──────────────────────────────────────────────────── */

  var VALIDATORS = {
    name: function (value) {
      return value.trim().length >= 2 ? '' : T.t('error.name');
    },
    email: function (value) {
      if (!value.trim()) return T.t('error.emailEmpty');
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : T.t('error.emailInvalid');
    },
    phone: function (value) {
      var digits = value.replace(/\D/g, '');
      if (!digits) return T.t('error.phoneEmpty');
      return digits.length >= 8 ? '' : T.t('error.phoneShort');
    },
    website: function (value) {
      if (!value.trim()) return '';
      return /^([a-z][a-z0-9+.-]*:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value.trim())
        ? '' : T.t('error.website');
    }
  };

  function normaliseWebsite(value) {
    var trimmed = value.trim();
    if (!trimmed) return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
  }

  function showFieldError(name, message) {
    var input = document.getElementById('f-' + name);
    var error = document.getElementById('e-' + name);
    if (!input || !error) return;
    error.textContent = message;
    input.classList.toggle('is-invalid', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function handleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var values = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      website: form.website.value
    };

    var firstBad = null;
    Object.keys(VALIDATORS).forEach(function (key) {
      var message = VALIDATORS[key](values[key]);
      showFieldError(key, message);
      if (message && !firstBad) firstBad = key;
    });
    if (firstBad) {
      document.getElementById('f-' + firstBad).focus();
      return;
    }

    var button = document.getElementById('submitBtn');
    if (button.disabled) return;                       // guard against double-submit
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(T.t('form.loading'));

    state.lead = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      website: normaliseWebsite(values.website)
    };
    state.result = PLANNER.plan(state.answers);

    /* Signals are attached, never enforced — n8n decides. Blocking here would
       mean a mistuned heuristic silently costs a real lead. */
    var timing = {
      secondsOnForm: Math.round((Date.now() - state.formShownAt) / 100) / 10,
      secondsTotal: Math.round((Date.now() - state.startedAt) / 1000)
    };
    var assessment = ENGINE.spamSignals(state.lead, timing, form.company_fax.value);

    ENGINE.recaptchaToken().then(function (token) {
      var spam = CFG.spam || {};
      var payload = PLANNER.buildPayload(state.answers, state.lead, state.result, state.startedAt, {
        recaptcha: {
          provider: 'recaptcha-v3',
          configured: !!spam.recaptchaSiteKey,
          action: spam.recaptchaAction || 'quiz_submit',
          token: token
        },
        signals: assessment.signals,
        client_spam_score: assessment.client_spam_score
      });
      /* Which page the lead came from: language "en"/"th", market "TH"/"AU".
         Everything else in the payload stays English on every page, so the
         lead table reads the same (D-02). */
      payload.language = T.lang;
      payload.market = CFG.market;
      return ENGINE.submit(payload);
    }).then(function (delivery) {
      state.delivery = delivery;
      track('mam_quiz_lead', {
        quiz_delivered: !!delivery.ok,
        quiz_recommended: state.result.primaries.join(' + '),
        quiz_budget: chosenIds('budget')[0] || ''
      });
      state.screen = 'results';
      save();
      render();
      scrollToTop();
    });
  }

  /* ── Events ─────────────────────────────────────────────────────────── */

  el.stage.addEventListener('click', function (event) {
    var option = event.target.closest('.option');
    if (option) {
      var current = D.QUESTIONS[state.index];
      if (state.screen === 'question' && current && current.multi) {
        toggleOption(option.getAttribute('data-option'));
      } else {
        selectOption(option.getAttribute('data-option'));
      }
      return;
    }

    var action = event.target.closest('[data-action]');
    if (!action) return;
    var name = action.getAttribute('data-action');
    if (name === 'next') { advance(); }
    else if (name === 'back') { goBack(); }
    else if (name === 'restart') { restart(); }
  });

  el.stage.addEventListener('submit', function (event) {
    if (event.target.id === 'leadForm') handleSubmit(event);
  });

  el.stage.addEventListener('input', function (event) {
    var input = event.target;
    if (!input.name || !VALIDATORS[input.name]) return;
    if (input.classList.contains('is-invalid')) showFieldError(input.name, VALIDATORS[input.name](input.value));
  });

  /* Arrow-key navigation inside the radio group. */
  el.stage.addEventListener('keydown', function (event) {
    var option = event.target.closest('.option');
    if (!option) return;
    var current = D.QUESTIONS[state.index];
    if (state.screen === 'question' && current && current.multi) return;
    var keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    var all = Array.prototype.slice.call(el.stage.querySelectorAll('.option'));
    var next = all[(all.indexOf(option) + keys[event.key] + all.length) % all.length];
    next.focus();
  });

  window.addEventListener('resize', announceHeight);

  /* ── Boot ───────────────────────────────────────────────────────────── */

  document.getElementById('year').textContent = new Date().getFullYear();
  /* The EN | TH switch keeps the campaign tags (utm_…, gclid) in the address. */
  Array.prototype.forEach.call(document.querySelectorAll('.lang-switch a'), function (link) {
    if (window.location.search) link.setAttribute('href', link.getAttribute('href') + window.location.search);
  });
  restore();
  render(false);
})();
