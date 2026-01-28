'use strict';

/*
 * Log view behavior.
 *
 * These three toggles are intentionally global so other scripts and the UI can
 * modify behavior at runtime.
 */
let hideDebugLogs = false;
let followTail = true;
let programmaticScroll = false;

/*
 * Internal shared state.
 *
 * site.js and view_logs.js may both call initLogStream() on DOM ready. Using a
 * single shared object on window ensures idempotency across files.
 */
window.__wsprrypi_logs = window.__wsprrypi_logs || {};
window.__wsprrypi_logs.streamStarted = window.__wsprrypi_logs.streamStarted || false;
window.__wsprrypi_logs.eventSource = window.__wsprrypi_logs.eventSource || null;
window.__wsprrypi_logs.initialized = window.__wsprrypi_logs.initialized || false;

/*
 * Scroll behavior:
 * - On page load, scroll to the bottom once.
 * - While streaming, auto-scroll only if already at the bottom.
 * - If the user scrolls up, show a "Jump to bottom" button.
 */

function setHideDebugLogs(value) {
    hideDebugLogs = Boolean(value);
}

function getJumpButton() {
    return document.getElementById('jumpToBottomBtn');
}

function getLogScrollContainer() {
    // The scrollable element for logs is the inner pane.
    // The card should remain stationary while the pane scrolls.
    const activePane = document.querySelector('.logs-card .tab-pane.active .pane');
    if (activePane) {
        return activePane;
    }

    return document.querySelector('.logs-card .pane');
}

function scrollLogsToBottom(behavior = 'auto') {
    const el = getLogScrollContainer();
    if (!el) {
        return;
    }

    // Mark programmatic scroll so the scroll listener does not interpret it as
    // the user moving away from the bottom.
    programmaticScroll = true;

    const target = el.scrollHeight;

    try {
        if (typeof el.scrollTo === 'function') {
            el.scrollTo({ top: target, behavior });
        } else {
            el.scrollTop = target;
        }
    } catch (err) {
        // Fall back to scrollTop.
        el.scrollTop = target;
    }

    // Ensure we end exactly at the bottom after smooth scrolling finishes.
    // This prevents the jump button from appearing due to fractional positions.
    window.setTimeout(() => {
        try {
            el.scrollTop = el.scrollHeight;
        } catch (err) {
            // Ignore.
        }
        programmaticScroll = false;
        updateJumpButtonVisibility();
    }, 220);
}

function scrollLogsToBottomSoft() {
    scrollLogsToBottom('smooth');
}

function isScrolledToBottom(pxTolerance = 32) {
    const el = getLogScrollContainer();
    if (!el) {
        return true;
    }

    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return distanceFromBottom <= pxTolerance;
}

function setJumpButtonVisible(visible) {
    const btn = getJumpButton();
    if (!btn) {
        return;
    }

    btn.style.display = visible ? 'block' : 'none';
}

function updateJumpButtonVisibility() {
    // If the user has scrolled up, stop following the tail.
    // While programmatic smooth scrolling is active, ignore scroll events so we
    // do not disable followTail mid-animation.
    const atBottom = isScrolledToBottom();
    if (!programmaticScroll) {
        followTail = atBottom;
    }
    setJumpButtonVisible(!atBottom);
}

let scrollListenerEl = null;

function attachScrollListener() {
    const el = getLogScrollContainer();
    if (!el) {
        return;
    }

    if (scrollListenerEl === el) {
        return;
    }

    if (scrollListenerEl) {
        scrollListenerEl.removeEventListener('scroll', updateJumpButtonVisibility);
    }

    scrollListenerEl = el;
    el.addEventListener('scroll', updateJumpButtonVisibility, { passive: true });
}

