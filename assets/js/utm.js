/* ==========================================================================
   UTM — campaign attribution, worked out the way the website works it out.

   A copy of scripts.js from the website's "MAM UTM To Forms" plugin
   (wp-content/plugins/mam-quform-utms/, v1.4.3 on moveaheadmedia.co.th and
   v1.4.4 on moveaheadmedia.com.au: the same file, last changed 2026-10-12).
   The quiz lives on the website's own domain, so it reads and writes the same
   three cookies as the website's enquiry forms:

     user_utm_source   user_utm_medium   user_utm_campaign

   A visitor who reached the website first arrives with them already set; one
   who lands on the quiz first gets them set here, by the same rules, so the
   website's forms agree with the quiz afterwards. The lead sent to n8n
   carries them as utm_source / utm_medium / utm_campaign, like a Quform lead.

   Rules (from the plugin's header, unchanged):
     utm_source/medium contains "clutch.co"          → Referral / Third-party Sites / clutch.co
     utm_source contains "chatgpt", utm_medium "cpc" → ChatGPT / CPC / campaign as-is
     utm_source contains chatgpt, openai, claude,
       gemini, perplexity or copilot                 → Referral / LLM / <source>
     utm_source = "mamgbp"                           → Google / Organic / GBP
     utm_source contains "facebook" / "instagram"    → Meta / (social → Organic_FB / Organic_IG)
     any other utm_source                            → kept as-is; medium and campaign "-" if missing
   With no utm_source, the referrer decides (Direct / Contact Form /
   direct_contact_form when there is none), and a stored non-Direct source is
   never overwritten by Direct (first touch wins).

   Two deliberate differences from the plugin:
   - No jQuery or js-cookie. The cookies are written here in js-cookie 3's
     encoding (path=/, session cookie), so either side reads the other's.
   - If the browser refuses cookies, the values worked out on this page are
     still sent with the lead. (The plugin sends blanks then — see the vault
     note "MAM Website Forms".) A malformed %-escape in the address is kept
     as typed instead of stopping the script.

   Keep the rules in step with the plugin: when its scripts.js changes, change
   this file and tests/utm.test.js together.
   ========================================================================== */
