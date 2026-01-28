<?php
/**
 * logs_stream.php
 *
 * Server-Sent Events (SSE) endpoint that streams systemd-journald logs in JSON
 * format via `journalctl -o json`.
 *
 * Features (current behavior):
 * - Sends an initial "status" event on connect.
 * - Optional replay of the last N lines on fresh connect.
 * - Cursor resume via SSE Last-Event-ID (we set `id:` to URL-encoded __CURSOR).
 * - Follow mode with `journalctl -f` and `--after-cursor` to avoid duplicates.
 * - If follow fails (often due to invalid cursor / journal restart), emits a WARN
 *   entry and falls back to replay, then resumes follow.
 * - Clean exit on client disconnect (connection_aborted()).
 * - Heartbeat keepalive comments (~15s) to keep proxies from timing out.
 * - Safe parameterization of unit/comm via env vars with allowlists.
 *
 * Operational requirements:
 * - The PHP process user must have permission to read the journal.
 *   Commonly: add your web user to the `systemd-journal` group, or adjust policy.
 *
 * Notes:
 * - This script intentionally prints JSON payloads as SSE "data:" lines, one JSON
 *   object per SSE event.
 * - All output is flushed promptly to keep the stream real-time.
 */

declare(strict_types=1);

/* -------------------------------------------------------------------------- */
/* SSE headers                                                                 */
/* -------------------------------------------------------------------------- */

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Harmless on Apache; helps if behind nginx.

echo "retry: 10000\n\n";

/* -------------------------------------------------------------------------- */
/* Runtime buffering controls                                                   */
/* -------------------------------------------------------------------------- */

@ini_set('output_buffering', '0');
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');

if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}

while (ob_get_level() > 0) {
    @ob_end_flush();
}
@ob_implicit_flush(true);

/* -------------------------------------------------------------------------- */
/* Long-lived request safety                                                    */
/* -------------------------------------------------------------------------- */

// Avoid PHP execution-time limits killing the SSE stream.
@set_time_limit(0);

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

// Internal toggle for replay support.
$replayEnabled = true;

// How many lines to show on a fresh connect (or when replay cursor is invalid).
$initialBacklog = 200;

/**
 * Allowlists for safety: only these values may be selected via env vars.
 * (Add additional values as needed.)
 *
 * Env vars:
 * - LOGS_UNIT   : systemd unit name (default: wsprrypi.service)
 * - LOGS_COMM   : _COMM value       (default: wsprrypi)
 */
$allowedUnits = [
    'wsprrypi.service',
];

$allowedComms = [
    'wsprrypi',
];

// Defaults.
$defaultUnit = 'wsprrypi.service';
$defaultComm = 'wsprrypi';

// Read env overrides, then allowlist them.
$envUnit = getenv('LOGS_UNIT');
$envComm = getenv('LOGS_COMM');

$unitName = (is_string($envUnit) && in_array($envUnit, $allowedUnits, true))
    ? $envUnit
    : $defaultUnit;

$commName = (is_string($envComm) && in_array($envComm, $allowedComms, true))
    ? $envComm
    : $defaultComm;

// Heartbeat interval (seconds). Keep it <= typical proxy idle timeouts.
$heartbeatIntervalSec = 15;

/* -------------------------------------------------------------------------- */
/* Cursor handling                                                             */
/* -------------------------------------------------------------------------- */

$lastEventIdRaw = $_SERVER['HTTP_LAST_EVENT_ID'] ?? null;
$lastCursor = null;

if (is_string($lastEventIdRaw) && $lastEventIdRaw !== '') {
    $lastCursor = rawurldecode($lastEventIdRaw);
}

/* -------------------------------------------------------------------------- */
/* SSE helpers                                                                  */
/* -------------------------------------------------------------------------- */

function sse_flush(): void
{
    @ob_flush();
    @flush();
}

function client_disconnected(): bool
{
    // connection_aborted() is fast and reliable for SSE.
    return connection_aborted() === 1;
}

/**
 * Heartbeat comment to keep the TCP/proxy connection alive.
 * Comments start with ":" per SSE spec and are ignored by EventSource.
 */
function send_heartbeat(): void
{
    echo ": keepalive\n\n";
    sse_flush();
}

