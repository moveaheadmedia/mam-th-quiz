/* ==========================================================================
   PLANNER — logic v6.

   Turns five answers into a service plan. v6 splits the old single
   "challenge" question into two: an OBJECTIVE (the goal) and a CHALLENGE
   (the problem). The pipeline:

     1. MERGE      The objective's lead need comes first (the direction),
                   then the challenge's needs (the fix), then the objective's
                   remaining needs. See mergeNeeds + the menus in data.js.
     2. ROUTING    Business type and persona turn each need into an actual
                   service. "Paid search" becomes Google Shopping for an
                   online store, Google Ads Campaigns for everyone else.
     3. QUANTITY   Budget decides how many services are shown, and which
                   are primary. It never changes WHICH service is right.
     4. GUARDRAIL  Only services with role "lead" may be primary. From v6,
                   CRO is a lead (it may head a conversion-focused plan);
                   UI/UX, Technical SEO, Content Marketing and Link Building
                   still can never lead, whatever is answered.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MAM_DATA;

  var FUNDED = ["100to300", "over300"];

  /* A small, business-type "signature" — the service that characterises each
     business type. Used only to fill a SPARE support slot (never the headline,
     never displacing a service the brief asked for), so a local business, a
     national brand and an enterprise get a visibly different supporting mix
     even when their goal and challenge are the same. E-commerce already stands
     out through Shopping / E-commerce SEO, so it needs no extra signature. */
  var TYPE_SUPPORT = {
    local:      ["local", "reach"],
    mixed:      ["local", "reach"],
    national:   ["reach"],
    enterprise: ["technical", "reach"],
    ecommerce:  [],
  };

  function has(list, value) {
    return list.indexOf(value) !== -1;
  }

  /* An answer is one option id (v6 objective and challenge are single-select).
     Kept array-tolerant so a stray one-item list behaves identically. */
  function ids(answer) {
    if (answer === undefined || answer === null || answer === "") return [];
    return (Array.isArray(answer) ? answer : [answer]).filter(function (id) {
      return id !== undefined && id !== null && id !== "";
    });
  }

  /* ── Step 1 — merge the two answers into one ordered need list ─────── */

  /**
   * The objective sets the direction (its first need leads); the challenge
   * adds the fix; then the objective's remaining needs fill later slots.
   * When BOTH answers are "not sure" there is no direction at all, so we
   * fall back to a safe starter mix and let type + budget pick specifics.
   */
  function mergeNeeds(ctx) {
    if (ctx.objective === "unsure" && ctx.challenge === "unsure") {
      return D.DEFAULT_NEEDS.slice();
    }
    var obj = D.OBJECTIVE_NEEDS[ctx.objective] || [];
    var chal = D.CHALLENGE_NEEDS[ctx.challenge] || [];

    function dedupe(list) {
      var seen = {};
      return list.filter(function (need) {
        if (seen[need]) return false;
        seen[need] = true;
        return true;
      });
    }

    /* The real answer: objective's lead first (the direction), then the
       challenge's fix, then the objective's remaining needs. */
    var real = dedupe(obj.slice(0, 1).concat(chal).concat(obj.slice(1)));

    /* Technical SEO and UI/UX only ever deepen a primary, so they sort to the
       back of the real needs — a substantive service takes each slot first. */
    var DEEP = ["technical", "uiux"];
    real = real.filter(function (n) { return DEEP.indexOf(n) === -1; })
      .concat(real.filter(function (n) { return DEEP.indexOf(n) !== -1; }));

    /* Real needs only. The fallback tail that guarantees a big budget can be
       filled now lives in build() as a final SUPPORT-only phase, so it can
       never create a headline channel the brief never asked for. */
    return real;
  }

  /* Sensible channels used only to fill a budget the brief itself has run out
     of needs for. Applied last, as support, never as a main. */
  var FALLBACK_NEEDS = ["paid", "paid2", "organic", "conversion"];

  /* ── Step 2 — routing ─────────────────────────────────────────────── */

  /**
   * RULE 5.1 (v6) — who leads the paid slot.
   *
   * Paid social leads when the GOAL is demand creation rather than demand
   * capture:
   *   • "Generate more leads" for a Small Business / SME — unless the
   *     challenge is "doesn't rank on Google", which proves people are
   *     already searching, so paid search leads instead.
   *   • "Get more website traffic" or "Build brand awareness", whoever the
   *     client is — reaching people who are not searching yet.
   *   • whenever the challenge is "not enough people know my brand".
   * Paid search leads in every other case.
   *
   * A Thai local SME gets cheaper geo-targeted reach on Facebook, with
   * enquiries arriving in Messenger or LINE; a national brand or enterprise
   * has the search volume and tracking to make Google pay back.
   */
  function paidOrder(ctx) {
    var socialFirst =
      (ctx.objective === "leads" &&
        ctx.profile === "sme" &&
        ctx.challenge !== "ranking") ||
      ctx.objective === "traffic" ||
      ctx.objective === "awareness" ||
      ctx.challenge === "brand";
    return socialFirst ? ["social", "search"] : ["search", "social"];
  }

  function routeSearch(ctx) {
    /* Google Shopping when the client is selling products online (goal or
       store); Google Ads Campaigns for enquiry-led search. See ctx.shopping. */
    var lead = ctx.shopping ? "google-shopping" : "google-ads-campaigns";
    /* Performance Max extends a working Search or Shopping account across
       the rest of Google's channels. It is the second Google Ads service a
       big spender adds, never the first one we put them on. */
    var big =
      ctx.budget === "over300" &&
      (ctx.shopping || has(["national", "enterprise", "ecommerce", "mixed"], ctx.type));
    return big ? [lead, "performance-max"] : [lead];
  }

  function routeSocial(ctx) {
    /* Facebook Ads is the paid social workhorse — leads, traffic and sales
       alike. CPAS is collaborative advertising with marketplace and brand
       partners, so it follows for a funded store rather than leading. Social
       Media Campaigns is the broader multi-platform service, offered after
       the specific one. */
    var out = ["facebook-ads"];
    if (ctx.sells && has(FUNDED, ctx.budget)) out.push("cpas-ads");
    out.push("social-media-campaigns", "premium-creative");
    return out;
  }

  function routeOrganic(ctx) {
    return [ctx.sells ? "ecommerce-seo" : "seo-campaigns"];
  }

  function routeLocal(ctx) {
    /* Local SEO needs a real catchment area. An agency buying fulfilment for
       its own clients is not that, whatever its clients look like. It is
       warranted for a local/mixed business, or whenever the client explicitly
       asked to be found by nearby customers (ctx.wantsLocal). */
    if (ctx.profile === "agency") return [];
    if (ctx.type !== "local" && ctx.type !== "mixed" && !ctx.wantsLocal) return [];
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
    /* Reach unlocks from 50K+ so a national/enterprise brand has a broad-reach
       option at entry level too. Programmatic needs real scale, so the cheaper
       Display buy leads at 50–100K and for a mixed model; a funded national or
       enterprise advertiser leads with Programmatic. */
    if (!has(["50to100", "100to300", "over300"], ctx.budget)) return [];
    if (!has(["national", "enterprise", "mixed"], ctx.type)) return [];
    if (ctx.budget === "50to100" || ctx.type === "mixed")
      return ["google-display-ads", "youtube-ads", "programmatic-ads"];
    return ["programmatic-ads", "youtube-ads", "google-display-ads"];
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
    content: function () { return ["content-marketing"]; },
    authority: function () { return ["link-building"]; },
    uiux: function () { return ["ui-ux"]; },
    /* CRO leads a conversion-focused plan (see ctx.croCanLead); Heat Maps is
       the cheaper stand-in below 100K and the deepening partner above it.
       When CRO may lead, it is promoted from this list even if it appears
       second, so the cheaper ordering below is safe either way. */
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

  /* ── Step 1b — persona adjustments to the merged needs ────────────── */

  /* v6.1 — the old RULE 5.5 (auto-add Local SEO for every local business) and
     RULE 5.6 (auto-add Web Maintenance for every SME) are gone. The plan now
     answers what the client actually asked; Local SEO leads only when the goal
     is "get found by nearby customers", and Web Maintenance is raised in the
     consultation rather than pushed onto every SME site. */

  /**
   * RULE 5.4 — Agency clients.
   * An agency buys what it resells. AI visibility is the differentiator it
   * wants alongside an SEO campaign, and Link Building is the fulfilment it
   * cannot staff. Matches personas 14 and 15.
   */
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

  /* Which needs may take a MAIN (primary) card, versus support only. Paid
     channels always may. A visibility lead (organic, AI, local, website) may
     lead only when it is the plan's own direction, or when the client's
     Challenge explicitly points at it — otherwise it rides as support behind
     the main channel, which is what stops a business-type label from inventing
     a second headline service the client never asked for. CRO leads only a
     conversion-goal plan. Everything else (technical, content, UX, authority,
     reach, creative) is support only. */
  var ALWAYS_MAIN = { paid: true, paid2: true };
  function mainEligible(need, ctx) {
    /* RULE 5.4 — an agency's AI visibility is a headline differentiator, even
       though the agency rule injects it rather than the brief naming it. */
    if (need === "ai" && ctx.profile === "agency") return true;
    /* Only a need the brief itself named may lead — never a fallback channel
       that was only added to fill a big budget. */
    if (!ctx.realNeeds || !has(ctx.realNeeds, need)) return false;
    if (ALWAYS_MAIN[need]) return true;
    if (need === "conversion") return !!ctx.croCanLead;
    if (need === "organic" || need === "ai" || need === "local" || need === "website") {
      return need === ctx.primaryDirection || has(ctx.challengeNeeds, need);
    }
    return false;
  }

  /**
   * RULE 3.1 — only "lead" services may be primary (CRO is the one exception,
   *            for a conversion-goal plan).
   * RULE 5.2 — two primaries may never come from the same family.
   *
   * Budget sets the TOTAL number of cards; the brief decides how many of them
   * are mains. A brief with a single genuine lead shows one main and spends
   * the rest of the budget on the support that makes it succeed, rather than
   * inventing a second headline channel just to fill a slot.
   */
  function build(needs, ctx, maxPrimary, total) {
    var primaries = [];
    var supporting = [];
    var used = [];
    var families = [];
    var trace = [];

    function count() { return primaries.length + supporting.length; }

    function takeSupport(need, options, outcome) {
      for (var i = 0; i < options.length; i++) {
        var id = options[i];
        var service = D.CATALOGUE[id];
        if (!service || has(used, id)) continue;
        if (service.role !== "lead" && service.role !== "support") continue;
        supporting.push(id);
        used.push(id);
        trace.push({ need: need, service: id, outcome: outcome });
        return true;
      }
      return false;
    }

    /* Keep the headline budget-invariant: bring the earliest main-eligible
       need that actually resolves to a real lead to the front, so the top of
       the plan is the same at every budget — even when the brief's own first
       choice can't be delivered (e.g. an agency's local need resolves to
       nothing). Only reorders when the leading need doesn't resolve; in the
       normal case the first need is already the headline, so nothing moves. */
    needs = needs.slice();
    for (var h = 0; h < needs.length; h++) {
      var hName = needs[h].charAt(needs[h].length - 1) === "!" ? needs[h].slice(0, -1) : needs[h];
      if (!mainEligible(hName, ctx)) continue;
      var resolves = candidates(hName, ctx).some(function (id) {
        var s = D.CATALOGUE[id];
        return s && (s.role === "lead" || (id === "cro" && ctx.croCanLead));
      });
      if (resolves) {
        if (h > 0) needs.unshift(needs.splice(h, 1)[0]);
        break;
      }
    }

    needs.forEach(function (raw) {
      if (count() >= total) return;
      var primaryOnly = raw.charAt(raw.length - 1) === "!";
      var need = primaryOnly ? raw.slice(0, -1) : raw;
      var options = candidates(need, ctx);
      var canMain = primaries.length < maxPrimary && mainEligible(need, ctx);
      var i, id, service;

      if (canMain) {
        for (i = 0; i < options.length; i++) {
          id = options[i];
          service = D.CATALOGUE[id];
          if (!service || has(used, id)) continue;
          if (service.role !== "lead" && !(id === "cro" && ctx.croCanLead)) continue;
          if (has(families, service.family)) continue;    // RULE 5.2
          primaries.push(id);
          families.push(service.family);
          used.push(id);
          trace.push({ need: need, service: id, outcome: "primary" });
          return;
        }
      }

      /* A second ad platform is worth funding as a core channel or not at
         all — never demoted to a phase-two suggestion. */
      if (primaryOnly) {
        trace.push({ need: need, outcome: "dropped", why: "primary-only, no primary slot" });
        return;
      }

      /* A need that answers only to a support service still belongs on the
         plan — it takes a supporting slot. */
      if (!takeSupport(need, options, "supporting")) {
        trace.push({ need: need, outcome: "unresolved" });
      }
    });

    /* Business-type signature — before deepening or a generic fallback, spend a
       spare support slot on the service that characterises this business type
       (Local SEO for a local business, broad reach for a national/enterprise
       brand, technical depth for an enterprise). Runs after the brief's own
       needs are placed, so it only ever fills a slot the brief left open — it
       never displaces a service the client actually asked for. */
    (ctx.typeSupport || []).forEach(function (need) {
      if (count() >= total) return;
      takeSupport(need, candidates(need, ctx), "supporting (type)");
    });

    /* If the brief runs out before the budget does, deepen what is already
       recommended rather than reaching for an unrelated service — Google
       Business Profile under Local SEO, Heat Maps under CRO, the second
       service in an area the client is already investing in. */
    needs.forEach(function (raw) {
      if (count() >= total) return;
      var need = raw.charAt(raw.length - 1) === "!" ? raw.slice(0, -1) : raw;
      takeSupport(need, candidates(need, ctx), "supporting (deepened)");
    });

    /* Last resort — if the brief and its deepening still have not filled the
       budget, add sensible channels as SUPPORT (never mains), so a large
       budget is never left under-filled. Truly last, so it never changes the
       top of a plan. */
    FALLBACK_NEEDS.forEach(function (need) {
      if (count() >= total) return;
      takeSupport(need, candidates(need, ctx), "supporting (fallback)");
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
    /* Outcome Marketing needs enough budget and measurement maturity behind
       it before it can be promised. */
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

  /* ── Why a service is on the plan ─────────────────────────────────── */
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
   * "recommended" — the quiz cannot defend picking them from the answers —
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
        if (!has(chosen, id) && !has(out, id)) out.push(id);
      });
    }
    return out;
  }

  /* ── Lead payload ─────────────────────────────────────────────────────
     Shaped so the existing n8n workflow keeps working. It reads five fields:
     recommendation.primary.name / .url, .supporting, .all_ranked and
     .budget_tier. Everything else is additive; n8n ignores keys it does not
     map. v6 adds answers.objective alongside answers.challenge.
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
     suite runs under Node/JavaScriptCore, which has no DOM. */
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
      version: 4,
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
        objective: result.objective || null,
        challenge: result.challenge || null,
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
   * @param {Object} answers { profile, type, budget, objective, challenge }
   * @returns {Object} plan, or { isComplete:false } with the reason
   */
  function plan(answers) {
    answers = answers || {};
    var objective = ids(answers.objective)[0] || null;
    var challenge = ids(answers.challenge)[0] || null;
    var ctx = {
      profile: answers.profile,
      type: answers.type,
      budget: answers.budget,
      objective: objective,
      challenge: challenge,
      /* "Sells products online" — an online store, OR anyone whose GOAL is
         online sales. Follows what the client asked for, not just the
         business-type label. Drives E-commerce SEO and store-only channels. */
      sells: answers.type === "ecommerce" || objective === "sales",
      /* Google Shopping leads the paid-search slot when the goal is online
         sales, or for an online store that is not a small owner-run shop (a
         product feed is more setup than an SME shop usually wants to take on). */
      shopping: objective === "sales" ||
        (answers.type === "ecommerce" && answers.profile !== "sme"),
      /* The client explicitly asked to be found by nearby customers, so Local
         SEO is warranted whatever the business-type label says. */
      wantsLocal: objective === "local-visibility",
      /* Decision 1 — CRO leads only when the GOAL itself is about conversions.
         The "traffic but no sales" challenge still adds CRO, but as support. */
      croCanLead: objective === "conversions",
      /* The business-type signature, used to fill a spare support slot. */
      typeSupport: TYPE_SUPPORT[answers.type] || [],
    };

    var missing = [];
    ["profile", "type", "budget"].forEach(function (q) {
      if (!answers[q]) missing.push(q);
    });
    if (!objective) missing.push("objective");
    if (!challenge) missing.push("challenge");

    var validObjective = objective && D.OBJECTIVE_NEEDS.hasOwnProperty(objective);
    var validChallenge = challenge && D.CHALLENGE_NEEDS.hasOwnProperty(challenge);
    var key = objective && challenge ? objective + "|" + challenge : null;

    if (missing.length || !validObjective || !validChallenge) {
      return {
        logicVersion: 6,
        isComplete: false,
        missing: missing,
        situationKey: key,
        primaries: [],
        supporting: [],
      };
    }

    var quotaBase = D.BUDGET_PLAN[answers.budget] || D.BUDGET_PLAN.unsure;
    var maxPrimary = quotaBase.primary;
    var total = quotaBase.primary + quotaBase.supporting;

    var needs = mergeNeeds(ctx);
    /* The plan's direction is the first merged need; the Challenge's own needs
       are what may promote a visibility lead to a main; and only the brief's
       own needs may ever lead. All captured before the agency rule injects
       anything and before the fallback tail is reached. */
    ctx.primaryDirection = needs[0] || null;
    ctx.realNeeds = needs.slice();
    ctx.challengeNeeds = D.CHALLENGE_NEEDS[challenge] || [];

    needs = applyAgencyRule(needs, ctx, maxPrimary);
    var built = build(needs, ctx, maxPrimary, total);

    /* Every plan must have a headline. A directionless or contradictory brief
       (goal "not sure" with a challenge that names no leading channel; or an
       agency asking for a channel it does not buy for itself) can leave the
       build with no main — give it a paid channel to lead and rebuild once. */
    if (built.primaries.length === 0) {
      ctx.realNeeds = ["paid"].concat(ctx.realNeeds);
      ctx.primaryDirection = "paid";
      built = build(["paid"].concat(needs), ctx, maxPrimary, total);
    }

    /* Budget fixes the TOTAL number of cards; the split reports what the brief
       actually produced (e.g. 1 main + 2 support), so the labels stay honest. */
    var quota = {
      primary: built.primaries.length,
      supporting: built.supporting.length,
      /* "Start with both" only reads right with two mains; a single-main plan
         says "Start here" instead. */
      label: built.primaries.length < 2 && /both/i.test(quotaBase.label)
        ? "Start here"
        : quotaBase.label,
      nextLabel: quotaBase.nextLabel,
    };

    return {
      logicVersion: 6,
      isComplete: true,
      situationKey: key,
      objective: objective,
      challenge: challenge,
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
    mergeNeeds: mergeNeeds,
  };
})();
