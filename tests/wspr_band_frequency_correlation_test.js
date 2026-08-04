"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const uiRoot = path.resolve(__dirname, "..");
const siteScript = fs.readFileSync(path.join(uiRoot, "data/site.js"), "utf8");
const maintenanceView = fs.readFileSync(path.join(uiRoot, "data/views/maintenance.php"), "utf8");

function findMatchingBrace(source, openingBraceIndex) {
    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (let index = openingBraceIndex; index < source.length; index += 1) {
        const character = source[index];
        const nextCharacter = source[index + 1];
        if (lineComment) {
            if (character === "\n") lineComment = false;
            continue;
        }
        if (blockComment) {
            if (character === "*" && nextCharacter === "/") {
                blockComment = false;
                index += 1;
            }
            continue;
        }
        if (quote) {
            if (escaped) escaped = false;
            else if (character === "\\") escaped = true;
            else if (character === quote) quote = "";
            continue;
        }
        if (character === "/" && nextCharacter === "/") {
            lineComment = true;
            index += 1;
        } else if (character === "/" && nextCharacter === "*") {
            blockComment = true;
            index += 1;
        } else if (["'", "\"", "`"].includes(character)) {
            quote = character;
        } else if (character === "{") {
            depth += 1;
        } else if (character === "}") {
            depth -= 1;
            if (depth === 0) return index;
        }
    }
    throw new Error("Unterminated source block in data/site.js");
}

function extractFunctionSource(name) {
    const declaration = `function ${name}(`;
    const start = siteScript.indexOf(declaration);
    assert.notEqual(start, -1, `${name} must remain available in data/site.js`);
    const openingBrace = siteScript.indexOf("{", start + declaration.length);
    return siteScript.slice(start, findMatchingBrace(siteScript, openingBrace) + 1);
}

const functionNames = [
    "parseOperationFrequencyWithOptionalUnits",
    "parseConfiguredWsprFrequencyHz",
    "validateWsprBandCatalog",
    "invalidTestToneSelection",
    "createWsprBandTestToneSelection",
    "createCustomRfTestToneSelection",
    "createTestToneSelection",
    "createTestToneSelectionPreview",
    "currentValidatedTestToneCatalog",
    "displayTestToneCatalog",
    "configuredWsprCatalogBand",
    "populateTestToneBandOptions",
    "selectedTestToneMode",
    "setSelectedTestToneMode",
    "renderTestToneSelection",
    "initializeTestToneSelectionControls",
    "updateWsprBandCatalog",
    "updateWsprBandCatalogUiState",
    "clearWsprBandCatalogPendingRequest",
    "invalidateWsprBandCatalogAuthorization",
    "isCurrentWsprBandCatalogRequest",
    "requestWsprBandCatalog",
    "handleWsprBandCatalogResponse",
    "normalizeTestToneMode",
    "configuredTestToneFrequencyForMode",
    "updateTestToneConfigContext",
    "testToneDefaultTransmitFrequencyHz",
    "formatTestToneFrequencyMhz",
    "testToneFrequencyContextText",
    "updateTestToneFrequencyContext",
    "updateTestToneFrequencyInputDefault",
    "testToneFrequencyOverridePayload",
    "setTestToneExecutionResult",
    "clearTestToneExecutionResult",
    "validCommittedToneFrequency",
    "committedTestToneSelectorText",
    "committedTestToneExecutionText",
    "isTestToneRuntimeActive",
    "hasActiveManagedTransmissionForTestTone",
    "hasEnabledManagedTransmissionForTestTone",
    "clearUnresolvedTestToneStartContext",
    "clearPendingTestToneStartRequest",
    "quarantineTimedOutTestToneStartRequest",
    "isTestToneStartQuarantinedForCurrentSocket",
    "markPendingTestToneStartRequest",
    "canStartTestTone",
    "syncTestToneControlState",
    "clickTestTone",
    "sendTestToneStartPayload",
    "onTestToneStart",
    "onTestToneEnd",
    "handleTestToneCommandResponse",
    "bindTestToneControls",
    "sendCommand",
    "connectWebSocket",
];

assert.doesNotMatch(
    extractFunctionSource("parseConfiguredWsprFrequencyHz"),
    /const\s+bandFrequencies\s*=/,
    "configured WSPR aliases must not retain a UI-owned frequency table"
);
for (const id of [
    "testToneSourceBand",
    "testToneSourceCustom",
    "testToneBand",
    "testToneFrequencyHz",
    "testToneSelectionPreview",
    "testToneSelectionError",
    "testToneExecutionResult",
]) {
    assert.match(maintenanceView, new RegExp(`id="${id}"`), `${id} markup must remain available`);
}
assert.match(maintenanceView, /id="testToneExecutionResult"[\s\S]*role="status"[\s\S]*aria-live="polite"/,
    "execution results must be announced separately from the requested preview");

class FakeWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;

    constructor(url) {
        this.url = url;
        this.readyState = FakeWebSocket.CONNECTING;
        this.listeners = Object.create(null);
        this.sent = [];
        this.sendAttempts = 0;
        this.throwOnSend = FakeWebSocket.throwOnNextSend;
        FakeWebSocket.throwOnNextSend = false;
        FakeWebSocket.instances.push(this);
    }

    addEventListener(type, listener) {
        (this.listeners[type] ||= []).push(listener);
    }

    emit(type, event = {}) {
        for (const listener of this.listeners[type] || []) listener(event);
    }

    open() {
        this.readyState = FakeWebSocket.OPEN;
        this.emit("open");
    }

    message(value) {
        this.emit("message", { data: typeof value === "string" ? value : JSON.stringify(value) });
    }

    close() {
        this.readyState = 3;
        this.emit("close", { code: 1006 });
    }

    send(payload) {
        this.sendAttempts += 1;
        if (this.throwOnSend) {
            throw new Error("mock send failure");
        }
        this.sent.push(JSON.parse(payload));
    }
}
FakeWebSocket.instances = [];
FakeWebSocket.throwOnNextSend = false;