function emit_warn_journal_reloaded(): void
{
    echo "data: " . json_encode([
        'stream'     => 'info',
        'ts_unix_ms' => (int) round(microtime(true) * 1000),
        'line'       => '[WARN ] Journal reloaded.',
        'message'    => '[WARN ] Journal reloaded.',
        'priority'   => '4',
        'note'       => 'Cursor invalid or journal restarted. Replaying recent entries.',
    ]) . "\n\n";
    sse_flush();
}

/**
 * @param array<int, string> $parts
 */
function build_cmd(array $parts): string
{
    return implode(' ', array_map('escapeshellarg', $parts));
}

/**
 * @return array{
 *   ok: bool,
 *   proc: resource|null,
 *   pipes: array<int, resource>|null,
 *   stderr: string,
 *   exitcode: int|null
 * }
 */
function proc_start(string $cmd): array
{
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $pipes = null;
    $proc = proc_open($cmd, $descriptors, $pipes);

    if (!is_resource($proc) || !is_array($pipes)) {
        return ['ok' => false, 'proc' => null, 'pipes' => null,
            'stderr' => 'proc_open failed', 'exitcode' => null];
    }

    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    usleep(200000);
    $status = proc_get_status($proc);

    if (!is_array($status) || empty($status['running'])) {
        $err  = stream_get_contents($pipes[2]);
        $code = isset($status['exitcode']) ? (int) $status['exitcode'] : null;

        foreach ($pipes as $p) {
            if (is_resource($p)) {
                fclose($p);
            }
        }
        proc_close($proc);

        return [
            'ok'       => false,
            'proc'     => null,
            'pipes'    => null,
            'stderr'   => trim((string) $err),
            'exitcode' => $code,
        ];
    }

    return ['ok' => true, 'proc' => $proc, 'pipes' => $pipes, 'stderr' => '', 'exitcode' => null];
}

function proc_stop(?object $unused = null, $proc = null, ?array $pipes = null): void
{
    // Stop journalctl and close pipes.
    if (is_array($pipes)) {
        foreach ($pipes as $p) {
            if (is_resource($p)) {
                fclose($p);
            }
        }
    }

    if (is_resource($proc)) {
        @proc_terminate($proc);
        @proc_close($proc);
    }
}

function send_stderr_line(string $lineTrim): void
{
    echo "data: " . json_encode([
        'stream'     => 'info',
        'ts_unix_ms' => (int) round(microtime(true) * 1000),
        'line'       => 'STDERR: ' . $lineTrim,
        'message'    => 'STDERR: ' . $lineTrim,
        'priority'   => '4',
    ]) . "\n\n";
    sse_flush();
}

function send_nonjson_line(string $lineTrim): void
{
    echo "data: " . json_encode([
        'stream'     => 'info',
        'ts_unix_ms' => (int) round(microtime(true) * 1000),
        'line'       => 'NON-JSON: ' . $lineTrim,
        'message'    => 'NON-JSON: ' . $lineTrim,
        'priority'   => '4',
    ]) . "\n\n";
    sse_flush();
}

/**
 * @param array<string, mixed> $entry
 */
function send_entry(array $entry): ?string
{
    $cursor = $entry['__CURSOR'] ?? null;
    if (is_string($cursor) && $cursor !== '') {
        echo "id: " . rawurlencode($cursor) . "\n";
    }

    $tsMicro = isset($entry['__REALTIME_TIMESTAMP'])
        ? (int) $entry['__REALTIME_TIMESTAMP']
        : (int) round(microtime(true) * 1000000);

    $message = $entry['MESSAGE'] ?? '';

    echo "data: " . json_encode([
        'stream'     => 'info',
        'ts_unix_ms' => (int) round($tsMicro / 1000),
        'line'       => $message,
        'message'    => $message,
        'priority'   => $entry['PRIORITY'] ?? null,
        'pid'        => $entry['_PID'] ?? null,
        'comm'       => $entry['_COMM'] ?? null,
        'unit'       => $entry['_SYSTEMD_UNIT'] ?? null,
        'identifier' => $entry['SYSLOG_IDENTIFIER'] ?? null,
        'cursor'     => $cursor,
    ]) . "\n\n";

    sse_flush();

    return (is_string($cursor) && $cursor !== '') ? $cursor : null;
}