(function (root) {
  "use strict";

  var COOKIES = {
    source: "user_utm_source",
    medium: "user_utm_medium",
    campaign: "user_utm_campaign",
  };

  /* Sources the plugin itself writes. Anything else stored was set by a
     campaign link and is left alone. */
  var AUTO_VALUES = ["Direct", "Referral", "Google", "Bing", "Yahoo", "DuckDuckGo", "Meta"];

  /* ── Cookies, encoded like js-cookie 3 ────────────────────────────── */

  function readCookie(doc, name) {
    var jar = doc && doc.cookie ? doc.cookie.split("; ") : [];
    for (var i = 0; i < jar.length; i++) {
      var parts = jar[i].split("=");
      var value = parts.slice(1).join("=");
      try {
        if (decodeURIComponent(parts[0]) !== name) continue;
        if (value.charAt(0) === '"') value = value.slice(1, -1);
        return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      } catch (e) {
        /* js-cookie skips a cookie it cannot decode, and so do we. */
      }
    }
    return undefined;
  }

  function writeCookie(doc, name, value) {
    var encoded = encodeURIComponent(String(value)).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent,
    );
    doc.cookie = name + "=" + encoded + "; path=/";
  }

  /* The cookie jar, plus a copy kept for this page view. The copy only
     answers when the browser has refused to store the cookie. */
  function cookieStore(doc) {
    var memory = {};
    return {
      get: function (name) {
        var value = readCookie(doc, name);
        return value !== undefined ? value : memory[name];
      },
      set: function (name, value) {
        memory[name] = String(value);
        try { writeCookie(doc, name, value); } catch (e) { /* cookies blocked */ }
      },
    };
  }

  /* ── The plugin's rules ───────────────────────────────────────────── */

  /* mamGetParameterByName: the first occurrence in the address wins. */
  function parameter(href, name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var results = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)").exec(href || "");
    if (!results) return null;
    if (!results[2]) return "";
    var value = results[2].replace(/\+/g, " ");
    try { return decodeURIComponent(value); } catch (e) { return value; }
  }

  /* mamGetReferral: the full referrer, or "" when there is none or it is
     this website. */
  function referral(referrer, siteUrl) {
    if (!referrer) return "";
    if (siteUrl && referrer.indexOf(siteUrl) !== -1) return "";
    return referrer;
  }

  function normalizeClutch(source, medium, campaign) {
    var s = (source || "").toLowerCase();
    var m = (medium || "").toLowerCase();
    if (s.indexOf("clutch.co") !== -1 || m.indexOf("clutch.co") !== -1) {
      return { source: "Referral", medium: "Third-party Sites", campaign: "clutch.co" };
    }
    return { source: source, medium: medium, campaign: campaign };
  }

  function normalizeLLM(source, medium, campaign) {
    if (!source) return { source: source, medium: medium, campaign: campaign };
    var s = source.toLowerCase();
    var m = (medium || "").toLowerCase();
    /* Paid ChatGPT ads, before the generic LLM check below. */
    if (s.indexOf("chatgpt") !== -1 && m === "cpc") {
      return { source: "ChatGPT", medium: "CPC", campaign: campaign };
    }
    var needles = ["chatgpt", "openai", "claude", "gemini", "perplexity", "copilot"];
    for (var i = 0; i < needles.length; i++) {
      if (s.indexOf(needles[i]) !== -1) {
        return { source: "Referral", medium: "LLM", campaign: source };
      }
    }
    return { source: source, medium: medium, campaign: campaign };
  }

  function normalizeGBP(source, medium, campaign) {
    if (source && source.toLowerCase() === "mamgbp") {
      return { source: "Google", medium: "Organic", campaign: "GBP" };
    }
    return { source: source, medium: medium, campaign: campaign };
  }

  function normalizeMeta(source, medium) {
    if (!source) return { source: source, medium: medium };
    var s = source.toLowerCase();
    var isFB = s.indexOf("facebook") !== -1;
    var isIG = s.indexOf("instagram") !== -1;
    if (!isFB && !isIG) return { source: source, medium: medium };
    var newMedium = medium;
    if (medium && medium.toLowerCase() === "social") {
      newMedium = isIG ? "Organic_IG" : "Organic_FB";
    }
    return { source: "Meta", medium: newMedium };
  }

  /* mamClassify: the referrer when the address has no utm_source. */
  function classify(referrer) {
    if (referrer === "") {
      return { source: "Direct", medium: "Contact Form", campaign: "direct_contact_form" };
    }
    var host = "";
    try {
      host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    } catch (e) {
      host = "";
    }
    /* AI assistants first: Gemini is on google.com. */
    var llmHosts = [
      "chatgpt.com",
      "chat.openai.com",
      "gemini.google.com",
      "claude.ai",
      "perplexity.ai",
      "copilot.microsoft.com",
    ];
    if (llmHosts.indexOf(host) !== -1) {
      return { source: "Referral", medium: "LLM", campaign: referrer };
    }
    if (/(^|\.)google\./.test(host)) {
      return { source: "Google", medium: "Organic", campaign: "google_organic" };
    }
    if (/(^|\.)facebook\./.test(host) || /(^|\.)fb\.com$/.test(host) || host.indexOf("facebook.") === 0) {
      return { source: "Meta", medium: "Organic_FB", campaign: referrer };
    }
    if (/(^|\.)instagram\./.test(host)) {
      return { source: "Meta", medium: "Organic_IG", campaign: referrer };
    }
    if (/(^|\.)clutch\.co$/.test(host)) {
      return { source: "Referral", medium: "Third-party Sites", campaign: "clutch.co" };
    }
    return { source: "Referral", medium: "Third-party Sites", campaign: referrer };
  }

  /**
   * mam_utm_save_cookies: what the plugin does on every page load.
   * @param {{href:string, referrer:string, siteUrl:string, cookies:{get:Function,set:Function}}} env
   */
  function save(env) {
    var cookies = env.cookies;
    var referrer = referral(env.referrer, env.siteUrl);

    var source = parameter(env.href, "utm_source");
    var medium = parameter(env.href, "utm_medium");
    var campaign = parameter(env.href, "utm_campaign");

    var clutch = normalizeClutch(source, medium, campaign);
    source = clutch.source; medium = clutch.medium; campaign = clutch.campaign;
    var llm = normalizeLLM(source, medium, campaign);
    source = llm.source; medium = llm.medium; campaign = llm.campaign;
    var gbp = normalizeGBP(source, medium, campaign);
    source = gbp.source; medium = gbp.medium; campaign = gbp.campaign;
    var meta = normalizeMeta(source, medium);
    source = meta.source; medium = meta.medium;

    if (source) cookies.set(COOKIES.source, source);
    if (medium) cookies.set(COOKIES.medium, medium);
    if (campaign) cookies.set(COOKIES.campaign, campaign);

    /* A real utm_source in the address: no auto-classifying over it. */
    if (source) {
      if (!cookies.get(COOKIES.medium)) cookies.set(COOKIES.medium, "-");
      if (!cookies.get(COOKIES.campaign)) cookies.set(COOKIES.campaign, "-");
      return;
    }

    /* Only (re)classify when nothing is stored, or what is stored is one of
       the plugin's own values. */
    var existing = cookies.get(COOKIES.source);
    if (existing && AUTO_VALUES.indexOf(existing) === -1) return;

    /* No referrer this time (internal navigation): first touch wins. */
    if (referrer === "" && existing && existing !== "Direct") return;

    var found = classify(referrer);
    cookies.set(COOKIES.source, found.source);
    cookies.set(COOKIES.medium, found.medium);
    cookies.set(COOKIES.campaign, found.campaign);
  }

  /** The three values a website form would send right now ("" if unset). */
  function values(cookies) {
    return {
      utm_source: cookies.get(COOKIES.source) || "",
      utm_medium: cookies.get(COOKIES.medium) || "",
      utm_campaign: cookies.get(COOKIES.campaign) || "",
    };
  }

  var store = null;

  /* In a browser: classify this visit now, as the plugin does on load. */
  if (root.document && root.location) {
    store = cookieStore(root.document);
    try {
      save({
        href: root.location.href,
        referrer: root.document.referrer,
        siteUrl: root.location.origin,
        cookies: store,
      });
    } catch (e) {
      if (root.console) root.console.warn("[MAM quiz] UTM capture failed:", e);
    }
  }

  root.MAM_UTM = {
    /** utm_source / utm_medium / utm_campaign for the lead. */
    values: function () {
      return store ? values(store) : { utm_source: "", utm_medium: "", utm_campaign: "" };
    },
    /* For tests/utm.test.js. */
    _rules: {
      COOKIES: COOKIES,
      parameter: parameter,
      referral: referral,
      classify: classify,
      save: save,
      values: values,
      readCookie: readCookie,
      writeCookie: writeCookie,
      cookieStore: cookieStore,
    },
  };
})(typeof window !== "undefined" ? window : this);