let modalShown = false;
function element(initial = {}) {
    return Object.assign({
        value: "",
        checked: false,
        disabled: false,
        textContent: "",
        options: [],
        handlers: Object.create(null),
        replaceChildren() {
            this.options = [];
            this.value = "";
        },
        appendChild(option) {
            this.options.push(option);
        },
    }, initial);
}
const elements = {
    testToneStart: element({ disabled: true }),
    testToneEnd: element({ disabled: true }),
    testToneClose: element(),
    testToneSourceBand: element(),
    testToneSourceCustom: element(),
    testToneBand: element({ disabled: true }),
    testToneFrequencyHz: element(),
    testToneFrequencyContext: element(),
    testToneSelectionPreview: element(),
    testToneSelectionError: element(),
    testToneExecutionResult: element(),
    test_tone: element(),
    testToneModal: element({ classList: { contains: (name) => name === "show" && modalShown } }),
};
const buttons = {
    "#test_tone": elements.test_tone,
    "#testToneStart": elements.testToneStart,
    "#testToneEnd": elements.testToneEnd,
    "#testToneClose": elements.testToneClose,
};
const timers = new Map();
const timerCallbacks = new Map();
const clearedTimers = new Set();
let nextTimerId = 1;
let throwOnNextDebugLog = false;
function schedule(callback, delay) {
    const id = nextTimerId++;
    timers.set(id, { callback, delay });
    timerCallbacks.set(id, callback);
    return id;
}
function clearSchedule(id) {
    clearedTimers.add(id);
    timers.delete(id);
}
function runTimer(id) {
    const timer = timers.get(id);
    assert.ok(timer, `timer ${id} must be pending before it runs`);
    timers.delete(id);
    timer.callback();
}

