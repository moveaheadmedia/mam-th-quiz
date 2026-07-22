/* ==========================================================================
   APP — screen flow, rendering and form handling.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.MAM_CONFIG;
  var D = window.MAM_DATA;
  var ENGINE = window.MAM_ENGINE;

  var STORAGE_KEY = 'mam-quiz-state-v1';
  var STEP_LABELS = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Get results'];

  var el = {
    stage: document.getElementById('stage'),
    stageNote: document.getElementById('stageNote'),
    progress: document.getElementById('progress'),
    progressSteps: document.getElementById('progressSteps'),
    progressFill: document.getElementById('progressFill')
  };

  var state = {
    screen: CFG.showIntro ? 'intro' : 'question',
    index: 0,
    answers: {},
    lead: null,
    result: null,
    startedAt: Date.now(),
    formShownAt: 0,
    delivery: null
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
      if (saved.screen === 'results' && saved.lead) {
        state.lead = saved.lead;
        state.result = ENGINE.score(state.answers);
        state.screen = 'results';
      } else if (saved.screen === 'form' && answeredCount() === D.QUESTIONS.length) {
        state.screen = 'form';
      } else if (answeredCount() > 0) {
        state.screen = 'question';
      }
    } catch (e) { /* ignore corrupt state */ }
  }

  function answeredCount() {
    return D.QUESTIONS.filter(function (q) { return state.answers[q.id]; }).length;
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
    if (state.screen === 'intro') return 0;
    if (state.screen === 'question') return state.index + 1;
    if (state.screen === 'form') return 5;
    return 6;                                   // results — everything complete
  }

  function renderProgress() {
    var showBar = state.screen !== 'intro';
    el.progress.hidden = !showBar;
    if (!showBar) return;

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
    el.progressSteps.setAttribute('aria-label', 'Step ' + Math.min(step, 5) + ' of 5');
  }

  /* ── Screens ────────────────────────────────────────────────────────── */

  function introHTML() {
    return '' +
    '<section class="card card--intro">' +
      '<p class="eyebrow">Free service matcher</p>' +
      '<h1 class="intro__title">Which digital marketing services does your business <em>actually</em> need?</h1>' +
      '<p class="intro__lead">SEO, AI SEO, Google Ads, Social Media, Website Development — you should not have to guess. ' +
        'Answer four quick questions and we will show you the mix we would genuinely recommend, and why.</p>' +
      '<ul class="intro__facts">' +
        '<li>' + icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') + '60 seconds, 4 questions</li>' +
        '<li>' + icon('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8L12 3Z"/>') + '4.8&#9733; from 51 Google reviews</li>' +
        '<li>' + icon('<path d="M4 7.5 12 4l8 3.5v5c0 4.4-3.3 7.6-8 8.5-4.7-.9-8-4.1-8-8.5v-5Z"/><path d="m9 12 2 2 4-4"/>') + 'No obligation, no hard sell</li>' +
      '</ul>' +
      '<button class="btn btn--primary btn--lg" type="button" data-action="start">' +
        'Start the quiz' + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') +
      '</button>' +
      '<p class="intro__meta">Trusted by Accor, Decathlon, The Mall, Brighton College and IHG Group.</p>' +
    '</section>';
  }

  function questionHTML() {
    var question = D.QUESTIONS[state.index];
    var chosen = state.answers[question.id];

    var options = question.options.map(function (option, i) {
      var selected = chosen === option.id;
      return '' +
      '<button type="button" class="option' + (selected ? ' is-selected' : '') + '"' +
        ' role="radio" aria-checked="' + selected + '" tabindex="' + (selected || (!chosen && i === 0) ? '0' : '-1') + '"' +
        ' data-option="' + esc(option.id) + '">' +
        '<span class="option__key" aria-hidden="true">' + String.fromCharCode(65 + i) + '</span>' +
        '<span class="option__body">' +
          '<span class="option__label">' + esc(option.label) + '</span>' +
          '<span class="option__desc">' + esc(option.desc) + '</span>' +
        '</span>' +
        '<span class="option__check" aria-hidden="true">' + icon('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'icon--tick') + '</span>' +
      '</button>';
    }).join('');

    return '' +
    '<section class="card card--question">' +
      '<p class="eyebrow">Step ' + (state.index + 1) + ' of 5 &mdash; ' + esc(question.shortLabel) + '</p>' +
      '<h1 class="question__title">' + esc(question.title) + '</h1>' +
      '<p class="question__subtitle">' + esc(question.subtitle) + '</p>' +
      '<div class="options" role="radiogroup" aria-label="' + esc(question.title) + '">' + options + '</div>' +
      '<div class="card__nav">' +
        (state.index > 0 || CFG.showIntro
          ? '<button type="button" class="btn btn--text" data-action="back">' +
              icon('<path d="M19 12H6"/><path d="m11.5 6-6 6 6 6"/>', 'icon--arrow-back') + 'Back</button>'
          : '<span></span>') +
        (chosen ? '<button type="button" class="btn btn--primary" data-action="next">Continue' +
            icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</button>' : '') +
      '</div>' +
    '</section>';
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
      '<p class="eyebrow">Step 5 of 5 &mdash; Your plan</p>' +
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
    var service = D.SERVICES[serviceId];
    var reason = state.result.reasonFor(serviceId);
    var chips = service.deliverables.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');

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
        'Recommended because you told us: <strong>' + esc(reason) + '</strong></p>' : '') +
      '<ul class="rec__chips">' + chips + '</ul>' +
      '<a class="rec__link" href="' + esc(service.url) + '" target="_blank" rel="noopener">' +
        'Explore ' + esc(service.name) + icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>', 'icon--arrow') + '</a>' +
    '</article>';
  }

  function resultsHTML() {
    var result = state.result;
    var firstName = (state.lead.name || '').trim().split(/\s+/)[0] || 'there';
    var typeOption = ENGINE.answerOption('type', state.answers.type);
    var challengeOption = ENGINE.answerOption('challenge', state.answers.challenge);
    var noun = (typeOption && typeOption.noun) || 'business';
    var article = /^[aeiou]/i.test(noun) ? 'an' : 'a';
    var challenge = (challengeOption && challengeOption.phrase) || 'you want to grow';
    var note = result.budgetNote;

    var support = result.supporting.map(function (id) {
      return serviceCardHTML(id, 'support');
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
        esc(challenge) + ', this is the mix our strategists would recommend &mdash; in priority order.</p>' +

      '<div class="results__primary">' +
        '<p class="results__rank">Start here</p>' +
        serviceCardHTML(result.primary, 'primary') +
      '</div>' +

      (support ? '<p class="results__rank results__rank--support">Then build on it with</p>' +
        '<div class="results__support">' + support + '</div>' : '') +

      (note ? '<div class="budget-note">' +
        '<p class="budget-note__tier">' + esc(note.tier) + '</p>' +
        '<p class="budget-note__text">' + esc(note.text) + '</p>' +
      '</div>' : '') +

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
    if (state.screen === 'intro') html = introHTML();
    else if (state.screen === 'question') html = questionHTML();
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
    save();
    render();
    scrollToTop();
  }

  function advance() {
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
    if (state.index > 0) { goToQuestion(state.index - 1); return; }
    state.screen = 'intro';
    save();
    render();
    scrollToTop();
  }

  function selectOption(optionId) {
    var question = D.QUESTIONS[state.index];
    var alreadyChosen = state.answers[question.id] === optionId;
    state.answers[question.id] = optionId;
    save();

    var buttons = el.stage.querySelectorAll('.option');
    Array.prototype.forEach.call(buttons, function (button) {
      var isThis = button.getAttribute('data-option') === optionId;
      button.classList.toggle('is-selected', isThis);
      button.setAttribute('aria-checked', String(isThis));
      button.tabIndex = isThis ? 0 : -1;
    });

    if (alreadyChosen) { advance(); return; }
    setTimeout(advance, CFG.autoAdvanceMs);
  }

  function restart() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    state.answers = {};
    state.lead = null;
    state.result = null;
    state.delivery = null;
    state.startedAt = Date.now();
    state.index = 0;
    state.screen = CFG.showIntro ? 'intro' : 'question';
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
    state.result = ENGINE.score(state.answers);

    /* Signals are attached, never enforced — n8n decides. Blocking here would
       mean a mistuned heuristic silently costs a real lead. */
    var timing = {
      secondsOnForm: Math.round((Date.now() - state.formShownAt) / 100) / 10,
      secondsTotal: Math.round((Date.now() - state.startedAt) / 1000)
    };
    var assessment = ENGINE.spamSignals(state.lead, timing, form.company_fax.value);

    ENGINE.recaptchaToken().then(function (token) {
      var spam = CFG.spam || {};
      var payload = ENGINE.buildPayload(state.answers, state.lead, state.result, state.startedAt, {
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
    if (option) { selectOption(option.getAttribute('data-option')); return; }

    var action = event.target.closest('[data-action]');
    if (!action) return;
    var name = action.getAttribute('data-action');
    if (name === 'start') { goToQuestion(0); }
    else if (name === 'next') { advance(); }
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
