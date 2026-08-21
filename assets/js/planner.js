/* ==========================================================================
   PLANNER — logic v5.

   Turns four answers into a service plan, in four steps:

     1. SITUATION  The two challenges are read together as one brief. The
                   30-row SITUATIONS table in data.js says which KINDS of
                   service that brief calls for, in order.
     2. ROUTING    Business type and persona turn each kind into an actual
                   service. "Paid search" becomes Google Shopping for an
                   online store, Google Ads Campaigns for everyone else.
     3. QUANTITY   Budget decides how many services are shown, and which
                   are primary. It never changes WHICH service is right.
     4. GUARDRAIL  Only services with role "lead" may be primary. CRO,
                   UI/UX, Technical SEO, Content Marketing and Link
                   Building can never lead a plan, whatever is answered.

   Nothing calls this yet — the live quiz still runs on engine.js. It is
   switched on in step 3 of the build.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MAM_DATA;

  var FUNDED = ["100to300", "over300"];

  function has(list, value) {
    return list.indexOf(value) !== -1;
  }

  /* An answer is one option id or, for the challenge step, an ordered pair. */
  function ids(answer) {
    if (answer === undefined || answer === null || answer === "") return [];
    return (Array.isArray(answer) ? answer : [answer]).filter(function (id) {
      return id !== undefined && id !== null && id !== "";
    });
  }

  /* ── Step 1 — which brief is this? ────────────────────────────────── */

  function situationKey(challenges) {
    if (!challenges.length) return null;
    return challenges.length > 1
      ? challenges[0] + "|" + challenges[1]
      : challenges[0];
  }

  /* ── Step 2 — routing ─────────────────────────────────────────────── */

  /**
   * RULE 5.1 — who leads the paid slot.
   *
   * Facebook Ads leads when "I need more leads" is the MAIN challenge and
   * the client is a Small Business / SME — unless the brief also contains
   * "doesn't rank on Google", which proves people are already searching.
   *
   * A Thai local SME on a small budget gets cheaper geo-targeted reach on
   * Facebook, and enquiries arrive straight in Messenger or LINE. A
   * national brand or enterprise has the search volume and the tracking to
   * make Google pay back. Bigger clients capture demand; smaller ones
   * create it.
   *
   * Reverse-engineered from the persona sheet: this explains all 13
   * personas that involve a paid channel, with no exceptions.
   */
  function paidOrder(ctx) {
    var socialFirst =
      ctx.challenges[0] === "leads" &&
      ctx.profile === "sme" &&
      !has(ctx.challenges, "ranking");
    return socialFirst ? ["social", "search"] : ["search", "social"];
  }

  function routeSearch(ctx) {
    /* An online store sells products, not enquiries — but a product feed is
       more setup than a small owner-run shop usually wants to take on. */
    var lead =
      ctx.type === "ecommerce" && ctx.profile !== "sme"
        ? "google-shopping"
        : "google-ads-campaigns";
    /* Performance Max extends a working Search or Shopping account across
       the rest of Google's channels. It is the second Google Ads service a
       big spender adds, never the first one we put them on. */
    var big =
      ctx.budget === "over300" &&
      has(["national", "enterprise", "ecommerce", "mixed"], ctx.type);
    return big ? [lead, "performance-max"] : [lead];
  }

  function routeSocial(ctx) {
    /* Facebook Ads is the lead-generation product. When the brief is about
       awareness or traffic rather than leads, the broader campaign service
       is the honest answer — the platform mix is chosen in person. */
    var lead = has(ctx.challenges, "leads")
      ? "facebook-ads"
      : "social-media-campaigns";
    /* CPAS is collaborative advertising with marketplace and brand partners.
       It only makes sense for a funded online store already running Meta. */
    /* CPAS is collaborative advertising with marketplace and brand partners.
       It exists to move product volume, so on a funded store whose brief is
       about traffic and sales it leads; on a pure lead brief it is the
       service added after Meta is already running. */
    var store = ctx.type === "ecommerce" && has(FUNDED, ctx.budget);
    if (store && has(ctx.challenges, "traffic")) {
      return ["cpas-ads", lead, "premium-creative"];
    }
    return store
      ? [lead, "cpas-ads", "premium-creative"]
      : [lead, "premium-creative"];
  }

  function routeOrganic(ctx) {
    var lead = ctx.type === "ecommerce" ? "ecommerce-seo" : "seo-campaigns";
    return [lead, "seo-audit"];
  }

  function routeLocal(ctx) {
    /* Local SEO needs a real catchment area. An agency buying fulfilment for
       its own clients is not that, whatever its clients look like. */
    if (ctx.profile === "agency") return [];
    if (ctx.type !== "local" && ctx.type !== "mixed") return [];
    return ["local-seo", "google-business-profile"];
  }

  function routeTechnical(ctx) {
    /* One need, answered at the level the client can actually use. A large
       organisation needs the technical foundation fixed; an in-house team
       can execute a keyword map itself; a small business is better served
       by a cheap tactical fix or a diagnostic than by a retainer.
       Every entry after the first is a fallback for the deepening pass. */
    if (
      has(FUNDED, ctx.budget) ||
      ctx.type === "enterprise" ||
      ctx.type === "national"
    ) {
      return ["technical-seo", "on-page-seo", "keyword-mapping", "seo-audit"];
    }
    if (has(["inhouse", "agency"], ctx.profile)) {
      return ["keyword-mapping", "on-page-seo", "seo-audit", "technical-seo"];
    }
    if (ctx.budget === "under50" || ctx.budget === "unsure") {
      return ["seo-audit", "on-page-seo", "keyword-mapping", "technical-seo"];
    }
    return ["on-page-seo", "seo-audit", "keyword-mapping", "technical-seo"];
  }

  function routeWebsite(ctx) {
    return ctx.profile === "sme"
      ? ["web-design", "web-maintenance"]
      : ["web-design"];
  }

  function routeReach(ctx) {
    if (!has(FUNDED, ctx.budget)) return [];
    if (!has(["national", "enterprise", "mixed"], ctx.type)) return [];
    /* Programmatic buying needs the scale of a national or enterprise
       advertiser behind it. A mixed-model business gets the simpler
       display buy first. */
    if (has(["national", "enterprise"], ctx.type)) {
      return ["programmatic-ads", "youtube-ads", "google-display-ads"];
    }
    /* A mixed-model business at 300K+ can fund video; below that, display is
       the affordable way to buy reach. */
    return ctx.budget === "over300"
      ? ["youtube-ads", "google-display-ads", "programmatic-ads"]
      : ["google-display-ads", "youtube-ads", "programmatic-ads"];
  }

  function routeRetention(ctx) {
    return ctx.type === "ecommerce" && has(FUNDED, ctx.budget)
      ? ["email-marketing"]
      : [];
  }

  var ROUTES = {
    organic: routeOrganic,
    local: routeLocal,
    technical: routeTechnical,
    website: routeWebsite,
    reach: routeReach,
    retention: routeRetention,
    search: routeSearch,
    social: routeSocial,
    ai: function () { return ["ai-seo"]; },
    content: function (ctx) {
      if (ctx.budget !== "over300") return ["content-marketing"];
      /* Product and demo video is where a large online store's content
         budget goes; everyone else builds written authority first. */
      return ctx.type === "ecommerce"
        ? ["video-seo", "content-marketing"]
        : ["content-marketing", "video-seo"];
    },
    authority: function () { return ["link-building"]; },
    uiux: function () { return ["ui-ux"]; },
    conversion: function (ctx) {
      return ctx.budget === "under50" || ctx.budget === "unsure"
        ? ["heat-maps", "cro"]
        : ["cro", "heat-maps"];
    },
    creative: function () { return ["premium-creative"]; },
  };

  /** Every service a need could produce here, best first. */
  function candidates(need, ctx) {
    if (need === "paid" || need === "paid2") {
      var order = paidOrder(ctx);
      var slot = need === "paid" ? order[0] : order[1];
      return ROUTES[slot](ctx);
    }
    var route = ROUTES[need];
    return route ? route(ctx) : [];
  }

  /* ── Step 1b — persona adjustments to the brief ───────────────────── */

  /**
   * RULE 5.4 — Agency clients.
   *
   * An agency is buying what it resells. AI visibility is the differentiator
   * it wants alongside an SEO campaign, and Link Building is the fulfilment
   * service it cannot staff itself. Matches personas 14 and 15.
   */
  /**
   * RULE 5.5 — Local businesses.
   *
   * A business with a real catchment area needs its map presence looked
   * after alongside whatever else is recommended, so the local need is
   * offered a second time in the first supporting slot. Google Business
   * Profile follows Local SEO there.
   */
  function applyLocalRule(needs, ctx, primaryCount) {
    if (ctx.type !== "local") return needs;
    if (!has(needs, "local")) return needs;
    var out = needs.slice();
    out.splice(Math.min(primaryCount, out.length), 0, "local");
    return out;
  }

  /**
   * RULE 5.6 — Small businesses and their websites.
   *
   * An SME has no in-house developer. A new site they cannot keep updated
   * goes stale within a year, so the website need is offered once more in
   * the supporting section, where Web Maintenance follows Web Design.
   */
  function applySmeWebsiteRule(needs, ctx, primaryCount) {
    if (ctx.profile !== "sme") return needs;
    if (!has(needs, "website")) return needs;
    var out = needs.slice();
    out.splice(Math.min(primaryCount + 1, out.length), 0, "website");
    return out;
  }

  function applyAgencyRule(needs, ctx, primaryCount) {
    if (ctx.profile !== "agency") return needs;
    var out = needs.slice();

    var organicAt = out.indexOf("organic");
    if (organicAt !== -1 && !has(out, "ai")) {
      out.splice(organicAt + 1, 0, "ai");
    }

    var authorityAt = out.indexOf("authority");
    if (authorityAt !== -1) out.splice(authorityAt, 1);
    out.splice(Math.min(primaryCount, out.length), 0, "authority");

    return out;
  }

  /* ── Steps 3 & 4 — fill the plan ──────────────────────────────────── */

  /**
   * RULE 3.1 — only "lead" services may be primary.
   * RULE 5.2 — two primaries may never come from the same family.
   */
  function build(needs, ctx, quota) {
    var primaries = [];
    var supporting = [];
    var used = [];
    var families = [];
    var trace = [];

    needs.forEach(function (raw) {
      var primaryOnly = raw.charAt(raw.length - 1) === "!";
      var need = primaryOnly ? raw.slice(0, -1) : raw;
      var full = primaries.length >= quota.primary;

      /* A second ad platform is worth funding as a core channel or not at
         all — never demoted to a phase-two suggestion. */
      if (primaryOnly && full) {
        trace.push({ need: need, outcome: "dropped", why: "primary-only, no primary slot left" });
        return;
      }
      if (full && supporting.length >= quota.supporting) return;

      var options = candidates(need, ctx);
      var i, id, service;

      if (!full) {
        for (i = 0; i < options.length; i++) {
          id = options[i];
          service = D.CATALOGUE[id];
          if (!service || has(used, id)) continue;
          if (service.role !== "lead") continue;          // RULE 3.1
          if (has(families, service.family)) continue;    // RULE 5.2
          primaries.push(id);
          families.push(service.family);
          used.push(id);
          trace.push({ need: need, service: id, outcome: "primary" });
          return;
        }
      }

      /* A need that only answers to a support service still belongs on the
         plan — it takes a supporting slot rather than being thrown away
         because the primary slots happen to be open. */
      if (supporting.length >= quota.supporting) {
        trace.push({ need: need, outcome: "no slot left" });
        return;
      }
      for (i = 0; i < options.length; i++) {
        id = options[i];
        service = D.CATALOGUE[id];
        if (!service || has(used, id)) continue;
        if (service.role !== "lead" && service.role !== "support") continue;
        supporting.push(id);
        used.push(id);
        trace.push({ need: need, service: id, outcome: "supporting" });
        return;
      }
      trace.push({ need: need, outcome: "unresolved" });
    });

    /* If the brief runs out before the budget does, deepen what is already
       recommended rather than reaching for an unrelated service. Google
       Business Profile under Local SEO, Heat Maps under CRO, Web
       Maintenance under Web Design — the second service in an area the
       client is already investing in. */
    needs.forEach(function (raw) {
      if (supporting.length >= quota.supporting) return;
      var need = raw.charAt(raw.length - 1) === "!" ? raw.slice(0, -1) : raw;
      var options = candidates(need, ctx);
      for (var i = 0; i < options.length; i++) {
        var id = options[i];
        var service = D.CATALOGUE[id];
        if (!service || has(used, id)) continue;
        if (service.role !== "lead" && service.role !== "support") continue;
        supporting.push(id);
        used.push(id);
        trace.push({ need: need, service: id, outcome: "supporting (deepened)" });
        return;
      }
    });

    return { primaries: primaries, supporting: supporting, trace: trace };
  }

  /* ── Overlays — how the work is delivered, not what it is ─────────── */

  function overlaysFor(ctx) {
    var out = [];
    if (ctx.profile === "agency") {
      out.push({
        id: "seo-reseller",
        label: "White-label delivery",
        note: "Delivered under your brand, with reporting you can hand straight to your client.",
      });
    }
    /* RULE 7 of the brief — Outcome Marketing needs enough budget and
       measurement maturity behind it before it can be promised. */
    if (
      ctx.budget === "over300" &&
      has(["enterprise", "inhouse"], ctx.profile)
    ) {
      out.push({
        id: "outcome-marketing",
        label: "Outcome-aligned engagement",
        note: "Available as an engagement model once tracking and attribution are in place.",
      });
    }
    return out;
  }


  /* ── Why a service is on the plan ─────────────────────────────────────
     Keyed by the need that produced it, so each card explains what it is
     there to fix rather than repeating the answer the visitor just gave.
     -------------------------------------------------------------------- */
  var NEED_REASON = {
    paid: "you need enquiries coming in now, not in six months",
    paid2: "one channel rarely covers both capturing demand and creating it",
    organic: "you need to be found in Google search",
    ai: "AI assistants are answering questions about your market without you",
    local: "your customers are searching close to where you are",
    website: "the site everything else sends traffic to has to hold up",
    uiux: "a clearer journey is part of the upgrade",
    conversion: "more of the traffic you already pay for should convert",
    content: "search and AI both need substance before they recommend you",
    technical: "the technical foundation has to hold before rankings move",
    authority: "authority is what makes rankings stick",
    reach: "search demand alone caps out at your scale",
    retention: "keeping a customer costs less than winning a new one",
    creative: "paid social lives or dies on the creative",
  };

  /** Plain-English reason a given service is on this plan. */
  function reasonFor(result, serviceId) {
    var entry = (result.trace || []).filter(function (t) {
      return t.service === serviceId;
    })[0];
    return (entry && NEED_REASON[entry.need]) || "";
  }

  /**
   * Services worth knowing about that did not fit the card quota. Not
   * "recommended" — the quiz cannot defend picking them from four answers —
   * but real options a strategist would raise in the conversation.
   */
  function alsoRelevant(needs, ctx, chosen, limit) {
    var out = [];
    var cap = limit || 3;

    needs.forEach(function (raw) {
      if (out.length >= cap) return;
      var need = raw.charAt(raw.length - 1) === "!" ? raw.slice(0, -1) : raw;
      candidates(need, ctx).forEach(function (id) {
        if (out.length >= cap) return;
        if (has(chosen, id) || has(out, id)) return;
        var service = D.CATALOGUE[id];
        if (!service || service.role === "overlay") return;
        out.push(id);
      });
    });

    /* Platform choice happens in the consultation, so name the platforms
       whenever paid social is on the plan rather than guessing at one. */
    var social = chosen.concat(out).some(function (id) {
      return D.CATALOGUE[id] && D.CATALOGUE[id].family === "paid-social";
    });
    if (social) {
      (D.CATALOGUE["social-media-campaigns"].platforms || []).forEach(function (id) {
        if (out.length >= cap + 2) return;
        if (!has(chosen, id) && !has(out, id)) out.push(id);
      });
    }
    return out;
  }


  /* ── Lead payload ─────────────────────────────────────────────────────
     Deliberately shaped so the existing n8n workflow keeps working with no
     changes at all. It reads five fields:

       recommendation.primary.name    both primaries, joined the way the
                                      persona sheet writes them, so a CRM
                                      row reads like the planning sheet
       recommendation.primary.url     the first primary's link
       recommendation.supporting      the supporting services only
       recommendation.all_ranked      everything on the plan, in order
       recommendation.budget_tier     unchanged

     Everything else here is additive. n8n ignores keys it does not map, so
     nothing breaks before someone has time to wire the new fields up.
     -------------------------------------------------------------------- */

  function optionLabel(questionId, answerId) {
    var questions = D.QUESTIONS || [];
    for (var i = 0; i < questions.length; i++) {
      if (questions[i].id !== questionId) continue;
      var options = questions[i].options;
      for (var j = 0; j < options.length; j++) {
        if (options[j].id === answerId) return options[j].label;
      }
    }
    return answerId;
  }

  /* Guarded so the payload can also be built outside a browser — the test
     suite runs under JavaScriptCore, which has no DOM. */
  function tracking() {
    var out = {};
    if (typeof URLSearchParams !== "function") return out;
    var search = (window.location && window.location.search) || "";
    var params = new URLSearchParams(search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
     "gclid", "fbclid"].forEach(function (key) {
      if (params.get(key)) out[key] = params.get(key);
    });
    return out;
  }

  function serviceOut(id) {
    var service = D.CATALOGUE[id] || {};
    return { id: id, name: service.name || id, url: service.url || null };
  }

  function buildPayload(answers, lead, result, startedAt, security) {
    var answerBlock = {};
    Object.keys(answers).forEach(function (questionId) {
      var selected = ids(answers[questionId]);
      if (!selected.length) return;
      answerBlock[questionId] = {
        id: selected[0],
        label: optionLabel(questionId, selected[0]),
      };
      selected.slice(1).forEach(function (answerId, index) {
        answerBlock[questionId + "_" + (index + 2)] = {
          id: answerId,
          label: optionLabel(questionId, answerId),
        };
      });
    });

    var primaries = result.primaries.map(serviceOut);
    var budgetNote = (D.BUDGET_NOTES || {})[answers.budget] || null;

    return {
      source: "mam-service-quiz",
      version: 3,
      submitted_at: new Date().toISOString(),
      lead: {
        name: lead.name,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
      },
      answers: answerBlock,
      recommendation: {
        logic_version: result.logicVersion,
        situation: result.situationKey,
        /* Shape kept for the existing workflow — see the note above. */
        primary: {
          id: primaries.map(function (s) { return s.id; }).join(" + "),
          name: primaries.map(function (s) { return s.name; }).join(" + "),
          url: primaries.length ? primaries[0].url : null,
        },
        primaries: primaries,
        supporting: result.supporting.map(serviceOut),
        all_ranked: result.all.map(serviceOut),
        also_relevant: (result.alsoRelevant || []).map(serviceOut),
        overlays: result.overlays || [],
        budget_tier: budgetNote ? budgetNote.tier : null,
        plan_shape: result.quota
          ? { primary: result.quota.primary, supporting: result.quota.supporting }
          : null,
      },
      meta: {
        page_url: (window.location && window.location.href) || null,
        referrer: (typeof document !== "undefined" && document.referrer) || null,
        user_agent: (typeof navigator !== "undefined" && navigator.userAgent) || null,
        language: (typeof navigator !== "undefined" && navigator.language) || null,
        screen: window.innerWidth
          ? window.innerWidth + "x" + window.innerHeight
          : null,
        seconds_to_complete: Math.round((Date.now() - startedAt) / 1000),
        tracking: tracking(),
      },
      security: security,
    };
  }

  /* ── Public entry point ───────────────────────────────────────────── */

  /**
   * @param {Object} answers { profile, type, budget, challenge:[main, second] }
   * @returns {Object} plan, or { isComplete:false } with the reason
   */
  function plan(answers) {
    answers = answers || {};
    var challenges = ids(answers.challenge);
    var ctx = {
      profile: answers.profile,
      type: answers.type,
      budget: answers.budget,
      challenges: challenges,
    };

    var missing = [];
    ["profile", "type", "budget"].forEach(function (q) {
      if (!answers[q]) missing.push(q);
    });
    if (!challenges.length) missing.push("challenge");
    /* "I'm not sure where to start" is not an answer on its own — the
       visitor must name the closest problem before we can plan anything. */
    if (challenges[0] === "unsure" && challenges.length < 2) {
      missing.push("challenge_second");
    }

    var key = situationKey(challenges);
    var situation = key && D.SITUATIONS[key];
    if (missing.length || !situation) {
      return {
        logicVersion: 5,
        isComplete: false,
        missing: missing,
        situationKey: key,
        primaries: [],
        supporting: [],
      };
    }

    var quota = D.BUDGET_PLAN[answers.budget] || D.BUDGET_PLAN.unsure;
    var needs = applyLocalRule(situation, ctx, quota.primary);
    needs = applySmeWebsiteRule(needs, ctx, quota.primary);
    needs = applyAgencyRule(needs, ctx, quota.primary);
    var built = build(needs, ctx, quota);

    return {
      logicVersion: 5,
      isComplete: true,
      situationKey: key,
      needs: needs,
      primaries: built.primaries,
      supporting: built.supporting,
      all: built.primaries.concat(built.supporting),
      quota: quota,
      overlays: overlaysFor(ctx),
      alsoRelevant: alsoRelevant(needs, ctx, built.primaries.concat(built.supporting)),
      trace: built.trace,
    };
  }

  window.MAM_PLANNER = {
    plan: plan,
    reasonFor: reasonFor,
    buildPayload: buildPayload,
    paidOrder: paidOrder,
    candidates: candidates,
  };
})();
