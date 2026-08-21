/* ==========================================================================
   DATA — questions, answer options, service catalogue and scoring weights.
   Edit copy here; the scoring maths lives in engine.js.
   ========================================================================== */
(function () {
  "use strict";

  var SITE = "https://www.moveaheadmedia.co.th";

  /* ── SERVICE URLS ────────────────────────────────────────────────────
     Paste the live page URL for each service between the quotes. A service
     left as "" simply renders without a "Learn more" link, so the card still
     looks complete while links are outstanding.

     Do NOT use "#" — the card opens links in a new tab, so "#" would open an
     empty tab that goes nowhere.

     This is the only place service URLs live.
     ------------------------------------------------------------------ */
  var SERVICE_URLS = {
    /* ── SEO ── */
    "ai-seo": "",
    "seo-campaigns": "",
    "seo-audit": "",
    "on-page-seo": "",
    "content-marketing": "",
    "technical-seo": "",
    "ecommerce-seo": "",
    "video-seo": "",
    "keyword-mapping": "",
    "google-business-profile": "",
    "seo-reseller": "",
    "link-building": "",
    "local-seo": "",

    /* ── Google Ads ── */
    "google-ads-campaigns": "",
    "google-display-ads": "",
    "performance-max": "",
    "google-shopping": "",
    "youtube-ads": "",

    /* ── Social Media ── */
    "social-media-campaigns": "",
    "facebook-ads": "",
    "cpas-ads": "",
    "linkedin-ads": "",
    "reddit-ads": "",
    "line-ads": "",
    "x-ads": "",
    "tiktok-ads": "",
    "premium-creative": "",

    /* ── Website Development ── */
    "web-design": "",
    "web-maintenance": "",
    "ui-ux": "",
    "heat-maps": "",
    "cro": "",

    /* ── Other Services ── */
    "email-marketing": "",
    "programmatic-ads": "",
    "outcome-marketing": "",
  };

  /* ── Icons ──────────────────────────────────────────────────────────── */
  var ICONS = {
    search:
      '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/><path d="m16.5 16.5 4 4"/>',
    pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    sparkle:
      '<path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z"/><path d="M18.5 16.5 19.2 18.6 21 19.3 19.2 20 18.5 22 17.8 20 16 19.3 17.8 18.6Z"/>',
    target:
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    share:
      '<circle cx="17" cy="6" r="2.6"/><circle cx="7" cy="12" r="2.6"/><circle cx="17" cy="18" r="2.6"/><path d="m9.3 10.8 5.4-3.2M9.3 13.2l5.4 3.2"/>',
    monitor:
      '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M9 21h6M12 17v4"/>',
    layout:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5V20"/>',
    trending:
      '<path d="M4 16.5 9.5 11l3.5 3.5L20 7"/><path d="M15.5 7H20v4.5"/>',
    document:
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    broadcast:
      '<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 16.5a6.4 6.4 0 0 0 0-9"/><path d="M4.6 4.6a10.4 10.4 0 0 0 0 14.8M19.4 19.4a10.4 10.4 0 0 0 0-14.8"/>',
    handshake:
      '<path d="M3 12.5 7.5 8l3 2.5 3-2.5L18 12"/><path d="M7.5 8 4 11.5v4L8 19l2-2 2 2 2-2 2 2 3-3.5v-4L18 12"/>',
    compass:
      '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-1.8 4.2L9 15l1.8-4.2L15 9Z"/>',
    trophy:
      '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3"/><path d="M10 13v3h4v-3M8.5 20h7"/>',
    /* Added for the 35-service catalogue. Same 24x24 stroke grid as above —
       paths only, no <svg> wrapper; app.js supplies that. */
    cart: '<circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/><path d="M3 4h2.2l2.3 11h10.2l2.1-7.5H6"/>',
    link: '<path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5"/><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5"/>',
    play: '<circle cx="12" cy="12" r="8.5"/><path d="M10.3 8.8v6.4l5-3.2-5-3.2Z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.9 7.5l2.2 1.3M16.9 15.2l2.2 1.3M4.9 16.5l2.2-1.3M16.9 8.8l2.2-1.3"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    palette:
      '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.7 0-.8.7-1.5 1.5-1.5H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.4 16.7 3.5 12 3.5Z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>',
  };

  /* ── CATALOGUE (logic v5) ───────────────────────────────────────────
     The 35 services exactly as signed off on the service sheet.

     Nothing reads this yet — the live quiz still runs on SERVICES above.
     It is wired up in step 3 of the build, so this file can be reviewed
     and the URLs filled in without changing a single recommendation.

     Each entry carries three fields the old catalogue did not have:

       category  The heading it sits under on the website.
       family    Used by the "two primaries must be genuinely different"
                 rule. Two services from the same family can never both
                 lead a plan — no Google Ads Campaigns + Performance Max.
       role      "lead"     may be primary or supporting
                 "support"  supporting only, never primary. This is the
                            guardrail for CRO, UI/UX, Technical SEO,
                            Content Marketing and Link Building.
                 "platform" named inside the Social Media Campaigns card
                            rather than winning a card of its own
                 "overlay"  changes how work is delivered, never a card
     ------------------------------------------------------------------ */
  var CATALOGUE = {
    /* ══ SEO ═══════════════════════════════════════════════════════ */
    "ai-seo": {
      name: "AI SEO",
      category: "SEO",
      family: "seo-ai",
      role: "lead",
      kicker: "AI Search Visibility",
      icon: ICONS.sparkle,
      url: SERVICE_URLS["ai-seo"],
      blurb:
        "Improve your visibility across Google Search and AI search experiences such as Google AI Overviews, ChatGPT and Gemini.",
      /* Deliverables are deliberately AI-only. The signed sheet listed
         On-page SEO and Technical SEO here as well, which made this card
         read as half of SEO Campaigns — the two are recommended together
         in five personas, and a client should never see the same work
         quoted twice. */
      deliverables: [
        "Entity & brand optimisation",
        "AI citation tracking",
        "Answer-format content",
        "Schema for AI assistants",
      ],
    },
    "seo-campaigns": {
      name: "SEO Campaigns",
      category: "SEO",
      family: "seo-organic",
      role: "lead",
      kicker: "Organic Search Growth",
      icon: ICONS.search,
      url: SERVICE_URLS["seo-campaigns"],
      blurb:
        "Improve your visibility on Google with an SEO strategy built around your business goals.",
      deliverables: [
        "SEO strategy",
        "Keyword targeting",
        "On-page SEO",
        "Technical SEO",
      ],
    },
    "ecommerce-seo": {
      name: "E-commerce SEO",
      category: "SEO",
      family: "seo-organic",
      role: "lead",
      kicker: "Grow Organic Sales",
      icon: ICONS.cart,
      url: SERVICE_URLS["ecommerce-seo"],
      blurb:
        "Improve product and category visibility in search to help more shoppers discover your online store.",
      deliverables: [
        "Product optimisation",
        "Category optimisation",
        "Technical SEO",
        "E-commerce keyword strategy",
      ],
    },
    "local-seo": {
      name: "Local SEO",
      category: "SEO",
      family: "seo-local",
      role: "lead",
      kicker: "Local Search Visibility",
      icon: ICONS.pin,
      url: SERVICE_URLS["local-seo"],
      blurb:
        "Help nearby customers find your business when they search for products or services in your area.",
      deliverables: [
        "Local keyword targeting",
        "Local landing pages",
        "Google Business Profile",
        "Local SEO optimisation",
      ],
    },
    "content-marketing": {
      name: "Content Marketing",
      category: "SEO",
      family: "seo-content",
      role: "support",
      kicker: "Build Search Authority",
      icon: ICONS.document,
      url: SERVICE_URLS["content-marketing"],
      blurb:
        "Create useful, search-focused content that attracts your audience and strengthens your visibility and authority.",
      deliverables: [
        "Content strategy",
        "SEO content",
        "Blog content",
        "Content optimisation",
      ],
    },
    "technical-seo": {
      name: "Technical SEO",
      category: "SEO",
      family: "seo-technical",
      role: "support",
      kicker: "Strengthen Your SEO Foundation",
      icon: ICONS.gear,
      url: SERVICE_URLS["technical-seo"],
      blurb:
        "Improve the technical health of your website so search engines can crawl, understand and index it effectively.",
      deliverables: [
        "Technical audit",
        "Crawlability",
        "Indexation",
        "Site performance",
      ],
    },
    "seo-audit": {
      name: "SEO Audit",
      category: "SEO",
      family: "seo-technical",
      role: "support",
      kicker: "Find SEO Opportunities",
      icon: ICONS.search,
      url: SERVICE_URLS["seo-audit"],
      blurb:
        "Identify technical, content and search visibility issues that may be limiting your website's organic performance.",
      deliverables: [
        "Technical SEO audit",
        "On-page review",
        "Keyword review",
        "Competitor insights",
      ],
    },
    "on-page-seo": {
      name: "On-page SEO",
      category: "SEO",
      family: "seo-technical",
      role: "support",
      kicker: "Improve Page Visibility",
      icon: ICONS.document,
      url: SERVICE_URLS["on-page-seo"],
      blurb:
        "Optimise individual website pages so search engines and users can better understand your content and services.",
      deliverables: [
        "Meta optimisation",
        "Content optimisation",
        "Internal linking",
        "Page structure",
      ],
    },
    "keyword-mapping": {
      name: "Keyword Mapping",
      category: "SEO",
      family: "seo-technical",
      role: "support",
      kicker: "Target the Right Searches",
      icon: ICONS.compass,
      url: SERVICE_URLS["keyword-mapping"],
      blurb:
        "Match the right search terms to the right website pages to create a clearer SEO and content strategy.",
      deliverables: [
        "Keyword research",
        "Search intent mapping",
        "Page mapping",
        "Content gap analysis",
      ],
    },
    "google-business-profile": {
      name: "Google Business Profile",
      category: "SEO",
      family: "seo-local",
      role: "support",
      kicker: "Improve Local Presence",
      icon: ICONS.pin,
      url: SERVICE_URLS["google-business-profile"],
      blurb:
        "Improve how your business appears on Google Search and Maps so nearby customers can find you more easily.",
      deliverables: [
        "Profile optimisation",
        "Business information updates",
        "Local visibility",
        "Performance review",
      ],
    },
    "link-building": {
      name: "Link Building",
      category: "SEO",
      family: "seo-authority",
      role: "support",
      kicker: "Build SEO Authority",
      icon: ICONS.link,
      url: SERVICE_URLS["link-building"],
      blurb:
        "Strengthen your website's authority with relevant links that support long-term organic search performance.",
      deliverables: [
        "Link strategy",
        "Outreach",
        "Backlink acquisition",
        "Link reporting",
      ],
    },
    "video-seo": {
      name: "Video SEO",
      category: "SEO",
      family: "seo-content",
      role: "support",
      kicker: "Grow Video Visibility",
      icon: ICONS.play,
      url: SERVICE_URLS["video-seo"],
      blurb:
        "Optimise video content to improve discoverability across search engines and video platforms.",
      deliverables: [
        "Video keyword research",
        "Metadata optimisation",
        "Video content optimisation",
        "Performance review",
      ],
    },
    "seo-reseller": {
      name: "SEO Reseller",
      category: "SEO",
      family: "delivery",
      role: "overlay",
      kicker: "Scale Your SEO Offering",
      icon: ICONS.handshake,
      url: SERVICE_URLS["seo-reseller"],
      blurb:
        "Expand your agency's SEO services with delivery support from our team while you keep the client relationship.",
      deliverables: [
        "SEO campaign delivery",
        "Reporting support",
        "Link building",
        "Scalable fulfilment",
      ],
    },

    /* ══ Google Ads ════════════════════════════════════════════════ */
    "google-ads-campaigns": {
      name: "Google Ads Campaigns",
      category: "Google Ads",
      family: "paid-search",
      role: "lead",
      kicker: "Capture Search Demand",
      icon: ICONS.target,
      url: SERVICE_URLS["google-ads-campaigns"],
      blurb:
        "Reach people who are actively searching for your products or services with targeted Google Ads campaigns.",
      deliverables: [
        "Search campaigns",
        "Keyword targeting",
        "Conversion tracking",
        "Campaign optimisation",
      ],
    },
    "google-shopping": {
      name: "Google Shopping",
      category: "Google Ads",
      family: "paid-search",
      role: "lead",
      kicker: "Drive Product Sales",
      icon: ICONS.cart,
      url: SERVICE_URLS["google-shopping"],
      blurb:
        "Promote your products across Google and connect shoppers with the products they are already looking for.",
      deliverables: [
        "Shopping campaigns",
        "Product feed support",
        "Campaign optimisation",
        "Conversion tracking",
      ],
    },
    "performance-max": {
      name: "Performance Max",
      category: "Google Ads",
      family: "paid-search",
      role: "lead",
      kicker: "Multi-channel Growth",
      icon: ICONS.target,
      url: SERVICE_URLS["performance-max"],
      blurb:
        "Reach potential customers across Google's channels with campaigns optimised around your business goals.",
      deliverables: [
        "Performance Max setup",
        "Audience signals",
        "Asset optimisation",
        "Performance reporting",
      ],
    },
    "google-display-ads": {
      name: "Google Display Ads",
      category: "Google Ads",
      family: "paid-display",
      role: "support",
      kicker: "Build Brand Awareness",
      icon: ICONS.broadcast,
      url: SERVICE_URLS["google-display-ads"],
      blurb:
        "Reach relevant audiences across Google's Display Network with visual campaigns designed to build awareness and demand.",
      deliverables: [
        "Display campaigns",
        "Audience targeting",
        "Remarketing",
        "Campaign optimisation",
      ],
    },
    "youtube-ads": {
      name: "YouTube Ads",
      category: "Google Ads",
      family: "paid-display",
      role: "support",
      kicker: "Reach Customers with Video",
      icon: ICONS.play,
      url: SERVICE_URLS["youtube-ads"],
      blurb:
        "Reach and engage potential customers on YouTube with video campaigns built around your marketing goals.",
      deliverables: [
        "YouTube campaigns",
        "Audience targeting",
        "Video ad strategy",
        "Campaign optimisation",
      ],
    },

    /* ══ Social Media ══════════════════════════════════════════════ */
    "facebook-ads": {
      name: "Facebook Ads",
      category: "Social Media",
      family: "paid-social",
      role: "lead",
      kicker: "Generate More Leads",
      icon: ICONS.share,
      url: SERVICE_URLS["facebook-ads"],
      blurb:
        "Reach new customers on Facebook and Instagram with targeted campaigns designed to generate leads and build demand.",
      deliverables: [
        "Meta Ads",
        "Lead generation campaigns",
        "Retargeting audiences",
        "Campaign optimisation",
      ],
    },
    "cpas-ads": {
      name: "CPAS Ads",
      category: "Social Media",
      family: "paid-social",
      role: "lead",
      kicker: "Drive E-commerce Sales",
      icon: ICONS.cart,
      url: SERVICE_URLS["cpas-ads"],
      blurb:
        "Reach relevant shoppers with collaborative advertising campaigns designed to support product discovery and online sales.",
      deliverables: [
        "CPAS campaign setup",
        "Product targeting",
        "Retargeting",
        "Campaign optimisation",
      ],
    },
    "social-media-campaigns": {
      name: "Social Media Campaigns",
      category: "Social Media",
      family: "paid-social",
      role: "lead",
      kicker: "Build Social Demand",
      icon: ICONS.share,
      url: SERVICE_URLS["social-media-campaigns"],
      blurb:
        "Build awareness and engagement across social platforms with campaigns designed around your audience and business goals.",
      deliverables: [
        "Social campaign strategy",
        "Platform planning",
        "Audience targeting",
        "Campaign optimisation",
      ],
      /* Four questions cannot honestly tell us whether a client belongs on
         LinkedIn or Reddit, so the platforms are named here and chosen in
         the consultation instead of being guessed at. */
      platforms: [
        "facebook-ads",
        "tiktok-ads",
        "line-ads",
        "linkedin-ads",
        "reddit-ads",
        "x-ads",
      ],
    },
    "linkedin-ads": {
      name: "LinkedIn Ads",
      category: "Social Media",
      family: "paid-social",
      role: "platform",
      kicker: "Reach Business Decision-makers",
      icon: ICONS.share,
      url: SERVICE_URLS["linkedin-ads"],
      blurb:
        "Reach professionals and business decision-makers with targeted campaigns based on industry, role and company profile.",
      deliverables: [
        "LinkedIn Ads",
        "B2B targeting",
        "Lead generation",
        "Campaign optimisation",
      ],
    },
    "line-ads": {
      name: "LINE Ads",
      category: "Social Media",
      family: "paid-social",
      role: "platform",
      kicker: "Reach Customers on LINE",
      icon: ICONS.share,
      url: SERVICE_URLS["line-ads"],
      blurb:
        "Reach audiences in Thailand through targeted LINE campaigns designed around your business goals.",
      deliverables: [
        "LINE Ads",
        "Audience targeting",
        "Traffic or conversion campaigns",
        "Campaign optimisation",
      ],
    },
    "tiktok-ads": {
      name: "TikTok Ads",
      category: "Social Media",
      family: "paid-social",
      role: "platform",
      kicker: "Reach New Audiences",
      icon: ICONS.share,
      url: SERVICE_URLS["tiktok-ads"],
      blurb:
        "Reach and engage audiences on TikTok with platform-first campaigns designed to build awareness, traffic or conversions.",
      deliverables: [
        "TikTok Ads",
        "Audience targeting",
        "Campaign setup",
        "Campaign optimisation",
      ],
    },
    "reddit-ads": {
      name: "Reddit Ads",
      category: "Social Media",
      family: "paid-social",
      role: "platform",
      kicker: "Reach Engaged Communities",
      icon: ICONS.share,
      url: SERVICE_URLS["reddit-ads"],
      blurb:
        "Connect with relevant Reddit communities and audiences through campaigns targeted around their interests.",
      deliverables: [
        "Reddit Ads",
        "Community targeting",
        "Traffic campaigns",
        "Campaign optimisation",
      ],
    },
    "x-ads": {
      name: "X Ads",
      category: "Social Media",
      family: "paid-social",
      role: "platform",
      kicker: "Join Real-time Conversations",
      icon: ICONS.share,
      url: SERVICE_URLS["x-ads"],
      blurb:
        "Reach relevant audiences on X with campaigns designed to build awareness, engagement and website traffic.",
      deliverables: [
        "X Ads",
        "Audience targeting",
        "Awareness campaigns",
        "Campaign optimisation",
      ],
    },
    "premium-creative": {
      name: "Premium Creative",
      category: "Social Media",
      family: "creative",
      role: "support",
      kicker: "Creative Built to Perform",
      icon: ICONS.palette,
      url: SERVICE_URLS["premium-creative"],
      blurb:
        "Create platform-ready campaign assets designed to communicate your message clearly and support paid media performance.",
      deliverables: [
        "Ad creative",
        "Social assets",
        "Campaign concepts",
        "Creative variations",
      ],
    },

    /* ══ Website Development ═══════════════════════════════════════ */
    "web-design": {
      name: "Web Design",
      category: "Website Development",
      family: "web",
      role: "lead",
      kicker: "Build Your Digital Foundation",
      icon: ICONS.monitor,
      url: SERVICE_URLS["web-design"],
      blurb:
        "Create a responsive, easy-to-use website that supports your brand, customers and marketing goals.",
      deliverables: [
        "Website design",
        "Responsive layouts",
        "Landing pages",
        "CMS-ready design",
      ],
    },
    "ui-ux": {
      name: "UI/UX",
      category: "Website Development",
      family: "web",
      role: "support",
      kicker: "Improve User Experience",
      icon: ICONS.layout,
      url: SERVICE_URLS["ui-ux"],
      blurb:
        "Make your website easier to use with clearer journeys, better layouts and customer-focused design.",
      deliverables: [
        "UX review",
        "UI design",
        "User journey improvements",
        "Wireframes and prototypes",
      ],
    },
    "web-maintenance": {
      name: "Web Maintenance",
      category: "Website Development",
      family: "web",
      role: "support",
      kicker: "Keep Your Website Running",
      icon: ICONS.gear,
      url: SERVICE_URLS["web-maintenance"],
      blurb:
        "Keep your website updated, secure and working properly with ongoing technical and content support.",
      deliverables: [
        "Website updates",
        "Technical maintenance",
        "Content updates",
        "Ongoing support",
      ],
    },
    "cro": {
      name: "Conversion Rate Optimisation (CRO)",
      category: "Website Development",
      family: "conversion",
      role: "support",
      kicker: "Turn More Visitors into Customers",
      icon: ICONS.trending,
      url: SERVICE_URLS["cro"],
      blurb:
        "Improve your website and landing pages to help more visitors take valuable actions such as enquiries, sign-ups or purchases.",
      deliverables: [
        "Conversion analysis",
        "Landing page optimisation",
        "A/B testing",
        "Heat map insights",
      ],
    },
    "heat-maps": {
      name: "Heat Maps",
      category: "Website Development",
      family: "conversion",
      role: "support",
      kicker: "Understand User Behaviour",
      icon: ICONS.trending,
      url: SERVICE_URLS["heat-maps"],
      blurb:
        "See how visitors interact with your website and use behavioural insights to identify opportunities for improvement.",
      deliverables: [
        "Heat map tracking",
        "Click analysis",
        "Scroll analysis",
        "Behaviour insights",
      ],
    },

    /* ══ Other Services ════════════════════════════════════════════ */
    "programmatic-ads": {
      name: "Programmatic Ads",
      category: "Other Services",
      family: "reach",
      role: "support",
      kicker: "Reach the Right Audience",
      icon: ICONS.broadcast,
      url: SERVICE_URLS["programmatic-ads"],
      blurb:
        "Use data-led digital advertising to reach relevant audiences across websites, apps and other online channels.",
      deliverables: [
        "Audience targeting",
        "Display advertising",
        "Campaign optimisation",
        "Performance reporting",
      ],
    },
    "email-marketing": {
      name: "Email Marketing",
      category: "Other Services",
      family: "retention",
      role: "support",
      kicker: "Engage and Retain Customers",
      icon: ICONS.mail,
      url: SERVICE_URLS["email-marketing"],
      blurb:
        "Stay connected with customers through targeted email campaigns designed to support engagement, retention and conversions.",
      deliverables: [
        "Email campaigns",
        "Audience segmentation",
        "Email automation",
        "Performance reporting",
      ],
    },
    "outcome-marketing": {
      name: "Outcome Marketing",
      category: "Other Services",
      family: "delivery",
      role: "overlay",
      kicker: "Focus on Measurable Outcomes",
      icon: ICONS.trophy,
      url: SERVICE_URLS["outcome-marketing"],
      blurb:
        "Optimise marketing towards agreed business outcomes with clear measurement, ongoing optimisation and transparent reporting.",
      deliverables: [
        "Outcome-based campaigns",
        "Download, first-order or sales tracking",
        "Performance optimisation",
        "Transparent reporting",
      ],
    },
  };

  /* ── Questions ──────────────────────────────────────────────────────
     Answer copy only. Nothing here scores anything: the two challenges are
     read together as a brief in SITUATIONS below, and business type and
     persona decide which service answers it. See planner.js.
     ------------------------------------------------------------------ */
  var QUESTIONS = [
    {
      id: "profile",
      shortLabel: "About you",
      title: "Which best describes your business?",
      subtitle: "This tells us who we would be working with day to day.",
      options: [
        {
          id: "sme",
          label: "Small Business / SME",
          desc: "I own or manage a small business.",
        },
        {
          id: "inhouse",
          label: "In-House Marketing Team",
          desc: "I work for a company and manage marketing internally.",
        },
        {
          id: "enterprise",
          label: "Enterprise / Corporate",
          desc: "I work for a large organisation with multiple stakeholders.",
        },
        {
          id: "agency",
          label: "Agency / Consultant",
          desc: "I provide marketing services to clients.",
        },
      ],
    },
    {
      id: "type",
      shortLabel: "Business type",
      title: "What type of business are you?",
      subtitle: "Different models need very different channel mixes.",
      options: [
        {
          id: "local",
          label: "Local Business / SME",
          desc: "You serve customers in a specific city or region.",
          noun: "local business",
        },
        {
          id: "national",
          label: "National Brand",
          desc: "You sell across Thailand or several markets.",
          noun: "national brand",
        },
        {
          id: "ecommerce",
          label: "E-commerce Business",
          desc: "Revenue comes primarily through online sales.",
          noun: "e-commerce business",
        },
        {
          id: "enterprise",
          label: "Enterprise Company",
          desc: "Large, multi-team, often multi-brand or multi-country.",
          noun: "enterprise company",
        },
        {
          id: "mixed",
          label: "Mixed Business Model",
          desc: "A blend of the above — online and offline revenue.",
          noun: "business with a mixed model",
        },
      ],
    },
    {
      id: "budget",
      shortLabel: "Budget",
      title: "What is your monthly SEO, AI Visibility or Marketing budget?",
      subtitle:
        "Honest answers get honest recommendations — there is no wrong option.",
      /* Budget shifts emphasis, it does not pick the answer. A small budget
         leans on channels that pay back fast and cost little to run; a larger
         one makes compounding assets — organic, content, scaled media — worth
         funding. It never awards points evenly across the board, which is what
         previously let a service ride up the ranking on budget alone. */
      options: [
        {
          id: "under50",
          label: "Below THB 50,000/month",
          desc: "Focus everything on one or two channels.",
        },
        {
          id: "50to100",
          label: "THB 50,000 – 100,000/month",
          desc: "Enough to run a serious channel properly.",
        },
        {
          id: "100to300",
          label: "THB 100,001 – 300,000/month",
          desc: "Room for a multi-channel programme.",
        },
        {
          id: "over300",
          label: "THB 300,001+/month",
          desc: "Full-funnel strategy across search, AI and media.",
        },
        {
          id: "unsure",
          label: "I'm not sure yet",
          desc: "We will help you size it against your goals.",
        },
      ],
    },
    {
      id: "challenge",
      shortLabel: "Challenge",
      title: "What is your biggest marketing challenge right now?",
      subtitle:
        "Pick the one that matters most, then add a second if you have two. We read them together as one brief.",
      /* The only multi-select question. The first pick scores in full and the
         second at SECONDARY_CHALLENGE_WEIGHT, so the challenge the client calls
         biggest is still what drives the recommendation. */
      multi: true,
      maxSelections: 2,
      options: [
        {
          id: "leads",
          label: "I need more leads.",
          desc: "Enquiries, calls and bookings — not just visitors.",
          phrase: "you need more leads",
        },
        {
          id: "ranking",
          label: "My website doesn't rank on Google.",
          desc: "Competitors are above you for the terms that matter.",
          phrase: "your site isn't ranking on Google",
        },
        {
          id: "ai",
          label: "My business isn't visible in AI Search.",
          desc: "ChatGPT, Gemini and AI Overviews never mention you.",
          phrase: "you're not showing up in AI search",
        },
        {
          id: "traffic",
          label: "I need more traffic.",
          desc: "Not enough people are reaching your site at all.",
          phrase: "you need more traffic",
        },
        {
          id: "website",
          label: "My website needs an upgrade.",
          desc: "It looks dated, loads slowly, or converts badly.",
          phrase: "your website needs an upgrade",
        },
        {
          id: "unsure",
          label: "I'm not sure where to start.",
          desc: "You know you need help, not which help.",
          phrase: "you're not yet sure where to start",
          /* The one answer that REQUIRES a partner. "I don't know" is not
             something we can plan from, so the visitor names the closest
             problem and that pair carries the brief. */
          requiresSecond: true,
        },
      ],
    },
  ];

  /* ── SITUATIONS (logic v5) ──────────────────────────────────────────
     The two challenges are read together as one brief. There are exactly
     30 possible briefs, and each one lists the KINDS of service it calls
     for, in order. This table is the business logic — changing a row
     changes only that situation and nothing else.

     Keys are "main" for a single challenge, or "main|second" for a pair.

     A need ending in "!" is primary-only: if the budget has already filled
     its primary slots, that need is dropped rather than demoted. A second
     ad platform is only worth adding when it can be funded as a core
     channel — it is never a phase-two extra.

     Needs vocabulary:
       paid / paid2  a paid channel; RULE 5.1 decides search vs social
       organic       SEO Campaigns, or E-commerce SEO for online stores
       ai            AI SEO
       local         Local SEO, then Google Business Profile
       website       Web Design, then Web Maintenance
       uiux          UI/UX
       conversion    CRO, then Heat Maps
       content       Content Marketing
       technical     Technical SEO, or On-page SEO / SEO Audit below 100K
       authority     Link Building
       reach         Programmatic Ads, then YouTube Ads
       retention     Email Marketing
       creative      Premium Creative
     ------------------------------------------------------------------ */
  var SITUATIONS = {
    /* ── One challenge on its own ── */
    "leads":    ["paid", "paid2!", "conversion", "organic", "creative"],
    "ranking":  ["local", "organic", "ai", "content", "authority"],
    "ai":       ["ai", "content", "organic", "technical"],
    "traffic":  ["organic", "paid", "paid2", "content", "reach"],
    "website":  ["website", "organic", "conversion", "uiux"],

    /* ── Main challenge: I need more leads ── */
    "leads|ranking": ["paid", "organic", "paid2!", "conversion"],
    "leads|ai":      ["paid", "ai", "content", "organic"],
    "leads|traffic": ["paid", "paid2!", "organic", "reach", "retention"],
    "leads|website": ["paid", "paid2!", "website", "conversion", "creative"],

    /* ── Main challenge: my website doesn't rank ── */
    "ranking|leads":   ["organic", "paid", "content", "conversion"],
    "ranking|ai":      ["organic", "ai", "content", "technical"],
    "ranking|traffic": ["organic", "local", "ai", "content", "authority"],
    "ranking|website": ["organic", "website", "technical", "conversion"],

    /* ── Main challenge: I'm not visible in AI search ── */
    "ai|leads":    ["ai", "paid", "content", "conversion"],
    "ai|ranking":  ["ai", "organic", "content", "technical"],
    "ai|traffic":  ["ai", "organic", "content", "paid"],
    "ai|website":  ["ai", "website", "content", "technical"],

    /* ── Main challenge: I need more traffic ── */
    "traffic|leads":   ["organic", "paid", "paid2!", "conversion"],
    "traffic|ranking": ["organic", "ai", "content", "local", "authority"],
    "traffic|ai":      ["organic", "ai", "content", "reach"],
    "traffic|website": ["organic", "website", "conversion", "paid"],

    /* ── Main challenge: my website needs an upgrade ── */
    "website|leads":   ["website", "paid", "conversion", "uiux"],
    "website|ranking": ["website", "organic", "technical", "conversion"],
    "website|ai":      ["website", "ai", "content", "conversion"],
    "website|traffic": ["website", "organic", "conversion", "paid"],

    /* ── Main challenge: I'm not sure where to start ──
       Never shown alone. The visitor must name the closest problem, and
       that second answer carries the brief. Two paid channels here are
       deliberate and NOT primary-only: when a client genuinely does not
       know, covering both demand capture and demand creation is the
       honest starting mix. */
    "unsure|leads":   ["paid", "paid2", "organic", "ai"],
    "unsure|ranking": ["organic", "local", "paid", "content"],
    "unsure|ai":      ["ai", "organic", "content", "paid"],
    "unsure|traffic": ["organic", "paid", "paid2!", "content"],
    "unsure|website": ["website", "conversion", "paid", "organic"],
  };

  /* ── BUDGET PLAN (logic v5) ─────────────────────────────────────────
     Budget's only job: how many services are shown. It never changes
     WHICH service is right. The two primaries are equal to each other —
     a client who can fund both runs both from the start.
     ------------------------------------------------------------------ */
  var BUDGET_PLAN = {
    under50:   { primary: 1, supporting: 1, label: "Start here", nextLabel: "Next phase" },
    "50to100": { primary: 2, supporting: 1, label: "Start with both", nextLabel: "Add next" },
    "100to300":{ primary: 2, supporting: 2, label: "Start with both", nextLabel: "Add next" },
    over300:   { primary: 2, supporting: 2, label: "Integrated programme", nextLabel: "Runs alongside" },
    unsure:    { primary: 1, supporting: 1, label: "Size the budget first", nextLabel: "Then add" },
  };

  /* ── Budget framing shown on the results screen ─────────────────────── */
  var BUDGET_NOTES = {
    under50: {
      tier: "Focused start",
      text: "Fund the primary recommendation first. Treat the other two services as a roadmap rather than three simultaneous retainers.",
      supportHeading: "Keep these as your next priorities",
      activeWorkstreams: 1,
    },
    "50to100": {
      tier: "Growth",
      text: "Run the primary and first supporting service together; keep the third recommendation as the next phase.",
      supportHeading: "Support it with",
      activeWorkstreams: 2,
    },
    "100to300": {
      tier: "Scale",
      text: "This supports two active workstreams, with the third recommendation sequenced as the next expansion.",
      supportHeading: "Build alongside it with",
      activeWorkstreams: 2,
    },
    over300: {
      tier: "Enterprise",
      text: "This can support all three recommendations as an integrated programme, subject to channel forecasts and delivery capacity.",
      supportHeading: "Complete the mix with",
      activeWorkstreams: 3,
    },
    unsure: {
      tier: "To be sized",
      text: "These are areas to explore, not a commitment to launch them together. Size the budget before selecting active workstreams.",
      supportHeading: "Explore these areas with a strategist",
      activeWorkstreams: null,
      requiresSizing: true,
    },
  };

  window.MAM_DATA = {
    ICONS: ICONS,
    SERVICE_URLS: SERVICE_URLS,
    CATALOGUE: CATALOGUE,
    SITUATIONS: SITUATIONS,
    BUDGET_PLAN: BUDGET_PLAN,
    QUESTIONS: QUESTIONS,
    BUDGET_NOTES: BUDGET_NOTES,
  };
})();