/**
 * Drain a started process. Adds:
 * - Disconnect detection (kills journalctl and exits).
 * - Heartbeats while idle.
 *
 * @param array{proc: resource|null, pipes: array<int, resource>|null} $started
 * @return array{lastCursor: string|null, disconnected: bool}
 */
function drain_process(array $started, bool $followMode, int $heartbeatIntervalSec): array
{
    $proc  = $started['proc'] ?? null;
    $pipes = $started['pipes'] ?? null;

    if (!is_resource($proc) || !is_array($pipes)) {
        return ['lastCursor' => null, 'disconnected' => false];
    }

    $stdoutBuf = '';
    $stderrBuf = '';
    $lastCursorSeen = null;

    $lastHeartbeat = time();

    while (true) {
        if (client_disconnected()) {
            proc_stop(null, $proc, $pipes);
            return ['lastCursor' => $lastCursorSeen, 'disconnected' => true];
        }

        $read = [$pipes[1], $pipes[2]];
        $write = null;
        $except = null;

        $ready = @stream_select($read, $write, $except, 1);
        if ($ready === false) {
            // Still send heartbeats on select errors.
            if ((time() - $lastHeartbeat) >= $heartbeatIntervalSec) {
                send_heartbeat();
                $lastHeartbeat = time();
            }
            continue;
        }

        if ($ready === 0) {
            // Idle: send heartbeat occasionally to keep proxies alive.
            if ((time() - $lastHeartbeat) >= $heartbeatIntervalSec) {
                send_heartbeat();
                $lastHeartbeat = time();
            }

            $status = proc_get_status($proc);
            if (!is_array($status) || empty($status['running'])) {
                break;
            }

            if ($followMode) {
                continue;
            }
        }

        foreach ($read as $r) {
            $chunk = stream_get_contents($r);
            if ($chunk === false || $chunk === '') {
                continue;
            }

            // Any real output implies connection is active; we can reset heartbeat timer.
            $lastHeartbeat = time();

            if ($r === $pipes[2]) {
                $stderrBuf .= $chunk;

                while (($pos = strpos($stderrBuf, "\n")) !== false) {
                    $line = substr($stderrBuf, 0, $pos);
                    $stderrBuf = substr($stderrBuf, $pos + 1);

                    $lineTrim = trim($line);
                    if ($lineTrim !== '') {
                        send_stderr_line($lineTrim);
                    }
                }
            } else {
                $stdoutBuf .= $chunk;

                while (($pos = strpos($stdoutBuf, "\n")) !== false) {
                    $line = substr($stdoutBuf, 0, $pos);
                    $stdoutBuf = substr($stdoutBuf, $pos + 1);

                    $lineTrim = trim($line);
                    if ($lineTrim === '') {
                        continue;
                    }

                    $entry = json_decode($lineTrim, true);
                    if (!is_array($entry)) {
                        send_nonjson_line($lineTrim);
                        continue;
                    }

                    $c = send_entry($entry);
                    if ($c !== null) {
                        $lastCursorSeen = $c;
                    }

                    if (client_disconnected()) {
                        proc_stop(null, $proc, $pipes);
                        return ['lastCursor' => $lastCursorSeen, 'disconnected' => true];
                    }
                }
            }
        }

        $status = proc_get_status($proc);
        if (!is_array($status) || empty($status['running'])) {
            break;
        }
    }

    // Normal exit: close resources.
    proc_stop(null, $proc, $pipes);
    return ['lastCursor' => $lastCursorSeen, 'disconnected' => false];
}

/* -------------------------------------------------------------------------- */
/* Initial stream markers / status                                             */
/* -------------------------------------------------------------------------- */

echo ": stream-open\n\n";
sse_flush();

echo "event: status\n";
echo "data: " . json_encode(['ok' => true, 'note' => 'SSE connected']) . "\n\n";
sse_flush();

/* -------------------------------------------------------------------------- */
/* Phase 1: Replay (optional)                                                  */
/* -------------------------------------------------------------------------- */

$cursorForFollow = null;