function jquery(selector) {
    const targets = String(selector).split(",").map((value) => value.trim())
        .map((value) => buttons[value] || elements[value.replace(/^#/, "")])
        .filter(Boolean);
    return {
        length: targets.length,
        prop(name, value) {
            if (arguments.length === 1) return targets[0]?.[name];
            for (const target of targets) target[name] = value;
            return this;
        },
        off(eventName) {
            const event = String(eventName || "").split(".")[0];
            for (const target of targets) {
                if (event) delete target.handlers[event];
                else target.handlers = Object.create(null);
            }
            return this;
        },
        on(eventName, handler) {
            const event = String(eventName).split(".")[0];
            for (const target of targets) target.handlers[event] = handler;
            return this;
        },
        is() { return false; },
        text() { return this; },
    };
}

const context = {
    Array,
    JSON,
    Math,
    Number,
    Object,
    String,
    WeakSet,
    WebSocket: FakeWebSocket,
    console,
    $: jquery,
    document: {
        getElementById(id) {
            return elements[id] || null;
        },
        createElement() { return element(); },
    },
    bootstrap: { Modal: class { show() { modalShown = true; } } },
    window: { setTimeout: schedule, clearTimeout: clearSchedule },
    recordedTimerCallbacks: timerCallbacks,
    setTimeout: schedule,
    clearTimeout: clearSchedule,
    debugConsole() {
        if (throwOnNextDebugLog) {
            throwOnNextDebugLog = false;
            throw new Error("mock post-send debug failure");
        }
    },
    clearWebSocketReconnectTimer() {},
    createEndpointDefinition(_name, endpoint) {
        return { proxyUrl: endpoint, directUrl: endpoint };
    },
    warnWebSocketFallback() {},
    warnWebSocketFallbackAttempt() {},
    warnWebSocketFallbackFailure() {},
    armOutageBannerIfReady() {},
    setConnectionState() {},
    syncConnectionAlert() {},
    reloadAllData() {},
    getTxState() {},
    isRuntimeControlView: () => false,
    clearOfflineDefaults() {},
    toggleButtonLoading() {},
};
vm.createContext(context);
vm.runInContext(`
const WSPR_BAND_CATALOG_TIMEOUT_MS = 5000;
const TEST_TONE_COMMAND_TIMEOUT_MS = 15000;
const CANONICAL_WSPR_BAND_NAMES = Object.freeze(["2200m", "630m", "160m", "80m", "60m", "40m", "30m", "22m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m"]);
const TEST_TONE_SELECTION_MODES = Object.freeze({ WSPR_BAND: "wspr_band", CUSTOM_RF: "custom_rf" });
let ws;
let websocketCurrentlyConnected = false;
let websocketReconnectTimer = null;
let websocketConnectedOnce = false;
let communicationInterrupted = false;
let reloadAfterReconnectPending = false;
let systemPaused = false;
let pendingTestToneStartRequest = false;
let unresolvedTestToneStartContext = null;
let pendingTestToneStartTimeoutHandle = null;
let testToneStartQuarantinedSocket = null;
let testToneStartQuarantinedConnectionGeneration = 0;
let retainingTestToneStartContextForResponse = false;
let currentRuntimeStatus = null;
let currentRuntimeConfigStatus = { mode: "", transmitEnabled: false };
let currentTestToneConfigContext = { mode: "WSPR", configuredFrequencyHz: 0, wsprFrequencyValue: "22m", cwBaseFrequencyHz: 0 };
let currentTestToneSelection = { valid: false, error: "Select a Test Tone frequency source." };
let wsprBandDialFrequenciesHz = Object.create(null);
let wsprAudioOffsetHz = 0;
let wsprBandCatalogConnectionGeneration = 0;
let wsprBandCatalogRequestGeneration = 0;
let wsprBandCatalogRequestedSockets = new WeakSet();
let wsprBandCatalogPendingRequest = null;
let wsprBandCatalogAuthorized = false;
let wsprBandCatalogStatusMessage = "WSPR band catalog unavailable. Test Tone Start is disabled.";
let blockedTestToneReason = "";
function showTestToneBlockedModal(reason) { blockedTestToneReason = reason; }
function clearWebSocketReconnectTimer() {
    if (websocketReconnectTimer !== null) {
        clearTimeout(websocketReconnectTimer);
        websocketReconnectTimer = null;
    }
}
${functionNames.map(extractFunctionSource).join("\n")}
globalThis.catalogSnapshot = () => ({
    authorized: wsprBandCatalogAuthorized,
    pending: wsprBandCatalogPendingRequest !== null,
    message: wsprBandCatalogStatusMessage,
    offset: wsprAudioOffsetHz,
    catalog: Object.assign({}, wsprBandDialFrequenciesHz),
    connectionGeneration: wsprBandCatalogConnectionGeneration,
    requestGeneration: wsprBandCatalogRequestGeneration,
    pendingRequestGeneration: wsprBandCatalogPendingRequest?.requestGeneration ?? null,
    timeoutHandle: wsprBandCatalogPendingRequest?.timeoutHandle ?? null,
});
globalThis.openConnection = () => { const socket = connectWebSocket("ws://test"); socket.open(); return socket; };
globalThis.parseConfiguredWsprFrequencyHz = parseConfiguredWsprFrequencyHz;
globalThis.updateWsprBandCatalog = updateWsprBandCatalog;
globalThis.validateWsprBandCatalog = validateWsprBandCatalog;
globalThis.createTestToneSelection = createTestToneSelection;
globalThis.createTestToneSelectionPreview = createTestToneSelectionPreview;
globalThis.testToneDefaultTransmitFrequencyHz = testToneDefaultTransmitFrequencyHz;
globalThis.testToneFrequencyContextText = testToneFrequencyContextText;
globalThis.clickTestTone = clickTestTone;
globalThis.setTestToneInterlocks = (active, enabled) => {
    currentRuntimeStatus = active ? { txState: "transmitting" } : null;
    currentRuntimeConfigStatus = { mode: "WSPR", transmitEnabled: enabled === true };
};
globalThis.syncTestToneControlState = syncTestToneControlState;
globalThis.requestWsprBandCatalog = requestWsprBandCatalog;
globalThis.initializeTestToneSelectionControls = initializeTestToneSelectionControls;
globalThis.renderTestToneSelection = renderTestToneSelection;
globalThis.setTestToneConfiguration = (mode, wsprFrequencyValue, cwBaseFrequencyHz) => {
    updateTestToneConfigContext(mode, wsprFrequencyValue, cwBaseFrequencyHz);
};
globalThis.currentTestToneSelection = () => currentTestToneSelection;
globalThis.onTestToneStart = onTestToneStart;
globalThis.clearPendingTestToneStartRequest = clearPendingTestToneStartRequest;
globalThis.markPendingTestToneStartRequest = markPendingTestToneStartRequest;
globalThis.pendingTestToneStartSource = () => unresolvedTestToneStartContext?.frequencySource || "";
globalThis.testToneStartSnapshot = () => ({
    pending: pendingTestToneStartRequest,
    source: unresolvedTestToneStartContext?.frequencySource || "",
    hasUnresolvedContext: unresolvedTestToneStartContext !== null,
    quarantined: testToneStartQuarantinedSocket === ws &&
        testToneStartQuarantinedConnectionGeneration === wsprBandCatalogConnectionGeneration,
    timeoutHandle: pendingTestToneStartTimeoutHandle,
});
globalThis.clearTestToneExecutionResult = clearTestToneExecutionResult;
globalThis.handleTestToneCommandResponse = handleTestToneCommandResponse;
globalThis.bindTestToneControls = bindTestToneControls;
globalThis.blockedTestToneReason = () => blockedTestToneReason;
globalThis.toneStartMessages = (socket = ws) => socket.sent.filter(
    (message) => message.command === "tone_start"
);
globalThis.invokeRecordedTimer = (timerId) => recordedTimerCallbacks.get(timerId)?.();
`, context, { filename: "data/site.js" });

const canonicalBands = [
    "2200m", "630m", "160m", "80m", "60m", "40m", "30m", "22m",
    "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m"
];
function validCatalog(offset = 1500) {
    const dialFrequenciesHz = [
        136000, 474200, 1836600, 3568600, 5287200, 7038600, 10138700, 13551500,
        14095600, 18104600, 21094600, 24924600, 28124600, 50293000, 70091000, 144489000,
    ];
    return {
        command: "wspr_band_catalog",
        status: "ok",
        audio_offset_hz: offset,
        bands: canonicalBands.map((band, index) => {
            const dial = dialFrequenciesHz[index];
            return { band, dial_frequency_hz: dial, tone_frequency_hz: dial + offset };
        }),
    };
}
function assertStartDisabled(message) {
    assert.equal(buttons["#testToneStart"].disabled, true, message);
}

assert.equal(context.parseConfiguredWsprFrequencyHz("22m"), 0,
    "catalog aliases must remain unavailable before validation");
assert.equal(context.parseConfiguredWsprFrequencyHz("14.0956MHz"), 14095600,
    "numeric configured frequencies remain independent of catalog aliases");

const invalidCatalogCases = [
    ["missing row", (() => { const value = validCatalog(); value.bands.pop(); return value; })()],
    ["extra row", (() => { const value = validCatalog(); value.bands.push(value.bands[0]); return value; })()],
    ["duplicate row", (() => { const value = validCatalog(); value.bands[1].band = "2200m"; return value; })()],
    ["reordered row", (() => { const value = validCatalog(); [value.bands[0], value.bands[1]] = [value.bands[1], value.bands[0]]; return value; })()],
    ["lf row", (() => { const value = validCatalog(); value.bands[0].band = "lf"; return value; })()],
    ["mf row", (() => { const value = validCatalog(); value.bands[1].band = "mf"; return value; })()],
    ["invalid offset string", (() => { const value = validCatalog(); value.audio_offset_hz = "1500"; return value; })()],
    ["invalid offset Boolean", (() => { const value = validCatalog(); value.audio_offset_hz = false; return value; })()],
    ["invalid offset fractional", (() => { const value = validCatalog(); value.audio_offset_hz = 1500.5; return value; })()],
    ["invalid dial string", (() => { const value = validCatalog(); value.bands[0].dial_frequency_hz = "136000"; return value; })()],
    ["invalid dial Boolean", (() => { const value = validCatalog(); value.bands[0].dial_frequency_hz = true; return value; })()],
    ["invalid dial fractional", (() => { const value = validCatalog(); value.bands[0].dial_frequency_hz = 136000.5; return value; })()],
    ["invalid tone null", (() => { const value = validCatalog(); value.bands[0].tone_frequency_hz = null; return value; })()],
    ["invalid tone Boolean", (() => { const value = validCatalog(); value.bands[0].tone_frequency_hz = false; return value; })()],
    ["invalid tone fractional", (() => { const value = validCatalog(); value.bands[0].tone_frequency_hz = 137500.5; return value; })()],
    ["wrong tone relation", (() => { const value = validCatalog(); value.bands[0].tone_frequency_hz += 1; return value; })()],
    ["backend error", { command: "wspr_band_catalog", status: "error", message: "unavailable" }],
    ["malformed response", { command: "wspr_band_catalog", status: "ok", audio_offset_hz: 1500, bands: {} }],
];
for (const [name, catalog] of invalidCatalogCases) {
    assert.equal(context.validateWsprBandCatalog(catalog), null, `${name} must reject the entire catalog`);
}

const selectionCatalog = context.validateWsprBandCatalog(validCatalog(2750));
const selectionCatalogBefore = JSON.stringify(selectionCatalog);
for (const band of canonicalBands) {
    const selection = context.createTestToneSelection("wspr_band", band, selectionCatalog);
    assert.equal(selection.valid, true, `${band} must create a valid WSPR-band selection`);
    assert.equal(selection.mode, "wspr_band", `${band} selection must retain its source`);
    assert.equal(selection.band, band, `${band} selection must retain its canonical band`);
    assert.equal(selection.payload.command, "tone_start", `${band} payload must start a tone`);
    assert.equal(selection.payload.frequency_source, "wspr_band", `${band} payload must be semantic`);
    assert.equal(selection.payload.band, band, `${band} payload must retain the canonical band`);
    assert.equal(Object.hasOwn(selection.payload, "frequency_hz"), false,
        `${band} payload must not send an exact RF override`);
    assert.equal(selection.toneFrequencyHz, selection.dialFrequencyHz + selection.audioOffsetHz,
        `${band} selection must apply the catalog offset exactly once`);
    assert.equal(Object.isFrozen(selection.payload), true, `${band} payload must be immutable`);
}
assert.equal(JSON.stringify(selectionCatalog), selectionCatalogBefore,
    "selection must not mutate the validated catalog input");

const bandPreview = context.createTestToneSelectionPreview(
    context.createTestToneSelection("wspr_band", "22m", selectionCatalog)
);
assert.equal(bandPreview.valid, true, "band preview must be presentation-ready");
assert.equal(bandPreview.band, "22m", "band preview must retain the canonical band");
assert.equal(bandPreview.audioOffsetHz, 2750, "band preview must retain the non-default backend offset");
assert.equal(bandPreview.toneFrequencyHz, 13554250, "band preview must retain the final RF tone");
assert.match(bandPreview.text, /WSPR dial .*\+ 2750 Hz offset/, "band preview must explain dial and offset");

const customSelection = context.createTestToneSelection("custom_rf", "14097123", selectionCatalog);
assert.equal(customSelection.valid, true, "valid custom RF must create a selection");
assert.equal(customSelection.mode, "custom_rf", "custom RF must retain its source");
assert.equal(customSelection.frequencyHz, 14097123, "custom RF remains exact");
assert.equal(customSelection.payload.frequency_source, "custom_rf", "custom payload must be semantic");
assert.equal(customSelection.payload.frequency_hz, 14097123, "custom payload must carry exact RF");
assert.equal(Object.hasOwn(customSelection.payload, "band"), false,
    "custom payload must not send a band");
assert.equal(Object.hasOwn(customSelection, "audioOffsetHz"), false,
    "custom selection must not apply a WSPR offset");
const customPreview = context.createTestToneSelectionPreview(customSelection);
assert.equal(customPreview.valid, true, "custom preview must be presentation-ready");
assert.match(customPreview.text, /No WSPR offset is applied/, "custom preview must state exact-RF semantics");
assert.match(customPreview.text, /backend validates and resolves the band/i,
    "custom preview must preserve backend authority");

for (const value of ["", " ", "+1", "-1", "1.5", "1e6", "14MHz", "0", "001", "9007199254740992", null, 14097123]) {
    const selection = context.createTestToneSelection("custom_rf", value, selectionCatalog);
    assert.equal(selection.valid, false, `invalid custom RF ${String(value)} must reject`);
    assert.equal(Object.hasOwn(selection, "payload"), false,
        `invalid custom RF ${String(value)} must not expose a payload`);
    assert.ok(selection.error, `invalid custom RF ${String(value)} must explain rejection`);
}
for (const [mode, value, catalog] of [
    ["wspr_band", "invalid", selectionCatalog],
    ["wspr_band", "20m", null],
    ["invalid_mode", "20m", selectionCatalog],
]) {
    const selection = context.createTestToneSelection(mode, value, catalog);
    assert.equal(selection.valid, false, `${mode} invalid input must reject`);
    assert.equal(Object.hasOwn(selection, "payload"), false, `${mode} invalid input must not expose a payload`);
}
assert.equal(context.createTestToneSelectionPreview({ valid: false, error: "invalid selection" }).valid, false,
    "invalid selections must have an invalid preview");

const first = context.openConnection();
assert.deepEqual(first.sent, [{ command: "wspr_band_catalog" }], "every opened socket requests the catalog once");
const firstPending = context.catalogSnapshot();
assert.equal(firstPending.pending, true, "catalog request is pending after open");
assert.equal(firstPending.authorized, false, "open cannot authorize a catalog");
assert.ok(timers.has(firstPending.timeoutHandle), "catalog timeout is armed on open");
assertStartDisabled("Start stays disabled while catalog loads");
context.clickTestTone.call({}, { preventDefault() {} });
assertStartDisabled("opening the modal cannot enable Start before catalog authorization");

assert.equal(context.requestWsprBandCatalog(first), false, "same-socket duplicate catalog request is refused");
const afterDuplicateAttempt = context.catalogSnapshot();
assert.equal(first.sent.length, 1, "duplicate request sends no second message");
assert.equal(afterDuplicateAttempt.connectionGeneration, firstPending.connectionGeneration,
    "duplicate request does not increment the connection generation");
assert.equal(afterDuplicateAttempt.requestGeneration, firstPending.requestGeneration,
    "duplicate request does not increment the request generation");
assert.equal(afterDuplicateAttempt.pendingRequestGeneration, firstPending.pendingRequestGeneration,
    "duplicate request preserves the original pending record");
assert.equal(afterDuplicateAttempt.timeoutHandle, firstPending.timeoutHandle,
    "duplicate request preserves the original timer");
assert.ok(timers.has(firstPending.timeoutHandle), "duplicate request does not rearm the timer");

const catalog2750 = validCatalog(2750);
first.message(catalog2750);
assert.equal(context.catalogSnapshot().authorized, true, "current valid response authorizes Start");
assert.equal(context.catalogSnapshot().pending, false, "valid response clears pending state");
assert.equal(timers.has(firstPending.timeoutHandle), false, "success clears the catalog timer");
assert.ok(clearedTimers.has(firstPending.timeoutHandle), "success cancels the catalog timer directly");
assert.equal(context.catalogSnapshot().offset, 2750, "non-default offset is retained from the catalog");
assert.equal(context.parseConfiguredWsprFrequencyHz("lf"), 136000,
    "lf redirects through the validated 2200m catalog row");
assert.equal(context.parseConfiguredWsprFrequencyHz("mf"), 474200,
    "mf redirects through the validated 630m catalog row");
assert.equal(context.parseConfiguredWsprFrequencyHz("22m"), 13551500,
    "canonical aliases resolve through the validated catalog");
assert.equal(context.testToneDefaultTransmitFrequencyHz(), 13554250,
    "non-default catalog offset is applied exactly once");
assert.equal(buttons["#testToneStart"].disabled, false, "Start enables only after current validation");
assert.deepEqual(elements.testToneBand.options.map((option) => option.value), ["", ...canonicalBands],
    "band selector must contain exactly the canonical catalog order without aliases");
assert.equal(elements.testToneSourceBand.checked, true, "configured 22m defaults to band mode");
assert.equal(elements.testToneBand.value, "22m", "configured 22m selects its canonical catalog row");
assert.match(elements.testToneSelectionPreview.textContent, /WSPR dial .*\+ 2750 Hz offset/,
    "band mode preview must show the catalog dial and non-default offset");

context.setTestToneConfiguration("WSPR", "20m", 0);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneSourceBand.checked, true, "configured 20m defaults to band mode");
assert.equal(elements.testToneBand.value, "20m", "configured 20m selects its canonical row");
context.setTestToneConfiguration("WSPR", "lf", 0);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneBand.value, "2200m", "lf defaults through the canonical 2200m row");
context.setTestToneConfiguration("WSPR", "mf", 0);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneBand.value, "630m", "mf defaults through the canonical 630m row");
context.setTestToneConfiguration("WSPR", "14.095600MHz", 0);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneBand.value, "20m", "canonical numeric dial defaults to band mode");
context.setTestToneConfiguration("QRSS", "", 14097123);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneSourceCustom.checked, true, "non-WSPR configured frequency defaults to custom mode");
assert.equal(elements.testToneFrequencyHz.value, "14097123", "custom default retains exact configured RF");
context.setTestToneConfiguration("WSPR", "not-a-band", 0);
context.initializeTestToneSelectionControls();
assert.equal(elements.testToneSourceBand.checked, false, "unavailable configuration does not choose an arbitrary band");
assert.equal(elements.testToneSourceCustom.checked, false, "unavailable configuration remains unselected");
assertStartDisabled("unavailable configuration keeps Start disabled");

