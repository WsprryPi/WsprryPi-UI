<?php

declare(strict_types=1);

@ini_set('display_errors', '0');
@ini_set('log_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $statusCode, array $payload): never
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeEnvelope(mixed $decoded): array
{
    if (is_array($decoded) && array_is_list($decoded)) {
        return ['data' => $decoded];
    }

    if (!is_array($decoded)) {
        return ['data' => []];
    }

    if (!isset($decoded['data']) || !is_array($decoded['data'])) {
        $decoded['data'] = [];
    }

    return $decoded;
}

$txSign = strtoupper(trim((string)($_GET['tx_sign'] ?? '')));
$start = trim((string)($_GET['start'] ?? ''));
$end = trim((string)($_GET['end'] ?? ''));

if ($txSign === '' || $start === '' || $end === '') {
    respond(400, ['error' => 'Missing required query parameters.']);
}

$txSign = preg_replace('/[^A-Z0-9*%]/', '', $txSign) ?? '';
if ($txSign === '') {
    respond(400, ['error' => 'A valid transmitter callsign is required.']);
}

$tsRegex = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/';
if (!preg_match($tsRegex, $start) || !preg_match($tsRegex, $end)) {
    respond(400, ['error' => 'Invalid timestamp format. Use YYYY-MM-DD HH:MM:SS.']);
}

$ttl = isset($_GET['ttl']) ? max(30, min(900, (int)$_GET['ttl'])) : 120;
$rxSign = strtoupper(trim((string)($_GET['rx_sign'] ?? '%')));
$rxSign = preg_replace('/[^A-Z0-9*%]/', '', $rxSign) ?? '%';
$format = strtoupper(trim((string)($_GET['format'] ?? 'JSON')));
if ($format !== 'JSON') {
    $format = 'JSON';
}

$cacheDir = __DIR__ . '/cache';
$cacheFile = sprintf(
    '%s/wspr_spots_%s_%s.json',
    $cacheDir,
    $txSign,
    md5($start . '|' . $end . '|' . $rxSign)
);
$now = time();

if (!is_dir($cacheDir) && !mkdir($cacheDir, 0755, true)) {
    respond(500, ['error' => 'Cannot create cache directory.']);
}

if (is_file($cacheFile) && ($now - filemtime($cacheFile) < $ttl)) {
    $cached = @file_get_contents($cacheFile);
    if ($cached !== false) {
        $decoded = json_decode($cached, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo json_encode(normalizeEnvelope($decoded), JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
}

$query = http_build_query([
    'start' => $start,
    'end' => $end,
    'tx_sign' => $txSign,
    'rx_sign' => $rxSign,
    'format' => $format,
]);
$url = 'https://wspr.live/wspr_downloader.php?' . $query;

$ctx = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 20,
        'ignore_errors' => true,
    ],
]);

$response = @file_get_contents($url, false, $ctx);
if ($response === false) {
    respond(502, ['error' => 'Unable to reach the upstream WSPR spot service.']);
}

$status = 0;
if (
    isset($http_response_header[0]) &&
    preg_match('#HTTP/\S+\s+(\d+)#', $http_response_header[0], $m)
) {
    $status = (int)$m[1];
}

if ($status !== 200) {
    respond(502, ['error' => sprintf('Upstream WSPR spot service returned HTTP %d.', $status)]);
}

$decoded = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    respond(502, ['error' => 'Upstream WSPR spot service returned invalid JSON.']);
}

$normalized = normalizeEnvelope($decoded);
$encoded = json_encode($normalized, JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    respond(500, ['error' => 'Unable to encode spot response.']);
}

@file_put_contents($cacheFile, $encoded);
echo $encoded;