function bindLogViewActions() {
    // Scroll to bottom when the Logs tab becomes visible.
    $(document).on('shown.bs.tab', 'button[data-bs-toggle="tab"]', () => {
        attachScrollListener();
        followTail = true;
        scrollLogsToBottom('smooth');
        updateJumpButtonVisibility();
    });

    // Click handler for the jump button.
    const btn = getJumpButton();
    if (btn) {
        btn.addEventListener('click', () => {
            followTail = true;
            scrollLogsToBottom('smooth');
            updateJumpButtonVisibility();
        });
    }

    // Scroll to bottom on initial page load.
    $(window).on('load', () => {
        window.setTimeout(() => {
            attachScrollListener();
            followTail = true;
            scrollLogsToBottom('smooth');
            updateJumpButtonVisibility();
        }, 0);
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatUtcTimestamp(ms) {
    const d = new Date(ms);
    const pad = (n, w = 2) => String(n).padStart(w, '0');

    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hour = pad(d.getUTCHours());
    const min = pad(d.getUTCMinutes());
    const sec = pad(d.getUTCSeconds());
    const ms3 = pad(d.getUTCMilliseconds(), 3);

    return `${year}-${month}-${day} ${hour}:${min}:${sec}.${ms3} UTC`;
}

function priorityToLevel(priority) {
    const p = Number(priority);
    if (!Number.isFinite(p)) {
        return null;
    }

    if (p <= 2) {
        return 'FATAL';
    }
    if (p === 3) {
        return 'ERROR';
    }
    if (p === 4) {
        return 'WARN';
    }
    if (p <= 6) {
        return 'INFO';
    }
    return 'DEBUG';
}

function levelToClass(level) {
    return {
        DEBUG: 'log-debug',
        INFO: 'log-info',
        WARN: 'log-warn',
        ERROR: 'log-error',
        FATAL: 'log-fatal',
    }[level] || '';
}

function extractTaggedLevel(text) {
    const m = text.match(/^\[(DEBUG|INFO|WARN|ERROR|FATAL)\s*\]\s*/);
    if (!m) {
        return null;
    }

    return {
        level: m[1],
        tag: text.slice(0, m[0].length).trimEnd(),
        rest: text.slice(m[0].length),
    };
}

function makePaddedTag(level) {
    const padded = String(level || 'INFO').padEnd(5, ' ').slice(0, 5);
    return `[${padded}]`;
}

function formatLogParts(payload) {
    const text = String(payload.message ?? payload.line ?? '');

    const tagged = extractTaggedLevel(text);
    if (tagged) {
        return {
            level: tagged.level,
            tag: tagged.tag,
            message: tagged.rest,
        };
    }

    const level = priorityToLevel(payload.priority) || 'INFO';
    return {
        level,
        tag: makePaddedTag(level),
        message: text,
    };
}

/*
 * Log stream initialization.
 *
 * This function is intentionally idempotent across files.
 */
function initLogStream() {
    const state = window.__wsprrypi_logs;

    if (state.streamStarted) {
        return;
    }
    state.streamStarted = true;

    // Close any prior EventSource (defensive).
    if (state.eventSource && typeof state.eventSource.close === 'function') {
        try {
            state.eventSource.close();
        } catch (err) {
            // Ignore.
        }
        state.eventSource = null;
    }

    const url = `${PROTO}//${HOSTNAME}${CURRENT_PATH}/logs_stream.php`;
    const evt = new EventSource(url);
    state.eventSource = evt;

    let isReloading = false;

    // Deduplication guard:
    // SSE reconnects can cause the same journal entry to be delivered again. We
    // keep a small LRU cache of recently seen ids and ignore repeats.
    const seenEventIds = new Map();
    const maxSeenEventIds = 3000;

    function markSeenEventId(id) {
        if (!id) {
            return false;
        }

        if (seenEventIds.has(id)) {
            return true;
        }

        seenEventIds.set(id, Date.now());

        while (seenEventIds.size > maxSeenEventIds) {
            const oldestKey = seenEventIds.keys().next().value;
            seenEventIds.delete(oldestKey);
        }

        return false;
    }

    window.addEventListener('beforeunload', () => {
        isReloading = true;

        try {
            evt.close();
        } catch (err) {
            // Ignore.
        }

        state.streamStarted = false;
        state.eventSource = null;
    });

    evt.onopen = () => {
        debugConsole('debug', 'Connected to log stream.');
    };

    evt.onmessage = (e) => {
        const shouldStickToBottom = followTail || isScrolledToBottom();

        try {
            const payload = JSON.parse(e.data);

            const eventId = payload.cursor || e.lastEventId || null;
            if (markSeenEventId(eventId)) {
                return;
            }

            const stream = payload.stream || 'info';
            let $pane = $('#' + stream);
            if ($pane.length === 0) {
                $pane = $('#info');
            }

            const ts = payload.ts_unix_ms ? formatUtcTimestamp(payload.ts_unix_ms) : '';
            const parts = formatLogParts(payload);

            if (hideDebugLogs && parts.level === 'DEBUG') {
                return;
            }

            const levelClass = levelToClass(parts.level);
            const tsHtml = ts ? `<span class="log-ts">${escapeHtml(ts)}</span> ` : '';

            $pane.append(
                `<div class="log-row">` +
                    `${tsHtml}` +
                    `<span class="log-level ${levelClass}">${escapeHtml(parts.tag)}</span> ` +
                    `<span class="log-msg">${escapeHtml(parts.message)}</span>` +
                `</div>`
            );

            attachScrollListener();

            if (shouldStickToBottom) {
                scrollLogsToBottomSoft();
            }

            updateJumpButtonVisibility();
        } catch (err) {
            debugConsole('error', 'Parse error.', err);

            attachScrollListener();

            if (shouldStickToBottom) {
                scrollLogsToBottomSoft();
            }

            updateJumpButtonVisibility();
        }
    };

    evt.onerror = () => {
        if (evt.readyState === EventSource.CLOSED && !isReloading) {
            debugConsole('warn', 'SSE connection closed unexpectedly.');
        }
    };
}

(function bootstrap() {
    const state = window.__wsprrypi_logs;

    if (state.initialized) {
        return;
    }
    state.initialized = true;

    $(function () {
        bindLogViewActions();
        initLogStream();
    });
})();