context.setTestToneConfiguration("WSPR", "20m", 0);
context.initializeTestToneSelectionControls();
context.bindTestToneControls();
assert.equal(typeof elements.testToneStart.handlers.click, "function", "Start must be bound to the production handler");
assert.equal(typeof elements.testToneSourceCustom.handlers.change, "function", "mode changes must be bound");
assert.equal(typeof elements.testToneBand.handlers.change, "function", "band changes must be bound");
assert.equal(typeof elements.testToneFrequencyHz.handlers.input, "function", "custom input must be bound");
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
assert.equal(JSON.stringify(context.toneStartMessages(first)), JSON.stringify([{
    command: "tone_start",
    frequency_source: "wspr_band",
    band: "20m",
}]), "band mode must send exactly the semantic band payload");
assert.equal(Object.hasOwn(context.toneStartMessages(first)[0], "frequency_hz"), false,
    "band mode must never include a legacy exact-RF override");
assert.equal(context.pendingTestToneStartSource(), "wspr_band",
    "the pending context must retain the exact semantic band source that was sent");
context.clearPendingTestToneStartRequest();

elements.testToneSourceBand.checked = false;
elements.testToneSourceCustom.checked = true;
elements.testToneFrequencyHz.value = "14097123";
elements.testToneSourceCustom.handlers.change.call(elements.testToneSourceCustom, { preventDefault() {} });
elements.testToneFrequencyHz.handlers.input.call(elements.testToneFrequencyHz, { preventDefault() {} });
assert.match(elements.testToneSelectionPreview.textContent, /No WSPR offset is applied/,
    "custom mode preview must state exact-RF offset behavior");
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
assert.equal(JSON.stringify(context.toneStartMessages(first)[1]), JSON.stringify({
    command: "tone_start",
    frequency_source: "custom_rf",
    frequency_hz: 14097123,
}), "custom mode must send exactly the semantic exact-RF payload");
assert.equal(Object.hasOwn(context.toneStartMessages(first)[1], "band"), false,
    "custom mode must never include a band field");
