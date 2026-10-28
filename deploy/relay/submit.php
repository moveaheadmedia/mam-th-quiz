<?php
/**
 * MAM service quiz — lead relay, served at /quiz/submit.php on the website.
 *
 * The quiz page posts its lead here (same site, JSON: {fields, lang, hp}).
 * This file passes it on to n8n "MAM Forms => PIPEDRIVE" the way WordPress
 * passes on a Quform enquiry: a form-encoded POST from this server, every
 * field sent with and without a leading "_", plus the form name, the
 * visitor's IP and the site-local date. A quiz lead therefore reaches
 * Pipedrive like any website enquiry, and the n8n webhook address stays on
 * the server instead of in the page's JavaScript.
 *
 * Settings live in mam-quiz-relay.config.php, in the website's folder one
 * level above public_html (not web-served and not in git). deploy/build.mjs
 * writes it from deploy/sites.mjs; see deploy/README.md.
 *
 * Replies: 200 {"ok":true} once n8n has accepted the lead; otherwise
 * {"ok":false,"error":…} with 400/403/405/413/422/429/500/502.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function mam_quiz_reply($status, $body)
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

/* Text for a form field: one line, no control characters or angle brackets
   (the Pipedrive note is HTML), at most $max characters. */
function mam_quiz_clean($value, $max)
{
    $value = (string) $value;
    $clean = preg_replace('/[\x00-\x1F\x7F<>]+/u', ' ', $value);
    if ($clean === null) {
        $clean = preg_replace('/[\x00-\x1F\x7F<>]+/', ' ', $value);
    }
    $clean = trim($clean);
    return function_exists('mb_substr') ? mb_substr($clean, 0, $max, 'UTF-8') : substr($clean, 0, $max);
}

/* The visitor's address, through the Hostinger CDN if it is in front. */
function mam_quiz_client_ip()
{
    $keys = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
    foreach ($keys as $key) {
        if (empty($_SERVER[$key])) {
            continue;
        }
        foreach (explode(',', $_SERVER[$key]) as $candidate) {
            $candidate = trim($candidate);
            if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $candidate;
            }
        }
    }
    return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
}

/* ── Settings ─────────────────────────────────────────────────────────── */

$config = null;
foreach (array(dirname(__DIR__, 2) . '/mam-quiz-relay.config.php', __DIR__ . '/relay-config.php') as $file) {
    if (is_readable($file)) {
        $config = include $file;
        break;
    }
}
if (!is_array($config) || empty($config['webhook']) || empty($config['origin'])) {
    mam_quiz_reply(500, array('ok' => false, 'error' => 'not-configured'));
}

/* ── The request ──────────────────────────────────────────────────────── */

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    mam_quiz_reply(405, array('ok' => false, 'error' => 'post-only'));
}

/* Only this website's own pages post here (a browser always says where from). */
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin !== '' && $origin !== $config['origin']) {
    mam_quiz_reply(403, array('ok' => false, 'error' => 'origin'));
}

$raw = file_get_contents('php://input', false, null, 0, 65537);
if ($raw === false || strlen($raw) > 65536) {
    mam_quiz_reply(413, array('ok' => false, 'error' => 'too-large'));
}
$in = json_decode($raw, true);
if (!is_array($in) || !isset($in['fields']) || !is_array($in['fields'])) {
    mam_quiz_reply(400, array('ok' => false, 'error' => 'bad-request'));
}

/* A filled-in honeypot is a bot: say thanks and send nothing on. */
if (!empty($in['hp'])) {
    mam_quiz_reply(200, array('ok' => true));
}

/* Only the fields the quiz sends; anything else is dropped. */
$allowed = array(
    '_Name', '_Email address', '_Country Code', '_Phone Number', '_Website',
    '_Monthly Project Budget (THB)', '_Service of interest',
    '_utm_source', '_utm_medium', '_utm_campaign', '_formURL',
);
$fields = array();
foreach ($in['fields'] as $key => $value) {
    if (!is_string($key) || strlen($key) > 60 || !(is_string($value) || is_int($value) || is_float($value))) {
        continue;
    }
    if (in_array($key, $allowed, true) || strpos($key, '_Quiz: ') === 0) {
        $fields[$key] = mam_quiz_clean($value, $key === '_formURL' ? 2000 : 500);
    }
}

$email = isset($fields['_Email address']) ? $fields['_Email address'] : '';
if (empty($fields['_Name']) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    mam_quiz_reply(422, array('ok' => false, 'error' => 'name-and-email-required'));
}

/* The page address picks the Pipedrive label and owner, so it must be one of
   this website's pages. */
$url = isset($fields['_formURL']) ? $fields['_formURL'] : '';
if (strpos($url, $config['origin'] . '/') !== 0) {
    $fields['_formURL'] = $config['origin'] . (isset($config['path']) ? $config['path'] : '/quiz/');
}

/* At most a handful of leads per visitor address per hour. */
$ip = mam_quiz_client_ip();
$limit = isset($config['rateLimit']) ? $config['rateLimit'] : array('max' => 5, 'seconds' => 3600);
$bucket = rtrim(sys_get_temp_dir(), '/') . '/mam-quiz-' . md5($config['origin'] . '|' . $ip);
$now = time();
$hits = array();
if (is_readable($bucket)) {
    foreach (explode(',', (string) @file_get_contents($bucket)) as $hit) {
        if ((int) $hit > $now - $limit['seconds']) {
            $hits[] = (int) $hit;
        }
    }
}
if (count($hits) >= $limit['max']) {
    mam_quiz_reply(429, array('ok' => false, 'error' => 'too-many'));
}
$hits[] = $now;
@file_put_contents($bucket, implode(',', $hits), LOCK_EX);

/* What Quform adds itself. */
$lang = (isset($in['lang']) && $in['lang'] === 'th') ? 'th' : 'en';
$fields['_Form Name'] = isset($config['formNames'][$lang]) ? $config['formNames'][$lang] : 'Service Quiz';
$fields['_ip'] = $ip;
try {
    $date = new DateTime('now', new DateTimeZone(isset($config['timezone']) ? $config['timezone'] : 'UTC'));
    $fields['_date'] = $date->format(isset($config['dateFormat']) ? $config['dateFormat'] : 'd/m/Y G:i');
} catch (Exception $e) {
    $fields['_date'] = gmdate('d/m/Y G:i');
}

/* Like Quform: each field by its plain name, then with "_". "MAM Forms =>
   PIPEDRIVE" reads the "_" copies. */
$body = array();
foreach ($fields as $key => $value) {
    $body[substr($key, 1)] = $value;
}
foreach ($fields as $key => $value) {
    $body[$key] = $value;
}

/* ── On to n8n ────────────────────────────────────────────────────────── */

ignore_user_abort(true);
$ch = curl_init($config['webhook']);
curl_setopt_array($ch, array(
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($body),
    CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded'),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_TIMEOUT => 6,
    CURLOPT_USERAGENT => 'MAM-Quiz-Relay/1.0; ' . $config['origin'],
));
curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($status >= 200 && $status < 300) {
    mam_quiz_reply(200, array('ok' => true));
}
error_log('[mam-quiz-relay] n8n did not accept a lead: HTTP ' . $status . ($error !== '' ? ' (' . $error . ')' : ''));
mam_quiz_reply(502, array('ok' => false, 'error' => 'upstream'));
