/* ==========================================================================
   I18N — which language the page is in, and the text for it.

   The page's <html lang> decides: "th" shows Thai, anything else English.
   English screen text is in i18n/en.js. Question, service and budget text
   stays English in data.js / planner.js — the lead sent to n8n is always built
   from those, so it is English on every page. i18n/th.js only replaces what
   the visitor sees.

   A Thai line that is missing falls back to English rather than leaving a
   gap (tests/i18n.test.js fails the build long before that reaches a visitor).
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MAM_DATA;
  var TEXT = window.MAM_TEXT || {};
  var pageLang = typeof document !== "undefined" ? document.documentElement.lang : "";
  var lang = /^th\b/i.test(pageLang || "") ? "th" : "en";

  var EN = (TEXT.en || {}).ui || {};
  var TH = lang === "th" ? TEXT.th || {} : {};
  var warned = {};

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function missing(what) {
    if (lang !== "th" || warned[what]) return;
    warned[what] = true;
    if (typeof console !== "undefined") console.warn("[MAM quiz] No Thai text for " + what + " — showing English.");
  }

  function raw(key) {
    var th = (TH.ui || {})[key];
    if (th) return th;
    missing('"' + key + '"');
    return key in EN ? EN[key] : key;
  }

  /* Splits a template into text and {placeholder} parts, so each part can be
     handled on its own. */
  function each(template, onText, onSlot) {
    var out = "";
    var last = 0;
    template.replace(/\{([^{}]+)\}/g, function (match, name, at) {
      out += onText(template.slice(last, at)) + onSlot(name, match);
      last = at + match.length;
      return match;
    });
    return out + onText(template.slice(last));
  }

  /** Plain text, placeholders filled with plain text. Escape it before use. */
  function t(key, vars) {
    vars = vars || {};
    return each(raw(key), String, function (name, match) {
      return name in vars ? String(vars[name]) : match;
    });
  }

  /** HTML: the sentence is escaped, and each var is inserted as ready-made HTML. */
  function html(key, htmlVars) {
    htmlVars = htmlVars || {};
    return each(raw(key), esc, function (name, match) {
      return name in htmlVars ? htmlVars[name] : esc(match);
    });
  }

  function pick(th, en, field, what) {
    if (lang !== "th") return en[field];
    if (th && th[field] != null && th[field] !== "") return th[field];
    if (en[field] != null) missing(what + "." + field);
    return en[field];
  }

  /** shortLabel, title and subtitle of a question. */
  function question(q) {
    var th = (TH.questions || {})[q.id];
    var what = "question " + q.id;
    return {
      shortLabel: pick(th, q, "shortLabel", what),
      title: pick(th, q, "title", what),
      subtitle: pick(th, q, "subtitle", what),
    };
  }

  /** label, desc, noun and phrase of one answer. */
  function option(questionId, opt) {
    var th = (((TH.questions || {})[questionId] || {}).options || {})[opt.id];
    var what = "answer " + questionId + "/" + opt.id;
    return {
      id: opt.id,
      label: pick(th, opt, "label", what),
      desc: pick(th, opt, "desc", what),
      noun: pick(th, opt, "noun", what),
      phrase: pick(th, opt, "phrase", what),
    };
  }

  /** The display text of a service card. Everything else stays in D.CATALOGUE. */
  function service(id) {
    var en = D.CATALOGUE[id] || {};
    var th = (TH.services || {})[id];
    var what = "service " + id;
    return {
      name: pick(th, en, "name", what),
      kicker: pick(th, en, "kicker", what),
      blurb: pick(th, en, "blurb", what),
      deliverables: pick(th, en, "deliverables", what) || [],
      linkText: pick(th, en, "linkText", what),
    };
  }

  function budgetNote(key) {
    var en = D.BUDGET_NOTES[key];
    if (!en) return null;
    var th = (TH.budgetNotes || {})[key];
    return { tier: pick(th, en, "tier", "budget " + key), text: pick(th, en, "text", "budget " + key) };
  }

  /* The planner hands over English for the next three; Thai is looked up by
     the English heading, the reason's need, or the overlay's id. */
  function planLabel(english) {
    if (lang !== "th") return english;
    var th = (TH.planLabels || {})[english];
    if (!th) missing('heading "' + english + '"');
    return th || english;
  }

  function reason(key, english) {
    if (lang !== "th" || !key) return english;
    var th = (TH.reasons || {})[key];
    if (!th) missing("reason " + key);
    return th || english;
  }

  function overlay(item) {
    var th = (TH.overlays || {})[item.id];
    return {
      label: pick(th, item, "label", "overlay " + item.id),
      note: pick(th, item, "note", "overlay " + item.id),
    };
  }

  window.MAM_I18N = {
    lang: lang,
    t: t,
    html: html,
    question: question,
    option: option,
    service: service,
    budgetNote: budgetNote,
    planLabel: planLabel,
    reason: reason,
    overlay: overlay,
  };
})();