assert.equal(context.pendingTestToneStartSource(), "custom_rf",
    "the pending context must retain the exact semantic custom source that was sent");
context.clearPendingTestToneStartRequest();
elements.testToneFrequencyHz.value = "1.5";
elements.testToneFrequencyHz.handlers.input.call(elements.testToneFrequencyHz, { preventDefault() {} });
assertStartDisabled("invalid custom input disables Start");
assert.match(elements.testToneSelectionError.textContent, /positive whole-number/i,
    "invalid custom input must be shown beside the selection controls");
context.syncTestToneControlState(true);
assert.equal(buttons["#testToneEnd"].disabled, false,
    "End remains available for an active tone despite invalid current selection");
context.syncTestToneControlState(false);
elements.testToneFrequencyHz.value = "14097123";
context.renderTestToneSelection();
context.setTestToneInterlocks(true, false);
context.syncTestToneControlState(false);
assertStartDisabled("active managed transmission remains an independent Start interlock");
context.setTestToneInterlocks(false, true);
context.syncTestToneControlState(false);
assertStartDisabled("enabled schedule remains an independent Start interlock");
context.setTestToneInterlocks(false, false);
context.syncTestToneControlState(false);
assert.equal(buttons["#testToneStart"].disabled, false, "Start returns only when all interlocks clear");

elements.testToneSourceBand.checked = true;
elements.testToneSourceCustom.checked = false;
elements.testToneBand.value = "20m";
context.renderTestToneSelection();
context.syncTestToneControlState(false);
const failedStartTimer = nextTimerId;
const sentBeforeThrow = context.toneStartMessages(first).length;
const sendAttemptsBeforeThrow = first.sendAttempts;
first.throwOnSend = true;
let startExceptionEscaped = false;
try {
    elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
} catch (error) {
    startExceptionEscaped = true;
}
assert.equal(startExceptionEscaped, false,
    "a synchronous production WebSocket.send exception must not escape the bound Start handler");
assert.equal(first.sendAttempts, sendAttemptsBeforeThrow + 1,
    "the throwing Start path must attempt exactly one WebSocket send");
assert.equal(context.toneStartMessages(first).length, sentBeforeThrow,
    "a throwing WebSocket.send must not record a transmitted tone_start message");
assert.equal(timers.has(failedStartTimer), false,
    "the synchronous send failure must clear the exact Start timer immediately");
assert.ok(clearedTimers.has(failedStartTimer),
    "the synchronous send failure must cancel the exact Start timer directly");
assert.equal(JSON.stringify(context.testToneStartSnapshot()), JSON.stringify({
    pending: false,
    source: "",
    hasUnresolvedContext: false,
    quarantined: false,
    timeoutHandle: null,
}), "a definitely unsent Start request must not retain semantic context or quarantine its socket");
assert.match(elements.testToneExecutionResult.textContent, /could not be sent.*try again/i,
    "the synchronous send failure must be visible beside the Test Tone controls");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /WSPR dial|RF|GPIO|Selector/,
    "a definitely unsent Start request must not display committed execution details");
assert.equal(buttons["#testToneEnd"].disabled, true,
    "End remains unavailable when a throwing send never started a tone");
assert.equal(buttons["#testToneStart"].disabled, false,
    "the same open, authorized socket may retry after a definitely unsent Start request");
context.invokeRecordedTimer(failedStartTimer);
assert.equal(context.testToneStartSnapshot().quarantined, false,
    "a canceled Start timer callback cannot turn a definitely unsent request into an unknown-outcome quarantine");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /outcome is unknown/i,
    "a canceled Start timer callback must not replace the send-failure message");
