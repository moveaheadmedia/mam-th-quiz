/**
 * MAM UTM To Forms — attribution classification reference
 * ---------------------------------------------------------------------------
 * EXPLICIT UTM PARAMS (from URL) — normalised in this order, then stored:
 *   utm_source/medium contains 'clutch.co'                              => Source: Referral | Medium: Third-party Sites | Campaign: clutch.co
 *   utm_source contains 'chatgpt' AND utm_medium = 'cpc'                => Source: ChatGPT  | Medium: CPC              | Campaign: as-is
 *   utm_source contains chatgpt/openai/claude/gemini/perplexity/copilot => Source: Referral | Medium: LLM              | Campaign: <source>
 *   utm_source = 'mamgbp'                                               => Source: Google   | Medium: Organic           | Campaign: GBP
 *   utm_source contains 'facebook'                                     => Source: Meta     | Medium: (if 'social' => Organic_FB, else as-is) | Campaign: as-is
 *   utm_source contains 'instagram'                                    => Source: Meta     | Medium: (if 'social' => Organic_IG, else as-is) | Campaign: as-is
 *   any other utm_source present                                      => stored as-is (medium/campaign default to '-' if missing)
 *
 * AUTO-CLASSIFY (no utm_source param; based on document.referrer):
 *   Referrer                       | Source   | Medium             | Campaign
 *   ------------------------------ | -------- | ------------------ | -----------------
 *   none / internal                | Direct   | Contact Form       | direct_contact_form
 *   chatgpt.com / chat.openai.com  | Referral | LLM                | <referrer>
 *   gemini.google.com              | Referral | LLM                | <referrer>
 *   claude.ai                      | Referral | LLM                | <referrer>
 *   perplexity.ai                  | Referral | LLM                | <referrer>
 *   copilot.microsoft.com          | Referral | LLM                | <referrer>
 *   *.google.*                     | Google   | Organic            | google_organic
 *   *.facebook.* / fb.com          | Meta     | Organic_FB         | <referrer>
 *   *.instagram.*                  | Meta     | Organic_IG         | <referrer>
 *   clutch.co                      | Referral | Third-party Sites  | clutch.co
 *   any other site                 | Referral | Third-party Sites  | <referrer>
 *
 * FIRST-TOUCH RULE: once a non-Direct source is stored, a later run with no
 * referrer (internal navigation / script re-fire) will NOT overwrite it with
 * Direct. Explicit UTM params and manually-set sources always still win.
 * ---------------------------------------------------------------------------
 */
