/* ==========================================================================
   DATA — questions, answer options, service catalogue and scoring weights.
   Edit copy here; the scoring maths lives in engine.js.
   ========================================================================== */
(function () {
  'use strict';

  var SITE = 'https://www.moveaheadmedia.co.th';

  /* ── Icons ──────────────────────────────────────────────────────────── */
  var ICONS = {
    search:   '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/><path d="m16.5 16.5 4 4"/>',
    pin:      '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    sparkle:  '<path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z"/><path d="M18.5 16.5 19.2 18.6 21 19.3 19.2 20 18.5 22 17.8 20 16 19.3 17.8 18.6Z"/>',
    target:   '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    share:    '<circle cx="17" cy="6" r="2.6"/><circle cx="7" cy="12" r="2.6"/><circle cx="17" cy="18" r="2.6"/><path d="m9.3 10.8 5.4-3.2M9.3 13.2l5.4 3.2"/>',
    monitor:  '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M9 21h6M12 17v4"/>',
    layout:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5V20"/>',
    trending: '<path d="M4 16.5 9.5 11l3.5 3.5L20 7"/><path d="M15.5 7H20v4.5"/>',
    document: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    broadcast:'<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 16.5a6.4 6.4 0 0 0 0-9"/><path d="M4.6 4.6a10.4 10.4 0 0 0 0 14.8M19.4 19.4a10.4 10.4 0 0 0 0-14.8"/>',
    handshake:'<path d="M3 12.5 7.5 8l3 2.5 3-2.5L18 12"/><path d="M7.5 8 4 11.5v4L8 19l2-2 2 2 2-2 2 2 3-3.5v-4L18 12"/>',
    compass:  '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-1.8 4.2L9 15l1.8-4.2L15 9Z"/>',
    trophy:   '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3"/><path d="M10 13v3h4v-3M8.5 20h7"/>'
  };

  /* ── Service catalogue ──────────────────────────────────────────────
     Every id used in a weights map below must exist here.
     ------------------------------------------------------------------ */
  var SERVICES = {
    'seo': {
      name: 'SEO',
      kicker: 'Organic search',
      icon: ICONS.search,
      url: SITE + '/seo/',
      blurb: 'Own the rankings your competitors are paying for. Technical fixes, topical content and authority building that compound month after month.',
      deliverables: ['Technical SEO audit', 'Keyword & topic mapping', 'On-page optimisation', 'Link building']
    },
    'local-seo': {
      name: 'Local SEO',
      kicker: 'Maps & near-me search',
      icon: ICONS.pin,
      url: SITE + '/seo/local-seo/',
      blurb: 'Get found by people searching in your area. Google Business Profile, map pack rankings and location pages that turn searches into walk-ins and calls.',
      deliverables: ['Google Business Profile', 'Map pack rankings', 'Local landing pages', 'Review strategy']
    },
    'ai-seo': {
      name: 'AI SEO',
      kicker: 'Visibility in AI search',
      icon: ICONS.sparkle,
      url: SITE + '/seo/ai-seo/',
      blurb: 'Be the brand ChatGPT, Gemini and Google AI Overviews actually cite. Entity, schema and answer-led content built for how AI picks sources.',
      deliverables: ['AI visibility audit', 'Entity & schema build', 'Answer-led content', 'LLM citation tracking']
    },
    'google-ads': {
      name: 'Google Ads & Paid Media',
      kicker: 'Buy demand now',
      icon: ICONS.target,
      url: SITE + '/paid-media/google-ads/',
      blurb: 'Immediate, measurable traffic from people already searching for what you sell. Search, Shopping, Performance Max and YouTube, managed to a target cost per lead.',
      deliverables: ['Search & Shopping', 'Performance Max', 'Conversion tracking', 'Budget & bid management']
    },
    'social': {
      name: 'Social Media Marketing',
      kicker: 'Demand creation',
      icon: ICONS.share,
      url: SITE + '/social-media-marketing/',
      blurb: 'Reach the audience that is not searching yet. Facebook, Instagram, TikTok and LINE campaigns with creative built for the platform, not recycled from print.',
      deliverables: ['Meta & TikTok ads', 'LINE campaigns', 'Premium creative', 'Retargeting audiences']
    },
    'web-dev': {
      name: 'Website Development',
      kicker: 'The asset everything runs on',
      icon: ICONS.monitor,
      url: SITE + '/website/',
      blurb: 'A fast, secure site built to be marketed. Every other channel you invest in performs better once the destination stops leaking visitors.',
      deliverables: ['Design & build', 'Core Web Vitals', 'SEO-ready structure', 'Ongoing maintenance']
    },
    'uxui': {
      name: 'UX/UI Design',
      kicker: 'Experience design',
      icon: ICONS.layout,
      url: SITE + '/website/ux-ui/',
      blurb: 'Journeys designed around how your customers actually behave — clearer navigation, stronger calls to action and fewer reasons to bounce.',
      deliverables: ['UX audit', 'Wireframes & prototypes', 'Design system', 'Mobile-first UI']
    },
    'cro': {
      name: 'Conversion Rate Optimisation',
      kicker: 'More from the same traffic',
      icon: ICONS.trending,
      url: SITE + '/cro/',
      blurb: 'Heat maps, session recordings and structured A/B testing to lift the percentage of visitors who buy or enquire — no extra media spend required.',
      deliverables: ['Heat maps & recordings', 'Funnel analysis', 'A/B testing', 'Landing page rebuilds']
    },
    'content': {
      name: 'Content Marketing',
      kicker: 'Authority at scale',
      icon: ICONS.document,
      url: SITE + '/seo/content-marketing/',
      blurb: 'Content mapped to real search demand and buying stages — the raw material both Google and AI assistants need before they will recommend you.',
      deliverables: ['Topical content plan', 'Expert-led articles', 'Commercial landing pages', 'Content refresh']
    },
    'programmatic': {
      name: 'Programmatic Advertising',
      kicker: 'Scaled reach',
      icon: ICONS.broadcast,
      url: SITE + '/paid-media/programmatic/',
      blurb: 'Audience-first display, video and native buying across premium inventory — the efficient way to add reach once search demand is capped out.',
      deliverables: ['Audience targeting', 'Display & video', 'Remarketing', 'Brand safety controls']
    },
    'reseller': {
      name: 'White Label SEO',
      kicker: 'Delivery partner',
      icon: ICONS.handshake,
      url: SITE + '/seo/seo-reseller/',
      blurb: 'Our senior team delivering under your brand. Fulfil client SEO and AI visibility work without hiring, with reporting you can hand straight over.',
      deliverables: ['White-label delivery', 'Client-ready reporting', 'Scalable capacity', 'Dedicated account lead']
    },
    'outcome': {
      name: 'Outcome Marketing',
      kicker: 'Performance-aligned',
      icon: ICONS.trophy,
      url: SITE + '/outcome-marketing-thailand/',
      blurb: 'Multi-channel programmes structured around commercial outcomes and shared accountability rather than activity reports and vanity metrics.',
      deliverables: ['Outcome-based KPIs', 'Multi-channel strategy', 'Executive reporting', 'Stakeholder alignment']
    },
    'consult': {
      name: 'Free Strategy Consultation',
      kicker: 'Start here',
      icon: ICONS.compass,
      url: SITE + '/contact-us/',
      blurb: 'A no-obligation session with a senior strategist. We audit where you stand today, show you the biggest gaps, and tell you honestly what to fix first.',
      deliverables: ['Visibility snapshot', 'Competitor benchmark', 'Prioritised roadmap', 'Realistic budget guidance']
    }
  };

  /* ── Questions ──────────────────────────────────────────────────────
     `weights` = points added to each service when the option is chosen.
     Negative values actively rule a service out (see e-commerce → local-seo).
     ------------------------------------------------------------------ */
  var QUESTIONS = [
    {
      id: 'profile',
      shortLabel: 'About you',
      title: 'Which best describes your business?',
      subtitle: 'This tells us who we would be working with day to day.',
      options: [
        { id: 'sme',        label: 'Small Business / SME',   desc: 'I own or manage a small business.',
          weights: { 'local-seo': 2, 'google-ads': 2, 'web-dev': 1, 'social': 1, 'seo': 1 } },
        { id: 'inhouse',    label: 'In-House Marketing Team', desc: 'I work for a company and manage marketing internally.',
          weights: { 'consult': 3, 'ai-seo': 2, 'seo': 2, 'google-ads': 1, 'content': 1 } },
        { id: 'enterprise', label: 'Enterprise / Corporate',  desc: 'I work for a large organisation with multiple stakeholders.',
          weights: { 'seo': 2, 'ai-seo': 2, 'content': 2, 'programmatic': 1, 'outcome': 2 } },
        { id: 'agency',     label: 'Agency / Consultant',     desc: 'I provide marketing services to clients.',
          weights: { 'reseller': 5, 'consult': 2, 'ai-seo': 1, 'seo': 1 } }
      ]
    },
    {
      id: 'type',
      shortLabel: 'Business type',
      title: 'What type of business are you?',
      subtitle: 'Different models need very different channel mixes.',
      options: [
        { id: 'local',      label: 'Local Business / SME', desc: 'You serve customers in a specific city or region.',
          noun: 'local business',
          weights: { 'local-seo': 3, 'google-ads': 2, 'social': 1 } },
        { id: 'national',   label: 'National Brand',       desc: 'You sell across Thailand or several markets.',
          noun: 'national brand',
          weights: { 'seo': 3, 'social': 2, 'content': 1, 'programmatic': 1, 'local-seo': -2 } },
        { id: 'ecommerce',  label: 'E-commerce Business',  desc: 'Revenue comes primarily through online sales.',
          noun: 'e-commerce business',
          weights: { 'seo': 3, 'google-ads': 3, 'cro': 5, 'local-seo': -3 } },
        { id: 'enterprise', label: 'Enterprise Company',   desc: 'Large, multi-team, often multi-brand or multi-country.',
          noun: 'enterprise company',
          weights: { 'seo': 2, 'ai-seo': 2, 'content': 2, 'outcome': 1, 'programmatic': 1, 'local-seo': -2 } },
        { id: 'mixed',      label: 'Mixed Business Model', desc: 'A blend of the above — online and offline revenue.',
          noun: 'business with a mixed model',
          weights: { 'seo': 2, 'google-ads': 2, 'social': 1, 'consult': 1 } }
      ]
    },
    {
      id: 'budget',
      shortLabel: 'Budget',
      title: 'What is your monthly SEO, AI Visibility or Marketing budget?',
      subtitle: 'Honest answers get honest recommendations — there is no wrong option.',
      options: [
        { id: 'under50',  label: 'Below THB 50,000/month',       desc: 'Focus everything on one or two channels.',
          weights: { 'local-seo': 2, 'google-ads': 1, 'web-dev': 1, 'social': 1, 'programmatic': -3, 'outcome': -3 } },
        { id: '50to100',  label: 'THB 50,000 – 100,000/month',   desc: 'Enough to run a serious channel properly.',
          weights: { 'seo': 1, 'google-ads': 1, 'local-seo': 1, 'programmatic': -1, 'outcome': -1 } },
        { id: '100to300', label: 'THB 100,001 – 300,000/month',  desc: 'Room for a multi-channel programme.',
          weights: { 'seo': 1, 'ai-seo': 1, 'content': 1, 'programmatic': 1 } },
        { id: 'over300',  label: 'THB 300,001+/month',           desc: 'Full-funnel strategy across search, AI and media.',
          weights: { 'seo': 1, 'ai-seo': 2, 'content': 1, 'programmatic': 2, 'outcome': 2 } },
        { id: 'unsure',   label: "I'm not sure yet",             desc: 'We will help you size it against your goals.',
          weights: { 'consult': 3 } }
      ]
    },
    {
      id: 'challenge',
      shortLabel: 'Challenge',
      title: 'What is your biggest marketing challenge right now?',
      subtitle: 'This is the single biggest factor in what we recommend.',
      /* The challenge is the strongest signal, so its weights are doubled. */
      weightMultiplier: 2,
      options: [
        { id: 'leads',    label: 'I need more leads.',                    desc: 'Enquiries, calls and bookings — not just visitors.',
          phrase: 'you need more leads',
          weights: { 'google-ads': 3, 'cro': 2, 'social': 3 } },
        { id: 'ranking',  label: "My website doesn't rank on Google.",    desc: 'Competitors are above you for the terms that matter.',
          phrase: "your site isn't ranking on Google",
          weights: { 'seo': 4, 'content': 2, 'local-seo': 1, 'ai-seo': 1 } },
        { id: 'ai',       label: "My business isn't visible in AI Search.", desc: 'ChatGPT, Gemini and AI Overviews never mention you.',
          phrase: "you're not showing up in AI search",
          weights: { 'ai-seo': 4, 'content': 2, 'seo': 2 } },
        { id: 'traffic',  label: 'I need more traffic.',                  desc: 'Not enough people are reaching your site at all.',
          phrase: 'you need more traffic',
          weights: { 'seo': 3, 'google-ads': 2, 'social': 1, 'content': 1 } },
        { id: 'website',  label: 'My website needs an upgrade.',          desc: 'It looks dated, loads slowly, or converts badly.',
          phrase: 'your website needs an upgrade',
          weights: { 'web-dev': 5, 'uxui': 4, 'cro': 2 } },
        { id: 'unsure',   label: "I'm not sure where to start.",          desc: 'You know you need help, not which help.',
          phrase: "you're not yet sure where to start",
          weights: { 'consult': 5, 'seo': 1, 'google-ads': 1 } }
      ]
    }
  ];

  /* ── Budget framing shown on the results screen ─────────────────────── */
  var BUDGET_NOTES = {
    'under50':  { tier: 'Focused start', text: 'At this level we would deliberately concentrate on one primary channel rather than spreading thin. Depth beats breadth under THB 50,000.' },
    '50to100':  { tier: 'Growth',        text: 'This is enough to run one channel properly and support it with a second. We would sequence them rather than launch everything at once.' },
    '100to300': { tier: 'Scale',         text: 'This supports a genuine multi-channel programme — organic and paid working together, with content and testing behind both.' },
    'over300':  { tier: 'Enterprise',    text: 'At this level we would build a full-funnel programme with AI visibility, content and media integrated, reported against commercial outcomes.' },
    'unsure':   { tier: 'To be sized',   text: 'We will benchmark what your competitors are realistically spending in your sector and size a budget against your targets — before you commit to anything.' }
  };

  window.MAM_DATA = {
    ICONS: ICONS,
    SERVICES: SERVICES,
    QUESTIONS: QUESTIONS,
    BUDGET_NOTES: BUDGET_NOTES,
    /* Tie-breaker: earlier = preferred when scores are level. */
    PRIORITY: ['consult', 'ai-seo', 'seo', 'local-seo', 'google-ads', 'cro', 'web-dev',
               'uxui', 'content', 'social', 'reseller', 'programmatic', 'outcome'],
    /* Only ever shown as the headline recommendation, never as a support card. */
    PRIMARY_ONLY: ['consult']
  };
})();