first.throwOnSend = false;
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
assert.equal(context.toneStartMessages(first).length, sentBeforeThrow + 1,
    "a retry after synchronous send failure must use the normal semantic Start path");
context.clearPendingTestToneStartRequest();

selectBandForTimedStart("20m");
const sentBeforePostSendDebugFailure = context.toneStartMessages(first).length;
const sendAttemptsBeforePostSendDebugFailure = first.sendAttempts;
throwOnNextDebugLog = true;
let postSendDebugExceptionEscaped = false;
try {
    elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
} catch (error) {
    postSendDebugExceptionEscaped = true;
}
assert.equal(postSendDebugExceptionEscaped, false,
    "a post-send diagnostic failure must not escape the bound Start handler");
assert.equal(first.sendAttempts, sendAttemptsBeforePostSendDebugFailure + 1,
    "a post-send diagnostic failure still has exactly one accepted WebSocket send");
assert.equal(context.toneStartMessages(first).length, sentBeforePostSendDebugFailure + 1,
    "the accepted Start request must remain recorded when later diagnostics fail");
const postSendDebugPending = context.testToneStartSnapshot();
assert.equal(postSendDebugPending.pending, true,
    "post-send diagnostics must not clear the pending Start state");
assert.equal(postSendDebugPending.source, "wspr_band",
    "post-send diagnostics must retain immutable semantic request attribution");
assert.ok(timers.has(postSendDebugPending.timeoutHandle),
    "post-send diagnostics must leave the exact Start timeout armed");
assertStartDisabled("post-send diagnostics must not permit another Start request");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /could not be sent/i,
    "post-send diagnostics must not relabel an accepted request as unsent");
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
assert.equal(context.toneStartMessages(first).length, sentBeforePostSendDebugFailure + 1,
    "a second Start after post-send diagnostics must not send a duplicate request");
first.message({
    command: "tone_start",
    started: true,
    frequency_source: "wspr_band",
    band: "20m",
    dial_frequency_hz: 14095600,
    audio_offset_hz: 1500,
    actual_rf_frequency_hz: 14097100,
    selector_gpio_enabled: false,
});
assert.match(elements.testToneExecutionResult.textContent, /Started 20m: committed WSPR dial 14095600 Hz \+ 1500 Hz offset = 14097100 Hz RF/,
    "a response after post-send diagnostics must remain attributed to the accepted request");
assert.equal(buttons["#testToneEnd"].disabled, false,
    "End remains available after an accepted request receives its normal response");
context.handleTestToneCommandResponse({ command: "tone_end", stopped: true });

selectBandForTimedStart("20m");
throwOnNextDebugLog = true;
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
const postSendDebugTimeout = context.testToneStartSnapshot();
assert.equal(postSendDebugTimeout.pending, true,
    "a second accepted post-send diagnostic failure must still enter pending state");
assert.ok(timers.has(postSendDebugTimeout.timeoutHandle),
    "the pending request must retain its timer before the real timeout callback");
runTimer(postSendDebugTimeout.timeoutHandle);
assert.equal(JSON.stringify(context.testToneStartSnapshot()), JSON.stringify({
    pending: false,
    source: "wspr_band",
    hasUnresolvedContext: true,
    quarantined: true,
    timeoutHandle: null,
}), "a genuine timeout after post-send diagnostics must retain attribution and quarantine the socket");
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: false,
    message: "Timed-out test reset rejection.",
});

context.markPendingTestToneStartRequest({ frequency_source: "wspr_band" });
first.message({
    command: "tone_start",
    started: true,
    frequency_source: "wspr_band",
    band: "20m",
    dial_frequency_hz: 14095600,
    audio_offset_hz: 2750,
    actual_rf_frequency_hz: 14098350,
    selector_gpio_enabled: true,
    selector_gpio: 17,
    selector_gpio_active_high: true,
});
assert.match(elements.testToneExecutionResult.textContent, /Started 20m: committed WSPR dial 14095600 Hz \+ 2750 Hz offset = 14098350 Hz RF/,
    "band success must display backend-committed dial, offset, and RF values");
assert.match(elements.testToneExecutionResult.textContent, /GPIO 17, active high/,
    "band success must display committed active-high selector metadata");
assert.match(elements.testToneExecutionResult.className, /text-success/, "committed success must be styled as a status");
assert.equal(buttons["#testToneEnd"].disabled, false, "End remains usable after a successful start");

context.markPendingTestToneStartRequest({ frequency_source: "custom_rf" });
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: true,
    frequency_source: "custom_rf",
    band: "20m",
    actual_rf_frequency_hz: 14097123,
    selector_gpio_enabled: true,
    selector_gpio: 18,
    selector_gpio_active_high: false,
});
assert.match(elements.testToneExecutionResult.textContent, /Started 20m: committed exact RF 14097123 Hz\. No WSPR offset was applied/,
    "custom success must display backend-committed exact RF without a dial or offset");
assert.match(elements.testToneExecutionResult.textContent, /GPIO 18, active low/,
    "custom success must display committed active-low selector metadata");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /WSPR dial/, "custom success must omit dial metadata");

context.markPendingTestToneStartRequest({ frequency_source: "wspr_band" });
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: true,
    frequency_source: "wspr_band",
    band: "22m",
    dial_frequency_hz: 13551500,
    audio_offset_hz: 1500,
    actual_rf_frequency_hz: 13553000,
    selector_gpio_enabled: false,
});
assert.match(elements.testToneExecutionResult.textContent, /Selector: disabled/, "selector-disabled success must be explicit");

context.markPendingTestToneStartRequest({ frequency_source: "wspr_band" });
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: true,
    frequency_source: "wspr_band",
    band: "20m",
    dial_frequency_hz: 14095600,
    audio_offset_hz: 1500,
    selector_gpio_enabled: "false",
});
assert.match(elements.testToneExecutionResult.textContent, /started, but committed execution details were unavailable or invalid/i,
    "malformed semantic success must warn without inventing committed values");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /14095600|GPIO/, "malformed success must not expose unvalidated metadata");

for (const [name, expectedSource, response] of [
    ["missing source", "wspr_band", { command: "tone_start", started: true }],
    ["unknown source", "wspr_band", { command: "tone_start", started: true, frequency_source: "invalid" }],
    ["band request with custom response", "wspr_band", { command: "tone_start", started: true, frequency_source: "custom_rf" }],
    ["custom request with band response", "custom_rf", { command: "tone_start", started: true, frequency_source: "wspr_band" }],
]) {
    context.markPendingTestToneStartRequest({ frequency_source: expectedSource });
    context.handleTestToneCommandResponse(response);
    assert.match(elements.testToneExecutionResult.textContent, /started, but committed execution details were unavailable or invalid/i,
        `${name} must warn rather than be treated as legacy success`);
    assert.equal(buttons["#testToneEnd"].disabled, false,
        `${name} must keep End available because the backend reported an active tone`);
}