jQuery(document).ready(function () {
    mam_utm_save_cookies();
    function mam_utm_save_cookies() {
        const mam_utm_referral = mamGetReferral(); // full referrer URL, '' if internal/none
        // ---- explicit UTM params from the URL always win ----
        let p_source   = mamGetParameterByName('utm_source');
        let p_medium   = mamGetParameterByName('utm_medium');
        let p_campaign = mamGetParameterByName('utm_campaign');
        // ---- normalise Clutch => Referral / Third-party Sites / clutch.co ----
        const clutch = mamNormalizeClutch(p_source, p_medium, p_campaign);
        p_source   = clutch.source;
        p_medium   = clutch.medium;
        p_campaign = clutch.campaign;
        // ---- normalise explicit LLM source => Referral / LLM / <source> (paid chatgpt + cpc => ChatGPT / CPC) ----
        const llm = mamNormalizeLLM(p_source, p_medium, p_campaign);
        p_source   = llm.source;
        p_medium   = llm.medium;
        p_campaign = llm.campaign;
        // ---- normalise Google Business Profile => Google / Organic / GBP ----
        const gbp = mamNormalizeGBP(p_source, p_medium, p_campaign);
        p_source   = gbp.source;
        p_medium   = gbp.medium;
        p_campaign = gbp.campaign;
        // ---- normalise Facebook/Instagram => Meta ----
        const norm = mamNormalizeMeta(p_source, p_medium);
        p_source = norm.source;
        p_medium = norm.medium;
        if (p_source)   { Cookies.set('user_utm_source', p_source); }
        if (p_medium)   { Cookies.set('user_utm_medium', p_medium); }
        if (p_campaign) { Cookies.set('user_utm_campaign', p_campaign); }
        // If a real UTM source param was present, don't auto-classify over it.
        if (p_source) {
            if (!Cookies.get('user_utm_medium'))   { Cookies.set('user_utm_medium', '-'); }
            if (!Cookies.get('user_utm_campaign')) { Cookies.set('user_utm_campaign', '-'); }
            return;
        }
        // ---- auto-classify based on referrer ----
        // Only (re)classify when no manual source is set, or it's a previous auto value.
        const existing = Cookies.get('user_utm_source');
        const autoValues = ['Direct', 'Referral', 'Google', 'Bing', 'Yahoo', 'DuckDuckGo', 'Meta'];
        if (existing && autoValues.indexOf(existing) === -1) {
            // some manually-set source already stored — leave it alone
            return;
        }
        // No referrer on this run (internal navigation / script re-fire):
        // don't clobber an existing non-Direct attribution with Direct (first-touch wins).
        if (mam_utm_referral === '' && existing && existing !== 'Direct') {
            return;
        }
        const c = mamClassify(mam_utm_referral);
        Cookies.set('user_utm_source', c.source);
        Cookies.set('user_utm_medium', c.medium);
        Cookies.set('user_utm_campaign', c.campaign);
    }
    function mamNormalizeClutch(source, medium, campaign) {
        // Clutch (any param containing clutch.co) => Referral / Third-party Sites / clutch.co
        const s = (source || '').toLowerCase();
        const m = (medium || '').toLowerCase();
        if (s.indexOf('clutch.co') !== -1 || m.indexOf('clutch.co') !== -1) {
            return { source: 'Referral', medium: 'Third-party Sites', campaign: 'clutch.co' };
        }
        return { source: source, medium: medium, campaign: campaign };
    }
    function mamNormalizeLLM(source, medium, campaign) {
        // Explicit LLM utm_source => Referral / LLM / <source>
        if (!source) {
            return { source: source, medium: medium, campaign: campaign };
        }
        const s = source.toLowerCase();
        const m = (medium || '').toLowerCase();
        // Paid ChatGPT ads (utm_source=chatgpt&utm_medium=cpc) => ChatGPT / CPC / <campaign as-is>
        // Must run before the generic LLM check below, which would otherwise turn it into Referral / LLM.
        if (s.indexOf('chatgpt') !== -1 && m === 'cpc') {
            return { source: 'ChatGPT', medium: 'CPC', campaign: campaign };
        }
        const llmNeedles = ['chatgpt', 'openai', 'claude', 'gemini', 'perplexity', 'copilot'];
        for (let i = 0; i < llmNeedles.length; i++) {
            if (s.indexOf(llmNeedles[i]) !== -1) {
                return { source: 'Referral', medium: 'LLM', campaign: source };
            }
        }
        return { source: source, medium: medium, campaign: campaign };
    }
    function mamNormalizeGBP(source, medium, campaign) {
        // Google Business Profile => Google / Organic / GBP
        if (source && source.toLowerCase() === 'mamgbp') {
            return { source: 'Google', medium: 'Organic', campaign: 'GBP' };
        }
        return { source: source, medium: medium, campaign: campaign };
    }
    function mamNormalizeMeta(source, medium) {
        if (!source) {
            return { source: source, medium: medium };
        }
        const s = source.toLowerCase();
        const isFB = s.indexOf('facebook') !== -1;
        const isIG = s.indexOf('instagram') !== -1;
        if (!isFB && !isIG) {
            return { source: source, medium: medium };
        }
        // source contains facebook or instagram => Meta
        let newMedium = medium;
        if (medium && medium.toLowerCase() === 'social') {
            newMedium = isIG ? 'Organic_IG' : 'Organic_FB';
        }
        return { source: 'Meta', medium: newMedium };
    }
    function mamClassify(referrer) {
        // No referrer (or internal) => Direct
        if (referrer === '') {
            return { source: 'Direct', medium: 'Contact Form', campaign: 'direct_contact_form' };
        }
        let host = '';
        try {
            host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
        } catch (e) {
            host = '';
        }
        // --- AI assistants / LLMs (check before Google, since Gemini is on google.com) ---
        const llmHosts = [
            'chatgpt.com',
            'chat.openai.com',
            'gemini.google.com',
            'claude.ai',
            'perplexity.ai',
            'copilot.microsoft.com'
        ];
        if (llmHosts.indexOf(host) !== -1) {
            return { source: 'Referral', medium: 'LLM', campaign: referrer };
        }
        // --- Search engines (organic) ---
        if (/(^|\.)google\./.test(host)) {
            return { source: 'Google', medium: 'Organic', campaign: 'google_organic' };
        }
        // --- Meta (organic social) ---
        if (/(^|\.)facebook\./.test(host) || /(^|\.)fb\.com$/.test(host) || host.indexOf('facebook.') === 0) {
            return { source: 'Meta', medium: 'Organic_FB', campaign: referrer };
        }
        if (/(^|\.)instagram\./.test(host)) {
            return { source: 'Meta', medium: 'Organic_IG', campaign: referrer };
        }
        // --- Clutch ---
        if (/(^|\.)clutch\.co$/.test(host)) {
            return { source: 'Referral', medium: 'Third-party Sites', campaign: 'clutch.co' };
        }
        // --- Everything else => generic third-party referral ---
        return { source: 'Referral', medium: 'Third-party Sites', campaign: referrer };
    }
    function mamGetReferral() {
        if (!document.referrer) {
            return '';
        }
        // mam_utm.site_url is coming from wp_localize_script
        if (document.referrer.includes(mam_utm.site_url)) {
            return '';
        }
        return document.referrer;
    }
    function mamGetParameterByName(name) {
        const url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
});