if ($replayEnabled && is_string($lastCursor) && $lastCursor !== '') {
    $cursorForFollow = $lastCursor;
} elseif ($replayEnabled) {
    $replayParts = [
        '/usr/bin/journalctl',
        '--no-pager',
        '-o', 'json',
        '-u', $unitName,
        '_COMM=' . $commName,
        '-n', (string) $initialBacklog,
    ];

    $replayCmd = build_cmd($replayParts);

    $replayStarted = proc_start($replayCmd);
    if (!$replayStarted['ok']) {
        http_response_code(500);
        echo "data: " . json_encode([
            'error'    => 'Cannot start journalctl replay',
            'cmd'      => $replayCmd,
            'stderr'   => $replayStarted['stderr'] ?? null,
            'exitcode' => $replayStarted['exitcode'] ?? null,
        ]) . "\n\n";
        sse_flush();
        exit;
    }

    $replayResult = drain_process($replayStarted, false, $heartbeatIntervalSec);

    if (!empty($replayResult['disconnected'])) {
        // Client left; exit cleanly.
        exit;
    }

    $cursorForFollow = $replayResult['lastCursor'] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Phase 2: Follow (always)                                                    */
/* -------------------------------------------------------------------------- */

while (true) {
    if (client_disconnected()) {
        exit;
    }

    $followParts = [
        '/usr/bin/journalctl',
        '--no-pager',
        '-o', 'json',
        '-f',
        '-u', $unitName,
        '_COMM=' . $commName,
    ];

    if (is_string($cursorForFollow) && $cursorForFollow !== '') {
        array_splice($followParts, 2, 0, ['--after-cursor', $cursorForFollow]);
    }

    $followCmd = build_cmd($followParts);

    // Optional debug event with the effective command (kept).
    echo "event: debug\n";
    echo "data: " . json_encode(['note' => 'journalctl follow starting', 'cmd' => $followCmd]) . "\n\n";
    sse_flush();

    $followStarted = proc_start($followCmd);
    if (!$followStarted['ok']) {
        if (is_string($cursorForFollow) && $cursorForFollow !== '') {
            emit_warn_journal_reloaded();
            $cursorForFollow = null;

            if ($replayEnabled) {
                $replayParts = [
                    '/usr/bin/journalctl',
                    '--no-pager',
                    '-o', 'json',
                    '-u', $unitName,
                    '_COMM=' . $commName,
                    '-n', (string) $initialBacklog,
                ];
                $replayCmd = build_cmd($replayParts);

                $replayStarted = proc_start($replayCmd);
                if ($replayStarted['ok']) {
                    $replayResult = drain_process($replayStarted, false, $heartbeatIntervalSec);

                    if (!empty($replayResult['disconnected'])) {
                        exit;
                    }

                    $cursorForFollow = $replayResult['lastCursor'] ?? null;
                    continue;
                }
            }
        }

        http_response_code(500);
        echo "data: " . json_encode([
            'error'    => 'Cannot start journalctl follow',
            'cmd'      => $followCmd,
            'stderr'   => $followStarted['stderr'] ?? null,
            'exitcode' => $followStarted['exitcode'] ?? null,
        ]) . "\n\n";
        sse_flush();
        exit;
    }

    $followResult = drain_process($followStarted, true, $heartbeatIntervalSec);

    if (!empty($followResult['disconnected'])) {
        exit;
    }

    $cursorForFollow = $followResult['lastCursor'] ?? $cursorForFollow;

    // Follow exited unexpectedly. Treat as reload and restart.
    emit_warn_journal_reloaded();

    if ($replayEnabled) {
        $replayParts = [
            '/usr/bin/journalctl',
            '--no-pager',
            '-o', 'json',
            '-u', $unitName,
            '_COMM=' . $commName,
            '-n', (string) $initialBacklog,
        ];
        $replayCmd = build_cmd($replayParts);

        $replayStarted = proc_start($replayCmd);
        if ($replayStarted['ok']) {
            $replayResult = drain_process($replayStarted, false, $heartbeatIntervalSec);

            if (!empty($replayResult['disconnected'])) {
                exit;
            }

            $cursorForFollow = $replayResult['lastCursor'] ?? null;
        }
    }
}