context.clearTestToneExecutionResult();
context.markPendingTestToneStartRequest();
context.handleTestToneCommandResponse({ command: "tone_start", started: true });
assert.equal(elements.testToneExecutionResult.textContent, "",
    "a genuine legacy success must not invent semantic execution details or a malformed warning");
assert.equal(buttons["#testToneEnd"].disabled, false,
    "a genuine legacy success must keep End available");

context.handleTestToneCommandResponse({
    command: "tone_start",
    started: false,
    message: "Requested band is unavailable.",
    blocked_by_active_transmission: false,
    blocked_by_enabled_transmission: false,
});
assert.equal(elements.testToneExecutionResult.textContent, "Requested band is unavailable.",
    "ordinary backend rejection must be shown beside the controls");
assert.match(elements.testToneExecutionResult.className, /text-danger/, "rejection must be visibly distinct");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /RF|GPIO|Selector/, "rejection must not display committed details");

context.markPendingTestToneStartRequest();
context.handleTestToneCommandResponse({ command: "tone_start", started: false, blocked_by_active_transmission: true });
assert.equal(context.blockedTestToneReason(), "active", "active-transmission rejection must preserve its existing workflow");
assert.match(elements.testToneExecutionResult.textContent, /rejected by the controller/i,
    "missing rejection message must use a safe inline fallback");
context.markPendingTestToneStartRequest();
context.handleTestToneCommandResponse({ command: "tone_start", started: false, blocked_by_enabled_transmission: true, message: "Disable the schedule first." });
assert.equal(context.blockedTestToneReason(), "enabled", "enabled-schedule rejection must preserve its existing workflow");
assert.equal(elements.testToneExecutionResult.textContent, "Disable the schedule first.",
    "blocked rejection must retain its backend message inline");

first.message(validCatalog(1500));
assert.equal(context.catalogSnapshot().offset, 2750,
    "duplicate responses are ignored deterministically after authorization");
assert.equal(context.requestWsprBandCatalog(first), false,
    "same-socket request remains refused after the original request completes");
assert.equal(first.sent.filter((message) => message.command === "wspr_band_catalog").length, 1,
    "completed same-socket catalog request sends no new message");

function selectBandForTimedStart(band = "20m") {
    elements.testToneSourceBand.checked = true;
    elements.testToneSourceCustom.checked = false;
    elements.testToneBand.value = band;
    context.renderTestToneSelection();
    context.syncTestToneControlState(false);
}

function selectCustomForTimedStart(frequencyHz = "14097123") {
    elements.testToneSourceBand.checked = false;
    elements.testToneSourceCustom.checked = true;
    elements.testToneFrequencyHz.value = frequencyHz;
    context.renderTestToneSelection();
    context.syncTestToneControlState(false);
}

function startSelectedToneAndRunRealTimeout(expectedSource) {
    const sentBefore = context.toneStartMessages(first).length;
    elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
    assert.equal(context.toneStartMessages(first).length, sentBefore + 1,
        "the bound Start handler must send exactly one semantic request before timeout");
    assert.equal(context.toneStartMessages(first).at(-1).frequency_source, expectedSource,
        "the bound Start handler must retain the exact source it sent");
    const pending = context.testToneStartSnapshot();
    assert.equal(pending.pending, true, "a submitted Start request must enter pending state");
    assert.equal(pending.source, expectedSource, "pending context must retain the immutable semantic source");
    assert.ok(timers.has(pending.timeoutHandle), "the production Start timeout must be armed");
    runTimer(pending.timeoutHandle);
    return { sentBefore, pending };
}

function finishLateStartedTone() {
    context.handleTestToneCommandResponse({ command: "tone_end", stopped: true });
    assert.equal(buttons["#testToneEnd"].disabled, true,
        "the test reset must restore inactive End state after the late result");
}

selectBandForTimedStart("20m");
const timedBandStart = startSelectedToneAndRunRealTimeout("wspr_band");
assert.equal(JSON.stringify(context.testToneStartSnapshot()), JSON.stringify({
    pending: false,
    source: "wspr_band",
    hasUnresolvedContext: true,
    quarantined: true,
    timeoutHandle: null,
}), "the real timeout callback clears progress but retains and quarantines the unresolved semantic request");
assertStartDisabled("a timed-out unresolved Start request must quarantine this socket");
assert.match(elements.testToneExecutionResult.textContent, /timed out.*outcome is unknown.*response or reconnect/i,
    "timeout outcome guidance must be inline beside the Test Tone controls");
elements.testToneStart.handlers.click.call(elements.testToneStart, { preventDefault() {} });
assert.equal(context.toneStartMessages(first).length, timedBandStart.sentBefore + 1,
    "a second Start attempt on the quarantined socket must send nothing");
first.message({
    command: "tone_start",
    started: true,
    frequency_source: "wspr_band",
    band: "20m",
    dial_frequency_hz: 14095600,
    audio_offset_hz: 2750,
    actual_rf_frequency_hz: 14098350,
    selector_gpio_enabled: false,
});
assert.match(elements.testToneExecutionResult.textContent, /Started 20m: committed WSPR dial 14095600 Hz \+ 2750 Hz offset = 14098350 Hz RF/,
    "a late valid band response must be attributed to its timed-out semantic request");
assert.equal(buttons["#testToneEnd"].disabled, false,
    "End remains available after a late backend-confirmed start");
assert.equal(JSON.stringify(context.testToneStartSnapshot()), JSON.stringify({
    pending: false,
    source: "",
    hasUnresolvedContext: false,
    quarantined: false,
    timeoutHandle: null,
}), "a completed late response must release its retained context and socket quarantine");
finishLateStartedTone();

for (const [name, response] of [
    ["missing source", { command: "tone_start", started: true }],
    ["unknown source", { command: "tone_start", started: true, frequency_source: "unknown" }],
    ["mismatched source", { command: "tone_start", started: true, frequency_source: "custom_rf" }],
]) {
    selectBandForTimedStart("20m");
    startSelectedToneAndRunRealTimeout("wspr_band");
    context.handleTestToneCommandResponse(response);
    assert.match(elements.testToneExecutionResult.textContent, /started, but committed execution details were unavailable or invalid/i,
        `late ${name} must warn instead of being treated as a legacy result`);
    assert.equal(buttons["#testToneEnd"].disabled, false,
        `End must remain available after a late ${name} response reporting started`);
    finishLateStartedTone();
}

