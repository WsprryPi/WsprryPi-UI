<!-- omit in toc -->
# Journald SSE Streaming API

- [Endpoint](#endpoint)
- [Unified Event Schema](#unified-event-schema)
  - [Field meanings](#field-meanings)
- [Cursor \& Resume Behavior](#cursor--resume-behavior)
  - [Consumer rule (important)](#consumer-rule-important)
- [Query Parameters](#query-parameters)
  - [Playback \& Replay](#playback--replay)
  - [Filtering](#filtering)
    - [Priority filtering](#priority-filtering)
    - [Systemd unit filtering](#systemd-unit-filtering)
  - [SYSLOG\_IDENTIFIER](#syslog_identifier)
- [Heartbeats](#heartbeats)
- [Internal Events](#internal-events)
- [Typical Consumer Flow](#typical-consumer-flow)
- [Notes \& Limitations](#notes--limitations)
- [License / Usage](#license--usage)
- [JavaScript Consumer Example](#javascript-consumer-example)
- [OpenAPI-Style Summary (Informational)](#openapi-style-summary-informational)
- [Consumer JavaScript Example (EventSource)](#consumer-javascript-example-eventsource)
- [Permissions \& Access to systemd-journald](#permissions--access-to-systemd-journald)
  - [Typical setup](#typical-setup)
  - [Notes](#notes)

This endpoint exposes **systemd-journald** logs over **Server‑Sent Events (SSE)**.
It is designed as a **data‑only transport layer**: the PHP service emits normalized
JSON events, and the consumer application is responsible for rendering,
persistence, and UX decisions.

The API supports:

- Live follow (`journalctl -f`)
- Replay / backlog (`journalctl -n`)
- Resume without duplicates using journald cursors
- Server‑side filtering (priority, systemd unit)
- Consumer‑controlled playback
- Heartbeats during idle periods
- A single, unified JSON schema for *all* events

---

## Endpoint

```JS
GET /log_stream.php
```

Response is an **SSE stream** (`text/event-stream`).

---

## Unified Event Schema

Every SSE `data:` message contains exactly one JSON object with the following
fields. **All events — journal entries, internal messages, and heartbeats —
use the same schema.**

```json
{
  "type": "journal" | "internal",
  "playback": true | false,
  "__CURSOR": "s=...;i=...;b=...;m=...;t=...;x=..." | null,
  "__REALTIME_TIMESTAMP": 1738198123456789,
  "PRIORITY": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7",
  "SYSLOG_IDENTIFIER": "wsprrypi",
  "MESSAGE": "Started WsprryPi.",
  "_SYSTEMD_UNIT": "wsprrypi.service",
  "HOSTNAME": "raspberrypi",
  "PID": 1234,
  "UID": 0,
  "GID": 0
}
```

### Field meanings

| Field | Description |
| ----- | ------------ -|
| `type` | `"journal"` for real journald entries, `"internal"` for PHP‑generated events |
| `playback` | `true` if emitted during replay/backlog, `false` if live follow |
| `__CURSOR` | Journald cursor. `null` for internal events |
| `__REALTIME_TIMESTAMP` | Microseconds since Unix epoch |
| `PRIORITY` | Syslog priority (`0` = emerg … `7` = debug) |
| `SYSLOG_IDENTIFIER` | Identifier provided by the logging process |
| `MESSAGE` | Human‑readable log message |
| `_SYSTEMD_UNIT` | Systemd unit name, if present |
| `HOSTNAME` | Host that emitted the log |
| `PID` | Process ID |
| `UID` | User ID |
| `GID` | Group ID |

---

## Cursor & Resume Behavior

- For **journal events**, the SSE stream includes:
  
  ```JSON
  id: <URL‑encoded __CURSOR>
  ```

- Browsers automatically resend this value as `Last-Event-ID` on reconnect.
- The server resumes with `journalctl --after-cursor`, avoiding duplicates.

### Consumer rule (important)

> Persist **only** the last cursor from events where  
> `type === "journal"` and `__CURSOR !== null`.

Internal events never advance the cursor.

---

## Query Parameters

### Playback & Replay

| Parameter | Default | Description |
| -------- | --------- | ------------- |
| `playback` | `1` | `1` enables replay/backlog, `0` disables it |
| `backlog` | `200` | Number of log entries to replay (`-n`) |

Behavior:

- If `Last-Event-ID` is present, replay is skipped.
- If `playback=0`, replay is skipped entirely.
- `backlog` is clamped server‑side for safety.

Examples:

```JS
log_stream.php?backlog=500
log_stream.php?playback=0
```

---

### Filtering

#### Priority filtering

| Parameter | Description |
| -------- | ------------- |
| `priority_min` | Lowest priority to include (`0`–`7`) |
| `priority_max` | Highest priority to include (`0`–`7`) |

Mapped directly to:

```bash
journalctl -p <min>..<max>
```

Example:

```js
log_stream.php?priority_max=4
```

#### Systemd unit filtering

| Parameter | Description |
| -------- | ------------- |
| `unit` | Comma‑separated unit names |
| `unit=*` | Disable unit filtering entirely |

Default behavior:

- If no `unit` is specified, the server defaults to its configured service unit.

Examples:

```js
log_stream.php?unit=wsprrypi.service
log_stream.php?unit=ssh.service,cron.service
log_stream.php?unit=*
```

### SYSLOG_IDENTIFIER

- `SYSLOG_IDENTIFIER` is **always sent** in events.
- It is **not filtered** server‑side.
- Consumers should filter or group by this field themselves.

---

## Heartbeats

To keep idle SSE connections alive, the server emits periodic heartbeats.

| Parameter | Default | Description |
| -------- | --------- | ------------- |
| `heartbeat` | `15` | Seconds between heartbeats (clamped) |

Heartbeat events:

- `type: "internal"`
- `playback: false`
- `MESSAGE: "[HEARTBEAT]"`
- `PRIORITY: "7"`

Example:

```js
log_stream.php?heartbeat=10
```

---

## Internal Events

The PHP adapter emits internal events for:

- Connection establishment
- Replay start/end
- Follow restarts
- STDERR or malformed journald output
- Heartbeats

They use the same schema, with:

- `type: "internal"`
- `__CURSOR: null`

Consumers may style or suppress these as desired.

---

## Typical Consumer Flow

1. Open `EventSource` on `/log_stream.php`
2. Render all incoming events using the unified schema
3. Persist the last cursor from `type === "journal"` events
4. On reconnect, allow the browser to resend `Last-Event-ID`
5. Optionally adjust query params to control replay, filtering, or heartbeat

---

## Notes & Limitations

- Each connected client spawns a `journalctl` process.
- Intended for admin dashboards or local tools, not high‑fanout public access.
- Access requires the PHP user to have permission to read the journal
  (e.g. membership in `systemd-journal` group).

---

## License / Usage

This API is transport‑only and intentionally UI‑agnostic.
Consumers are free to interpret, render, and persist events as needed.

---

## JavaScript Consumer Example

Below is a minimal browser-side example using `EventSource`.
It demonstrates:

- Unified event handling
- Cursor persistence
- Resume on reload
- Filtering left to the consumer

```html
<script>
let lastCursor = localStorage.getItem("journalCursor") || null;

const params = new URLSearchParams({
  playback: "1",
  backlog: "200",
  priority_max: "4",
  heartbeat: "15"
});

const es = new EventSource(`/log_stream.php?${params.toString()}`);

es.onmessage = (evt) => {
  const data = JSON.parse(evt.data);

  // Render however you want
  console.log(
    `[${data.type}]`,
    data.PRIORITY,
    data.SYSLOG_IDENTIFIER,
    data.MESSAGE
  );

  // Persist cursor ONLY from real journal events
  if (data.type === "journal" && data.__CURSOR) {
    localStorage.setItem("journalCursor", data.__CURSOR);
  }
};

es.onerror = (err) => {
  console.error("SSE error", err);
  es.close();
};
</script>
```

Notes:

- Browsers automatically send `Last-Event-ID` on reconnect.
- Heartbeat events keep the connection alive during idle periods.
- Internal events can be styled or ignored as desired.

---

## OpenAPI-Style Summary (Informational)

This is a conceptual summary for tooling and documentation.
The endpoint is **SSE**, not a traditional request/response API.
SSE streams are not a perfect fit for OpenAPI, but the following
summary is useful for documentation and tooling.

```yaml
openapi: 3.0.3
info:
  title: log_stream.php SSE API
  version: "1.0"
  description: >
    Streams systemd-journald entries over Server-Sent Events (SSE) using a unified JSON
    schema. Supports replay/backlog, cursor-based resume (Last-Event-ID), server-side
    filtering (priority + unit), and heartbeat events during idle periods.

paths:
  /log_stream.php:
    get:
      summary: Stream systemd-journald logs over SSE
      description: >
        Returns text/event-stream. Each SSE `data:` message contains a JSON object using the
        unified schema. Journald events include an SSE `id:` line equal to the URL-encoded
        __CURSOR, enabling cursor resume via the Last-Event-ID mechanism.
      parameters:
        - name: playback
          in: query
          description: >
            Enable or disable replay/backlog on cold start. Canonical values are 0 or 1.
            The implementation may also accept "false"/"off" as falsey.
            If Last-Event-ID is present, replay is skipped regardless.
          schema:
            oneOf:
              - type: integer
                enum: [0, 1]
                default: 1
              - type: boolean
                default: true
        - name: backlog
          in: query
          description: >
            Number of entries to replay on initial connect when playback is enabled and no
            Last-Event-ID is present.
          schema:
            type: integer
            default: 200
            minimum: 0
        - name: priority_min
          in: query
          description: Lowest syslog priority to include (0..7).
          schema:
            type: integer
            minimum: 0
            maximum: 7
        - name: priority_max
          in: query
          description: Highest syslog priority to include (0..7).
          schema:
            type: integer
            minimum: 0
            maximum: 7
        - name: unit
          in: query
          description: >
            Comma-separated systemd unit names to include. Use '*' to disable unit filtering.
          schema:
            type: string
        - name: heartbeat
          in: query
          description: >
            Heartbeat interval in seconds. Heartbeats are emitted as internal events when the
            stream is idle.
          schema:
            type: integer
            default: 15
            minimum: 5
            maximum: 60
      responses:
        "200":
          description: SSE stream of log events.
          content:
            text/event-stream:
              schema:
                type: string
              example: |
                id: s=...;i=...;b=...;m=...;t=...;x=...
                data: {"type":"journal","playback":false,"__CURSOR":"s=...","__REALTIME_TIMESTAMP":1738198123456789,"PRIORITY":"6","SYSLOG_IDENTIFIER":"wsprrypi","MESSAGE":"Started WsprryPi.","_SYSTEMD_UNIT":"wsprrypi.service","HOSTNAME":"raspberrypi","PID":1234,"UID":0,"GID":0}

                data: {"type":"internal","playback":false,"__CURSOR":null,"__REALTIME_TIMESTAMP":1738198123555000,"PRIORITY":"7","SYSLOG_IDENTIFIER":"log_stream.php","MESSAGE":"[HEARTBEAT]","_SYSTEMD_UNIT":"wsprrypi.service","HOSTNAME":"raspberrypi","PID":9876,"UID":33,"GID":33}
        "500":
          description: Internal error starting journalctl or streaming.

components:
  schemas:
    LogEvent:
      type: object
      description: Unified event emitted in each SSE `data:` message.
      required:
        - type
        - playback
        - __REALTIME_TIMESTAMP
        - MESSAGE
      properties:
        type:
          type: string
          enum: [journal, internal]
          description: '"journal" for real journald entries, "internal" for adapter events.'
        playback:
          type: boolean
          description: >
            true for events emitted during replay/backlog, false for live follow and internal events.
        __CURSOR:
          type: string
          nullable: true
          description: >
            Journald cursor. Present for journal events when available. Null for internal events.
        __REALTIME_TIMESTAMP:
          type: integer
          format: int64
          description: Microseconds since Unix epoch.
        PRIORITY:
          type: string
          nullable: true
          description: Syslog priority 0..7 as a string.
        SYSLOG_IDENTIFIER:
          type: string
          nullable: true
          description: Identifier from journald (or adapter identifier for internal events).
        MESSAGE:
          type: string
          description: Human-readable message text.
        _SYSTEMD_UNIT:
          type: string
          nullable: true
          description: Systemd unit name when available.
        HOSTNAME:
          type: string
          nullable: true
          description: Host that emitted the log entry.
        PID:
          type: integer
          format: int64
          nullable: true
          description: Process ID.
        UID:
          type: integer
          format: int64
          nullable: true
          description: User ID.
        GID:
          type: integer
          format: int64
          nullable: true
          description: Group ID.
```

This OpenAPI-style block is **descriptive only** and intended for
documentation, not code generation.

---

## Consumer JavaScript Example (EventSource)

This is a minimal browser-side example that:

- Opens an SSE connection
- Parses incoming JSON events
- Renders them (placeholder)
- Persists **only** the last journald cursor (`type === "journal"`)
- Supports replay/backlog and filtering via query params

```js
// Example usage:
// const stream = startLogStream({
//   url: "/log_stream.php",
//   params: {
//     playback: 1,        // 1 = replay/backlog enabled, 0 = follow-only
//     backlog: 200,       // replay last N if no Last-Event-ID
//     unit: "wsprrypi.service",
//     priority_max: 6,
//     heartbeat: 15
//   }
// });

function buildUrl(baseUrl, params = {}) {
  const u = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    u.searchParams.set(k, String(v));
  });
  return u.toString();
}

function renderEvent(ev) {
  // Your UI code goes here.
  // ev has the unified schema described in this doc.
  console.log(ev.type, ev.playback ? "[PLAYBACK]" : "[LIVE]", ev.MESSAGE);
}

function saveLastCursor(cursor) {
  // Persist only journald cursors. localStorage is simplest.
  // You can swap this for IndexedDB or your own persistence.
  localStorage.setItem("logs_last_cursor", cursor);
}

function loadLastCursor() {
  return localStorage.getItem("logs_last_cursor") || "";
}

export function startLogStream({ url, params = {} }) {
  const fullUrl = buildUrl(url, params);

  // Let the browser manage Last-Event-ID automatically.
  // Most browsers will send Last-Event-ID on reconnect
  // using the last "id:" value received.
  //
  // If you want explicit cursor pinning across full page reloads,
  // you can pass it as a query param and have the server interpret it,
  // but this API is designed to rely on SSE resume.
  const es = new EventSource(fullUrl);

  es.onopen = () => {
    console.log("SSE open:", fullUrl);
  };

  es.onmessage = (msg) => {
    let ev;
    try {
      ev = JSON.parse(msg.data);
    } catch (e) {
      console.warn("Bad JSON from SSE:", msg.data);
      return;
    }

    // Persist only cursors from real journald events.
    if (ev && ev.type === "journal" && typeof ev.__CURSOR === "string" && ev.__CURSOR.length > 0) {
      saveLastCursor(ev.__CURSOR);
    }

    renderEvent(ev);
  };

  es.onerror = (err) => {
    // Browser will reconnect automatically.
    // You can surface this in your UI if desired.
    console.warn("SSE error (auto-reconnect expected):", err);
  };

  // Optional: provide a stop handle.
  return {
    close() {
      es.close();
      console.log("SSE closed");
    }
  };
}
```

Notes:

- If you need cursor persistence across **full page reloads**, you can store the last
  cursor (see `saveLastCursor`) and use it to decide whether to enable replay.
  Most dashboards simply rely on SSE reconnection and set `playback=1&backlog=N`
  on a cold start.
- The stream may emit internal events like `"[HEARTBEAT]"`. Consumers can display
  them, suppress them, or use them for connection health indicators.

---

## Permissions & Access to systemd-journald

For this endpoint to work, the **web server user running PHP must have permission
to read the systemd journal**.

On most systemd-based distributions, this means the user must be a member of the
`systemd-journal` group.

### Typical setup

Add your web server user to the group:

```bash
sudo usermod -aG systemd-journal www-data
```

(Replace `www-data` with the actual user your web server runs as, if different.)

Then restart the web server so the new group membership takes effect:

```bash
sudo systemctl restart apache2
# or
sudo systemctl restart nginx
# or your relevant web server / PHP-FPM service
```

### Notes

- Group membership is required to allow `journalctl` to read system logs.
- Without this, the stream may silently fail or emit internal error events.
- For security reasons, avoid granting this access unless the endpoint is
  restricted (e.g., local admin UI, authentication, or firewall rules).

This requirement is **systemd-specific**; non-systemd systems are not supported.
