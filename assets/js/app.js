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

  var STORAGE_KEY = 'mam-quiz-state-v3';
  var STEP_LABELS = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Get results'];

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
      var caption = i < D.QUESTIONS.length ? D.QUESTIONS[i].shortLabel : 'Your plan';
      return '' +
        '<li class="pstep ' + (done ? 'is-done ' : '') + (active ? 'is-active' : '') + '"' +
            (active ? ' aria-current="step"' : '') + '>' +
          '<span class="pstep__dot">' + (done ? icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') : number) + '</span>' +
          '<span class="pstep__text"><span class="pstep__label">' + label + '</span>' +
          '<span class="pstep__caption">' + esc(caption) + '</span></span>' +
        '</li>';
    }).join('');

    var pct = Math.min(100, Math.max(0, ((step - 1) / (STEP_LABELS.length - 1)) * 100));
    el.progressFill.style.width = pct + '%';
    el.progressSteps.setAttribute('aria-label', 'Step ' + Math.min(step, 6) + ' of 6');
  }

  /* ── Screens ────────────────────────────────────────────────────────── */

  /* Shown under question 1 only. The splash screen used to carry this proof;
     it still has to land before the visitor decides whether to answer. */
  function trustHTML() {
    return '' +
    '<ul class="trust">' +
      '<li>' + icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') + '60 seconds, 5 questions</li>' +
      '<li>' + icon('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8L12 3Z"/>') + '4.8&#9733; from 51 Google reviews</li>' +
      '<li>' + icon('<path d="M4 7.5 12 4l8 3.5v5c0 4.4-3.3 7.6-8 8.5-4.7-.9-8-4.1-8-8.5v-5Z"/><path d="m9 12 2 2 4-4"/>') + 'No obligation, no hard sell</li>' +
    '</ul>' +
    '<p class="trust__meta">Trusted by Accor, Decathlon, The Mall, Brighton College and IHG Group.</p>';
  }

  function questionHTML() {
    var question = D.QUESTIONS[state.index];
    var multi = !!question.multi;
    var limit = multi ? (question.maxSelections || 1) : 1;
    var chosen = chosenIds(question.id);

    var options = question.options.map(function (option, i) {
      /* Position in the list is the rank: 1 is the answer the visitor called
         their main one, and it scores accordingly. 0 means unselected. */
      var rank = chosen.indexOf(option.id) + 1;
      var selected = rank > 0;
      var stateClass = selected ? (multi ? ' is-rank' + rank : ' is-selected') : '';
      /* Only the challenge step ranks its answers, so only it gets a badge. */
      var rankLabel = !multi ? '' : rank === 1 ? 'Main challenge' : rank === 2 ? 'Also' : '';
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
          '<span class="option__label">' + esc(option.label) + '</span>' +
          (rankLabel ? '<span class="option__rank">' + esc(rankLabel) + '</span>' : '') +
          '<span class="option__desc">' + esc(option.desc) + '</span>' +
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
          ? 'Pick the challenge that matters most. You can add a second one if you have two.'
          : needsPartner(question.id)
            ? 'Which of these is closest to your situation? Pick one more and we can plan from it.'
            : chosen.length < limit
              ? 'Add a second challenge if you have one, or press Continue.'
              : 'We read both together — the pair is what shapes your plan. Press Continue when you are ready.');
    } else {
      text = chosen.length === 0
        ? 'Choose the one that fits best.'
        : 'You can change your answer — press Continue when you are ready.';
    }
    var warn = !!state.notice || needsPartner(question.id);
    var hint = '<p class="options__hint' + (warn ? ' options__hint--warn' : '') +
      '" role="status">' + esc(text) + '</p>';

    return '' +
    '<section class="card card--question">' +
      '<p class="eyebrow">Step ' + (state.index + 1) + ' of 6 &mdash; ' + esc(question.shortLabel) + '</p>' +
      '<h1 class="question__title">' + esc(question.title) + '</h1>' +
      '<p class="question__subtitle">' + esc(question.subtitle) + '</p>' +
      '<div class="options" role="' + (multi ? 'group' : 'radiogroup') + '"' +
        ' aria-label="' + esc(question.title) + '">' + options + '</div>' + hint +
      /* Question 1 with nothing chosen has neither button — emitting the nav
         anyway would leave a divider rule above empty space. */
      (state.index > 0 || chosen.length
        ? '<div class="card__nav">' +
            (state.index > 0
              ? '<button type="button" class="btn btn--text" data-action="back">' +
                  icon('<path d="M19 12H6"/><path d="m11.5 6-6 6 6 6"/>', 'icon--arrow-back') + 'Back</button>'
              : '<span></span>') +
            (chosen.length && !needsPartner(question.id)
              ? '<button type="button" class="btn btn--primary" data-action="next">Continue' +
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
          (required ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__opt">Optional</span>') + '</label>' +
        '<input class="field__input" id="f-' + name + '" name="' + name + '" type="' + type + '"' +
          ' placeholder="' + esc(placeholder) + '" value="' + esc(lead[name] || '') + '"' +
          (required ? ' required' : '') + ' autocomplete="' +
          ({ name: 'name', email: 'email', phone: 'tel', website: 'url' }[name] || 'on') + '">' +
        (hint ? '<p class="field__hint">' + esc(hint) + '</p>' : '') +
        '<p class="field__error" id="e-' + name + '" role="alert"></p>' +
      '</div>';
    }

    return '' +
    '<section class="card card--form">' +
      '<p class="eyebrow">Step 6 of 6 &mdash; Your plan</p>' +
      '<h1 class="question__title">Just one more step to see your personalised recommendation</h1>' +
      '<p class="question__subtitle">Your results appear on the next screen straight away. We send a copy, plus a short ' +
        'competitor snapshot, to your inbox.</p>' +
      '<form class="form" id="leadForm" novalidate>' +
        '<div class="form__grid">' +
          field('name', 'Your name', 'text', 'Somchai Jaidee', '', true) +
          field('email', 'Email address', 'email', 'you@company.com', '', true) +
          field('phone', 'Phone number', 'tel', '08X XXX XXXX', '', true) +
          field('website', 'Company website', 'text', 'yourcompany.com', "Leave blank if you don't have one yet.", false) +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Do not fill this in<input type="text" name="company_fax" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form__error" id="formError" role="alert"></p>' +
        '<button type="submit" class="btn btn--primary btn--lg btn--block" id="submitBtn">' +
          'Get my custom plan now' + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') +
        '</button>' +
        '<p class="form__consent">We will only use these details to send your recommendation and follow up once. ' +
          'No lists, no spam &mdash; and you can tell us to stop at any time.</p>' +
        /* Required by Google whenever reCAPTCHA runs — shown only when it does. */
        ((CFG.spam || {}).recaptchaSiteKey
          ? '<p class="form__legal">This site is protected by reCAPTCHA and the Google ' +
            '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy Policy</a> and ' +
            '<a href="https://policies.google.com/terms" target="_blank" rel="noopener">Terms of Service</a> apply.</p>'
          : '') +
      '</form>' +
      '<div class="card__nav card__nav--form">' +
        '<button type="button" class="btn btn--text" data-action="back">' +
          icon('<path d="M19 12H6"/><path d="m11.5 6-6 6 6 6"/>', 'icon--arrow-back') + 'Back</button>' +
      '</div>' +
    '</section>';
  }

  function serviceCardHTML(serviceId, variant) {
    var service = D.CATALOGUE[serviceId];
    var reason = PLANNER.reasonFor(state.result, serviceId);
    var chips = service.deliverables.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');
    /* Platform choice is made in the consultation, not by four questions. */
    var platforms = (service.platforms || []).map(function (id) {
      return D.CATALOGUE[id] ? D.CATALOGUE[id].name : null;
    }).filter(Boolean);

    return '' +
    '<article class="rec rec--' + variant + '">' +
      '<div class="rec__head">' +
        '<span class="rec__icon">' + icon(service.icon) + '</span>' +
        '<div>' +
          '<p class="rec__kicker">' + esc(service.kicker) + '</p>' +
          '<h3 class="rec__name">' + esc(service.name) + '</h3>' +
        '</div>' +
      '</div>' +
      '<p class="rec__blurb">' + esc(service.blurb) + '</p>' +
      (reason ? '<p class="rec__reason">' + icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') +
        '<span>On your plan because <strong>' + esc(reason) + '</strong></span></p>' : '') +
      '<ul class="rec__chips">' + chips + '</ul>' +
      (platforms.length ? '<p class="rec__platforms">' + esc(platforms.join(' \u00b7 ')) +
        ' &mdash; we will choose the right platforms with you.</p>' : '') +
      (service.url ? '<a class="rec__link" href="' + esc(service.url) + '" target="_blank" rel="noopener">' +
        'Explore ' + esc(service.name) + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</a>' : '') +
    '</article>';
  }

  function resultsHTML() {
    var result = state.result;
    var firstName = (state.lead.name || '').trim().split(/\s+/)[0] || 'there';
    var typeOption = ENGINE.answerOption('type', state.answers.type);
    /* v6 reads the two answers together: the goal, then the problem. */
    var objectiveOption = ENGINE.answerOption('objective', state.answers.objective);
    var challengeOption = ENGINE.answerOption('challenge', state.answers.challenge);
    var phrases = [
      objectiveOption && objectiveOption.phrase,
      challengeOption && challengeOption.phrase,
    ].filter(Boolean);
    var noun = (typeOption && typeOption.noun) || 'business';
    var article = /^[aeiou]/i.test(noun) ? 'an' : 'a';
    var challenge = phrases.length
      ? phrases.join(' and ')
      : 'you want to grow';
    var note = D.BUDGET_NOTES[state.answers.budget] || null;
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
        ? '<a href="' + esc(service.url) + '" target="_blank" rel="noopener">' + esc(service.name) + '</a>'
        : '<span>' + esc(service.name) + '</span>';
    }).filter(Boolean).join('<i aria-hidden="true">\u00b7</i>');

    var overlays = (result.overlays || []).map(function (item) {
      return '<li><strong>' + esc(item.label) + '</strong> ' + esc(item.note) + '</li>';
    }).join('');

    var deliveryWarning = state.delivery && !state.delivery.ok && state.delivery.reason !== 'not-configured'
      ? '<p class="notice notice--warn">' +
          'Your plan is ready below, but we could not reach our system to email you a copy. ' +
          'Please screenshot this page or email <a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a> and we will pick it up.' +
        '</p>'
      : '';

    return '' +
    '<section class="card card--results">' +
      deliveryWarning +
      '<p class="eyebrow">Your personalised plan</p>' +
      '<h1 class="results__title">' + esc(firstName) + ', here is where we would start.</h1>' +
      '<p class="results__lead">Based on ' + article + ' <strong>' + esc(noun) + '</strong> where ' +
        esc(challenge) + ', this is the mix our strategists would recommend' +
        (result.primaries.length > 1
          ? ' &mdash; starting with two channels that work together.</p>'
          : ' &mdash; starting with one channel done properly.</p>') +

      '<p class="results__rank">' + esc(quota.label) + '</p>' +
      '<div class="results__primary' +
        (result.primaries.length > 1 ? ' results__primary--pair' : '') + '">' +
        primaryCards +
      '</div>' +

      (support ? '<p class="results__rank results__rank--support">' + esc(quota.nextLabel) + '</p>' +
        '<div class="results__support">' + support + '</div>' : '') +

      (overlays ? '<div class="overlays"><p class="overlays__title">How we would deliver it</p>' +
        '<ul class="overlays__list">' + overlays + '</ul></div>' : '') +

      (note ? '<div class="budget-note">' +
        '<p class="budget-note__tier">' + esc(note.tier) + '</p>' +
        '<p class="budget-note__text">' + esc(note.text) + '</p>' +
      '</div>' : '') +

      (also ? '<p class="results__also"><span>Also often relevant for a business like yours:</span> ' +
        also + '</p>' : '') +

      '<div class="cta">' +
        '<h2 class="cta__title">Want a strategist to pressure-test this?</h2>' +
        '<p class="cta__text">Book a free 30-minute consultation. We will show you what your competitors are doing, ' +
          'what it would realistically take to beat them, and whether we are the right fit. No obligation.</p>' +
        '<div class="cta__actions">' +
          '<a class="btn btn--primary btn--lg" href="' + esc(CFG.consultationUrl) + '" target="_blank" rel="noopener">' +
            'Book your free consultation' + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</a>' +
          '<a class="btn btn--ghost btn--lg" href="' + esc(CFG.phoneHref) + '">Call ' + esc(CFG.phone) + '</a>' +
        '</div>' +
        '<p class="cta__meta"><a href="' + esc(CFG.caseStudiesUrl) + '" target="_blank" rel="noopener">' +
          'See results we have delivered for businesses like yours &rarr;</a></p>' +
      '</div>' +

      '<div class="card__nav card__nav--results">' +
        '<button type="button" class="btn btn--text" data-action="restart">Retake the quiz</button>' +
      '</div>' +
    '</section>';
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
      ? 'Your answers are private and are only used to build your recommendation.' : '';

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
      state.notice = 'Tell us which of these is closest to your situation and we can plan from it.';
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
        state.notice = 'You can pick up to ' + limit +
          '. Deselect one first, then choose this instead.';
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
      return value.trim().length >= 2 ? '' : 'Please tell us your name.';
    },
    email: function (value) {
      if (!value.trim()) return 'We need an email to send your plan.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'That email address does not look right.';
    },
    phone: function (value) {
      var digits = value.replace(/\D/g, '');
      if (!digits) return 'A phone number lets us reach you faster.';
      return digits.length >= 8 ? '' : 'Please enter a full phone number.';
    },
    website: function (value) {
      if (!value.trim()) return '';
      return /^([a-z][a-z0-9+.-]*:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value.trim())
        ? '' : 'Please enter a valid website, e.g. yourcompany.com';
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
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>Building your plan&hellip;';

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
      return ENGINE.submit(payload);
    }).then(function (delivery) {
      state.delivery = delivery;
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
  restore();
  render(false);
})();
