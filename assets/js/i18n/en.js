/* ==========================================================================
   ENGLISH TEXT — every sentence app.js puts on screen.

   Question, answer, service and budget text lives in data.js, and the
   "On your plan because…" reasons in planner.js. Those stay English on every
   page, because the lead sent to n8n is built from them (Thai decision D-02).
   i18n/th.js holds the Thai for all of it.

   {curly} parts are filled in by app.js — keep them exactly as they are.
   ========================================================================== */
window.MAM_TEXT = window.MAM_TEXT || {};
window.MAM_TEXT.en = {
  ui: {
    /* Progress bar */
    "progress.step": "Step {n}",
    "progress.getResults": "Get results",
    "progress.yourPlan": "Your plan",
    "progress.aria": "Step {n} of 6",

    /* Trust row under question 1. {rating} and {count} come from config.js. */
    "trust.time": "60 seconds, 5 questions",
    "trust.reviews": "{rating}★ from {count} Google reviews",
    "trust.noHardSell": "No obligation, no hard sell",
    "trust.clients": "Trusted by Accor, Decathlon, The Mall, Brighton College and IHG Group.",

    /* Every question step */
    "question.eyebrow": "Step {n} of 6 — {short label}",
    "hint.choose": "Choose the one that fits best.",
    "hint.change": "You can change your answer — press Continue when you are ready.",
    "nav.back": "Back",
    "nav.continue": "Continue",
    "stage.note": "Your answers are private and are only used to build your recommendation.",

    /* Two-answer questions. No question allows two answers since logic v6,
       but the code path is still there, so its text is too. */
    "multi.main": "Main challenge",
    "multi.also": "Also",
    "multi.hintEmpty": "Pick the challenge that matters most. You can add a second one if you have two.",
    "multi.hintNeedsSecond": "Which of these is closest to your situation? Pick one more and we can plan from it.",
    "multi.hintAddSecond": "Add a second challenge if you have one, or press Continue.",
    "multi.hintBoth": "We read both together — the pair is what shapes your plan. Press Continue when you are ready.",
    "multi.noticeNeedsSecond": "Tell us which of these is closest to your situation and we can plan from it.",
    "multi.noticeLimit": "You can pick up to {n}. Deselect one first, then choose this instead.",

    /* Contact form */
    "form.eyebrow": "Step 6 of 6 — Your plan",
    "form.title": "Just one more step to see your personalised recommendation",
    "form.subtitle": "Your results appear on the next screen straight away. We send a copy, plus a short competitor snapshot, to your inbox.",
    "form.name": "Your name",
    "form.email": "Email address",
    "form.phone": "Phone number",
    "form.website": "Company website",
    "form.optional": "Optional",
    "form.namePlaceholder": "Somchai Jaidee",
    "form.websiteHint": "Leave blank if you don't have one yet.",
    "form.submit": "Get my custom plan now",
    "form.loading": "Building your plan…",
    "form.consent": "We will only use these details to send your recommendation and follow up once. No lists, no spam — and you can tell us to stop at any time.",
    /* {privacy} and {terms} become links, using the two lines below. */
    "form.recaptcha": "This site is protected by reCAPTCHA and the Google {privacy} and {terms} apply.",
    "form.privacy": "Privacy Policy",
    "form.terms": "Terms of Service",

    /* Form error messages */
    "error.name": "Please tell us your name.",
    "error.emailEmpty": "We need an email to send your plan.",
    "error.emailInvalid": "That email address does not look right.",
    "error.phoneEmpty": "A phone number lets us reach you faster.",
    "error.phoneShort": "Please enter a full phone number.",
    "error.website": "Please enter a valid website, e.g. yourcompany.com",

    /* Results — heading and the sentence under it.
       English builds the sentence from the answers:
         "Based on a local business where you want more leads and your ads
          aren't paying back, this is the mix…"
       {business words} is Q2's noun; {situation} is the goal and challenge
       phrases joined by "lead.and". Thai uses one fixed opener instead. */
    "results.eyebrow": "Your personalised plan",
    "results.title": "{first name}, here is where we would start.",
    "results.nameFallback": "there",
    "lead.start": "Based on {article} {business words} where {situation}",
    "lead.and": " and ",
    "lead.fallbackNoun": "business",
    "lead.fallbackSituation": "you want to grow",
    "lead.endPair": ", this is the mix our strategists would recommend — starting with two channels that work together.",
    "lead.endSingle": ", this is the mix our strategists would recommend — starting with one channel done properly.",
    "lead.endConsult": ", the best first step is a free conversation with a strategist, before any budget is committed.",
    "results.deliveryWarning": "Your plan is ready below, but we could not reach our system to email you a copy. Please screenshot this page or email {email} and we will pick it up.",

    /* Results — sections and service cards */
    "results.overlaysTitle": "How we would deliver it",
    "results.also": "Also often relevant for a business like yours:",
    "card.because": "On your plan because {reason}",
    "card.explore": "Explore {service name}",
    "card.platforms": "{platform names} — we will choose the right platforms with you.",

    /* Results — the box and buttons at the bottom */
    "cta.unsureTitle": "Not sure what’s holding you back?",
    "cta.unsureText": "Let’s find out together. Book a free 30-minute strategy consultation — we will look at your website and marketing, show you what is getting in the way, and tell you honestly what we would fix first. No obligation.",
    "cta.title": "Want a strategist to pressure-test this?",
    "cta.text": "Book a free 30-minute consultation. We will show you what your competitors are doing, what it would realistically take to beat them, and whether we are the right fit. No obligation.",
    "cta.book": "Book your free consultation",
    "cta.call": "Call {phone}",
    "cta.caseStudies": "See results we have delivered for businesses like yours →",
    "cta.retake": "Retake the quiz",
    "chat.line": "Chat on LINE",
    "chat.whatsapp": "Chat on WhatsApp",
    /* Typed into the chat app for the visitor; the team reads it. */
    "chat.message": "Hi MAM, I just did the quiz. My plan: {service names}.",
  },
};