selectCustomForTimedStart("14097123");
startSelectedToneAndRunRealTimeout("custom_rf");
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: true,
    frequency_source: "custom_rf",
    band: "20m",
    actual_rf_frequency_hz: 14097123,
    selector_gpio_enabled: true,
    selector_gpio: 18,
    selector_gpio_active_high: false,
});
assert.match(elements.testToneExecutionResult.textContent, /Started 20m: committed exact RF 14097123 Hz\. No WSPR offset was applied/,
    "a late valid custom response must retain its exact RF semantics");
assert.equal(buttons["#testToneEnd"].disabled, false,
    "End remains available after a late valid custom start");
finishLateStartedTone();

selectCustomForTimedStart("14097123");
startSelectedToneAndRunRealTimeout("custom_rf");
context.handleTestToneCommandResponse({
    command: "tone_start",
    started: false,
    message: "The backend rejected the late custom request.",
});
assert.equal(elements.testToneExecutionResult.textContent, "The backend rejected the late custom request.",
    "a late rejection must preserve its backend message inline");
assert.doesNotMatch(elements.testToneExecutionResult.textContent, /RF|GPIO|Selector/,
    "a late rejection must not display uncommitted execution metadata");
assert.equal(context.testToneStartSnapshot().hasUnresolvedContext, false,
    "a late rejection must release its retained request context");

context.clearTestToneExecutionResult();
context.handleTestToneCommandResponse({ command: "tone_start", started: true });
assert.equal(elements.testToneExecutionResult.textContent, "",
    "a genuine legacy success without retained semantic context remains compatible");
assert.equal(buttons["#testToneEnd"].disabled, false,
    "a genuine legacy success remains truthfully active");
finishLateStartedTone();

selectBandForTimedStart("20m");
startSelectedToneAndRunRealTimeout("wspr_band");

first.close();
assert.equal(context.catalogSnapshot().authorized, false, "disconnect revokes current authorization");
assertStartDisabled("last-valid catalog must not authorize Start after disconnect");
assert.equal(JSON.stringify(context.testToneStartSnapshot()), JSON.stringify({
    pending: false,
    source: "",
    hasUnresolvedContext: false,
    quarantined: false,
    timeoutHandle: null,
}), "disconnect must discard timed-out context and quarantine belonging to the old socket");
assert.equal(context.parseConfiguredWsprFrequencyHz("22m"), 13551500,
    "last-valid catalog remains available only for display/configuration continuity");

const second = context.openConnection();
assert.deepEqual(second.sent, [{ command: "wspr_band_catalog" }], "reconnect requests a fresh catalog");
assert.equal(context.catalogSnapshot().authorized, false, "reconnect begins unauthorized");
first.message({ command: "tone_start", started: true });
assert.equal(buttons["#testToneEnd"].disabled, true,
    "a late tone_start response from the disconnected socket must not alter the replacement connection state");
first.message(validCatalog(1500));
assert.equal(context.catalogSnapshot().authorized, false, "delayed old-connection response cannot authorize reconnect");
assertStartDisabled("stale response cannot enable Start");
const secondPending = context.catalogSnapshot();
second.message({ command: "wspr_band_catalog", status: "error" });
assert.equal(context.catalogSnapshot().authorized, false, "backend error remains unauthorized");
assert.equal(context.catalogSnapshot().pending, false, "backend error clears pending state");
assert.equal(timers.has(secondPending.timeoutHandle), false, "backend error clears the catalog timer");
assert.ok(clearedTimers.has(secondPending.timeoutHandle), "backend error cancels the timer directly");
assert.match(context.catalogSnapshot().message, /unavailable/i, "backend error is operator-visible");
assertStartDisabled("backend error keeps Start disabled");
second.close();

const third = context.openConnection();
assert.equal(third.sent.length, 1, "each new connection has its own catalog request");
const thirdPending = context.catalogSnapshot();
third.message({ command: "wspr_band_catalog", status: "ok", audio_offset_hz: 1500, bands: {} });
assert.equal(context.catalogSnapshot().authorized, false, "invalid response never authorizes Start");
assert.equal(context.catalogSnapshot().pending, false, "invalid response clears pending state");
assert.equal(timers.has(thirdPending.timeoutHandle), false, "invalid response clears the catalog timer");
assert.ok(clearedTimers.has(thirdPending.timeoutHandle), "invalid response cancels the timer directly");
assert.match(context.catalogSnapshot().message, /invalid/i, "invalid response is operator-visible");
third.close();

const fourth = context.openConnection();
const fourthPending = context.catalogSnapshot();
runTimer(fourthPending.timeoutHandle);
assert.equal(context.catalogSnapshot().authorized, false, "missing response never authorizes Start");
assert.equal(context.catalogSnapshot().pending, false, "timeout clears pending state");
assert.equal(timers.has(fourthPending.timeoutHandle), false, "timeout leaves no timer armed");
assert.ok(clearedTimers.has(fourthPending.timeoutHandle), "timeout cancellation is recorded directly");
assert.match(context.catalogSnapshot().message, /timed out/i, "catalog timeout is operator-visible");
assertStartDisabled("timeout keeps Start disabled");
fourth.close();

const fifth = context.openConnection();
const fifthPending = context.catalogSnapshot();
fifth.close();
assert.equal(context.catalogSnapshot().pending, false, "disconnect clears pending state");
assert.equal(timers.has(fifthPending.timeoutHandle), false, "disconnect clears the catalog timer");
assert.ok(clearedTimers.has(fifthPending.timeoutHandle), "disconnect cancels the timer directly");

const sixth = context.openConnection();
sixth.message(validCatalog(1500));
assert.equal(context.catalogSnapshot().authorized, true, "fresh valid response restores authorization");
assert.equal(buttons["#testToneStart"].disabled, false, "Start re-enables only after the new validation");
assert.match(context.testToneFrequencyContextText(), /Configured frequency:/,
    "validated catalog restores normal frequency context");

sixth.close();
const sendFailureTimer = nextTimerId;
FakeWebSocket.throwOnNextSend = true;
const seventh = context.openConnection();
assert.equal(seventh.sent.length, 0, "throwing send does not emit a catalog request");
assert.equal(context.catalogSnapshot().pending, false, "send failure clears pending state");
assert.equal(context.catalogSnapshot().authorized, false, "send failure revokes authorization");
assert.equal(timers.has(sendFailureTimer), false, "send failure clears its timer");
assert.ok(clearedTimers.has(sendFailureTimer), "send failure cancels the timer directly");
assert.match(context.catalogSnapshot().message, /could not be sent/i, "send failure is operator-visible");
assertStartDisabled("send failure keeps Start disabled");
seventh.message(validCatalog(1500));
assert.equal(context.catalogSnapshot().authorized, false,
    "a response after send failure cannot authorize the failed request");

console.log("wspr_band_frequency_correlation_test passed");
