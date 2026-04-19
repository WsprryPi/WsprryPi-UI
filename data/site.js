// Debug Logging Level (via debugConsole())
CONSOLE_LOG_LEVEL = "log";

// Service Components
const PORT = window.location.port ? `:${window.location.port}` : "";
const PROTO = window.location.protocol;
const WS_PROTO = PROTO === "https:" ? "wss:" : "ws:";
const HOSTNAME = window.location.hostname;
const HTTP_ORIGIN = `${PROTO}//${HOSTNAME}${PORT}`;
const WS_ORIGIN = `${WS_PROTO}//${HOSTNAME}${PORT}`;
const PATHS = window.WSPRRYPI_PATHS || {};
const APP_BASE_PATH = typeof PATHS.basePath === "string" ? PATHS.basePath : "";
const SETTINGS_PATH =
    typeof PATHS.configPath === "string"
        ? PATHS.configPath
        : `${APP_BASE_PATH}/config`;
const VERSION_PATH =
    typeof PATHS.versionPath === "string"
        ? PATHS.versionPath
        : `${APP_BASE_PATH}/version`;
const REPAIR_PATH =
    typeof PATHS.repairPath === "string"
        ? PATHS.repairPath
        : `${APP_BASE_PATH}/config/repair`;
const WEBSOCKET_PATH =
    typeof PATHS.socketPath === "string"
        ? PATHS.socketPath
        : `${APP_BASE_PATH}/socket`;
const LOG_STREAM_PATH =
    typeof PATHS.logStreamPath === "string"
        ? PATHS.logStreamPath
        : `${APP_BASE_PATH}/log_stream.php`;

// Service URLs
const SETTINGS_URL = `${HTTP_ORIGIN}${SETTINGS_PATH}`;
const VERSION_URL = `${HTTP_ORIGIN}${VERSION_PATH}`;
const REPAIR_URL = `${HTTP_ORIGIN}${REPAIR_PATH}`;
const WEBSOCKET_URL = `${WS_ORIGIN}${WEBSOCKET_PATH}`;
const LOG_STREAM_URL = `${HTTP_ORIGIN}${LOG_STREAM_PATH}`;
const WSPRNET_URL =
    "https://www.wsprnet.org/olddb?mode=html&band=all&limit=50&findreporter=&sort=date&findcall=";
const TAB_STATE_STORAGE_PREFIX = "wsprrypi.activeTab";

// Allow reloading data after communication interruption
let communicationInterrupted = false;
let reloadAfterReconnectPending = false;
let backendConnectedOnce = false;
let websocketConnectedOnce = false;
let backendCurrentlyConnected = false;
let websocketCurrentlyConnected = false;
let outageBannerArmed = false;
let pageUnloading = false;
let currentRuntimeStatus = null;
let currentRuntimeConfigStatus = {
    mode: "",
    transmitEnabled: false
};
let chromeOffsetSyncHandle = null;
let lastNavbarOffset = null;
let lastFooterOffset = null;

// Websocket Creation
let ws;
const WS_RECONNECT = 5000; // Retry again every 5s

// Save the last time we sent a config to avoid reload messages on WebSockets
let lastSaveTimestamp = null;
// Keep track of any scheduled reloads
let pendingPopulateConfigTimeout = null;

// Semaphore for singleton data load
let populateConfigRunning = false;
// Semaphore to pause processing (reboot or shutdown)
let systemPaused = false;

// For "are you sure?"
let pendingSystemAction = null;  // "reboot" or "shutdown"

const loggedConfigWarnings =
    window.loggedConfigWarnings ||
    (window.loggedConfigWarnings = new Set());

// Wait for page to load
window.addEventListener("beforeunload", () => {
    pageUnloading = true;
});

window.addEventListener("pagehide", () => {
    pageUnloading = true;
});

$(window).on("load", function () {
    bindActions();
    loadPage();
});

const configSchema = {
    Operation: {
        required: false,
        keys: {
            "Mode": { required: false, type: "string" },
            "Transmit": { required: false, type: "boolean" },
            "Transmit Backend": { required: false, type: "string" },
            "Use LED": { required: false, type: "boolean" },
            "LED Pin": { required: false, type: "number" },
            "Web Port": { required: false, type: "number" },
            "Socket Port": { required: false, type: "number" },
            "Use Shutdown": { required: false, type: "boolean" },
            "Shutdown Button": { required: false, type: "number" }
        }
    },
    GPIO: {
        required: false,
        keys: {
            "Transmit Pin": { required: false, type: "number" },
            "Power Level": { required: false, type: "number" },
            "Use NTP": { required: false, type: "boolean" }
        }
    },
    Platform: {
        required: false,
        keys: {
            "Model": { required: false, type: "string" },
            "Raspberry Pi Generation": { required: false, type: "number" },
            "GPIO Clock Transmission Supported": { required: false, type: "boolean" },
            "GPIO Clock Transmission Error": { required: false, type: "string" },
            "Si5351 Detected": { required: false, type: "boolean" },
            "Si5351 Detection Error": { required: false, type: "string" }
        }
    },
    Si5351: {
        required: false,
        keys: {
            "I2C Bus": { required: false, type: "number" },
            "I2C Address": { required: false, type: "string" },
            "Reference Frequency": { required: false, type: "number" },
            "TX Output": { required: false, type: "string" },
            "Power Level": { required: false, type: "number" }
        }
    },
    Calibration: {
        required: false,
        keys: {
            "PPM": { required: false, type: "number" }
        }
    },
    WSPR: {
        required: false,
        keys: {
            "Call Sign": { required: false, type: "string" },
            "Grid Square": { required: false, type: "string" },
            "TX Power": { required: false, type: "number" },
            "Frequency": { required: false, type: "string" },
            "Planner Preference": { required: false, type: "string" },
            "Use Random Offset": { required: false, type: "boolean" }
        }
    },
    CW: {
        required: false,
        keys: {
            "Message": { required: false, type: "string" },
            "Base Frequency": { required: false, type: "number" },
            "Shift Hz": { required: false, type: "number" },
            "Dot Seconds": { required: false, type: "number" },
            "Start Minute": { required: false, type: "number" },
            "Repeat Minutes": { required: false, type: "number" }
        }
    },
    "Band GPIO": {
        required: false,
        keys: {
            "2200m": { required: false, type: "object" },
            "630m": { required: false, type: "object" },
            "160m": { required: false, type: "object" },
            "80m": { required: false, type: "object" },
            "60m": { required: false, type: "object" },
            "40m": { required: false, type: "object" },
            "30m": { required: false, type: "object" },
            "22m": { required: false, type: "object" },
            "20m": { required: false, type: "object" },
            "17m": { required: false, type: "object" },
            "15m": { required: false, type: "object" },
            "12m": { required: false, type: "object" },
            "10m": { required: false, type: "object" },
            "6m": { required: false, type: "object" },
            "4m": { required: false, type: "object" },
            "2m": { required: false, type: "object" }
        }
    }
};

function logConfigWarningOnce(message) {
    if (loggedConfigWarnings.has(message)) return;
    loggedConfigWarnings.add(message);
    debugConsole("warn", message);
}

function loadPage() {
    initThemeToggle();
    scheduleChromeOffsetSync();
    hideConnectionAlert();
    setConnectionState("disconnected");
    connectWebSocket(WEBSOCKET_URL, WS_RECONNECT);
    updateClocks();
    if (typeof initLogStream === "function") {
        initLogStream();
    }
    populateConfig();
}

function getPersistedTabStorageKey(tabList) {
    if (!(tabList instanceof Element)) {
        return "";
    }

    const pageKey =
        typeof window.currentPage === "string" && window.currentPage
            ? window.currentPage
            : "unknown";
    const tabListKey = tabList.id || tabList.getAttribute("aria-label") || "tabs";
    return `${TAB_STATE_STORAGE_PREFIX}:${pageKey}:${tabListKey}`;
}

function getPersistedTabRestoreScope(tabList) {
    if (!(tabList instanceof Element)) {
        return "always";
    }

    const scope = tabList.dataset.persistTabStateScope;
    return typeof scope === "string" && scope.trim() ? scope.trim() : "always";
}

function getNavigationType() {
    try {
        const entries = window.performance?.getEntriesByType?.("navigation");
        if (Array.isArray(entries) && entries.length > 0) {
            return typeof entries[0].type === "string" ? entries[0].type : "";
        }
    } catch {
    }

    try {
        if (window.performance?.navigation) {
            switch (window.performance.navigation.type) {
                case window.performance.navigation.TYPE_RELOAD:
                    return "reload";
                case window.performance.navigation.TYPE_BACK_FORWARD:
                    return "back_forward";
                default:
                    return "navigate";
            }
        }
    } catch {
    }

    return "";
}

function shouldRestorePersistedTabState(tabList) {
    const scope = getPersistedTabRestoreScope(tabList);
    if (scope !== "reload") {
        return true;
    }

    return getNavigationType() === "reload";
}

function clearPersistedTabState(tabList) {
    const storageKey = getPersistedTabStorageKey(tabList);
    if (!storageKey) {
        return;
    }

    try {
        window.localStorage.removeItem(storageKey);
    } catch {
    }
}

function getPersistedTabSelector(trigger) {
    if (!(trigger instanceof Element)) {
        return "";
    }

    const target = trigger.getAttribute("data-bs-target");
    if (typeof target === "string" && target.trim()) {
        return target.trim();
    }

    const href = trigger.getAttribute("href");
    if (typeof href === "string" && href.startsWith("#")) {
        return href.trim();
    }

    return "";
}

function findTabTriggerBySelector(tabList, selector) {
    if (!(tabList instanceof Element) || typeof selector !== "string" || !selector.trim()) {
        return null;
    }

    const normalizedSelector = selector.trim();
    return tabList.querySelector(
        `[data-bs-toggle="tab"][data-bs-target="${normalizedSelector}"], ` +
        `[data-bs-toggle="tab"][href="${normalizedSelector}"]`
    );
}

function restorePersistedTabState(tabList) {
    if (!(tabList instanceof Element)) {
        return;
    }

    if (!shouldRestorePersistedTabState(tabList)) {
        clearPersistedTabState(tabList);
        return;
    }

    const storageKey = getPersistedTabStorageKey(tabList);
    if (!storageKey) {
        return;
    }

    let storedSelector = "";
    try {
        storedSelector = window.localStorage.getItem(storageKey) || "";
    } catch {
        storedSelector = "";
    }

    if (!storedSelector) {
        return;
    }

    const trigger = findTabTriggerBySelector(tabList, storedSelector);
    if (!trigger) {
        try {
            window.localStorage.removeItem(storageKey);
        } catch {
        }
        return;
    }

    const tabInstance = bootstrap.Tab.getOrCreateInstance(trigger);
    tabInstance.show();
}

function initPersistedTabState() {
    document
        .querySelectorAll('[data-persist-tab-state="true"]')
        .forEach((tabList) => {
            if (tabList.dataset.persistTabStateInitialized === "true") {
                return;
            }

            tabList.dataset.persistTabStateInitialized = "true";
            tabList.addEventListener("shown.bs.tab", (event) => {
                const trigger = event.target;
                const selector = getPersistedTabSelector(trigger);
                const storageKey = getPersistedTabStorageKey(tabList);

                if (!selector || !storageKey) {
                    return;
                }

                try {
                    window.localStorage.setItem(storageKey, selector);
                } catch {
                }
            });

            restorePersistedTabState(tabList);
        });
}

// Called after populateConfig() runs
function pageLoaded() {
    // Update items with callsign
    updateCallsign();

    // Update footer
    updateWsprryPiVersion();

    //
    // Per-Page Loaded Actions
    //

    // If fetchSPots() exists (on view_spots.php) then run it
    if (typeof fetchSpots === "function") {
        fetchSpots();
    }
}

function bindActions() {
    // Tooltips only hover (no focus), so clicking into inputs still works
    $('[data-bs-toggle="tooltip"]').tooltip({
        trigger: "hover",
    });
    // Reset tooltips on buttons/switch clicks
    $(document).on(
        "click",
        'a[data-bs-toggle="tooltip"], button[data-bs-toggle="tooltip"]',
        resetToolTips
    );

    // Bind the theme toggle
    $("#themeToggle").on("click", clickThemeToggle);

    const navbar = document.getElementById("mainNavbar");
    const mainNav = document.getElementById("mainNav");
    if (navbar && mainNav) {
        mainNav.addEventListener("shown.bs.collapse", scheduleChromeOffsetSync);
        mainNav.addEventListener("hidden.bs.collapse", scheduleChromeOffsetSync);
    }
    window.addEventListener("resize", scheduleChromeOffsetSync, { passive: true });
    initPersistedTabState();

    // Grab the modal element and its Bootstrap instance
    const systemModalEl = document.getElementById("systemModal");
    const systemModal = new bootstrap.Modal(systemModalEl, {
        backdrop: "static",
        keyboard: false,
    });

    // Confirm shutdown/reboot
    const confirmModalEl = document.getElementById('confirmModal');
    // create/get the Bootstrap modal instance:
    const confirmModal = new bootstrap.Modal(confirmModalEl, {
        backdrop: 'static',
        keyboard: false
    });
    $('#rebootButton').off('click').on('click', () => {
        openConfirmModal('reboot', confirmModal);
    });
    $('#shutdownButton').off('click').on('click', () => {
        openConfirmModal('shutdown', confirmModal);
    });

    // Hook the Reload button
    $("#systemModal").on("click", ".reload-btn", () => {
        location.reload();
    });

    // Clean up on Exit / X (just unpause, do NOT reload)
    systemModalEl.addEventListener("hidden.bs.modal", () => {
        systemPaused = false;
    });

    //
    // Per-Page Bind Actions
    //

    // Config page bindings
    if (typeof bindIndexActions === "function") {
        bindIndexActions();
    }

    // Log viewer bindings
    if (typeof bindLogViewActions === "function") {
        bindLogViewActions();
    }

    // Spot viewer bindings
    if (typeof bindViewSpotsActions === "function") {
        bindViewSpotsActions();
    }
}

function syncFixedChromeOffsets() {
    const root = document.documentElement;
    const navbar = document.getElementById("mainNavbar");
    const footer = document.querySelector("footer.fixed-bottom");

    if (navbar) {
        const navbarOffset = Math.ceil(navbar.getBoundingClientRect().height);
        if (navbarOffset !== lastNavbarOffset) {
            root.style.setProperty("--navbar-offset", `${navbarOffset}px`);
            lastNavbarOffset = navbarOffset;
        }
    }

    if (footer) {
        const footerOffset = Math.ceil(footer.getBoundingClientRect().height);
        if (footerOffset !== lastFooterOffset) {
            root.style.setProperty("--footer-offset", `${footerOffset}px`);
            lastFooterOffset = footerOffset;
        }
    }
}

function scheduleChromeOffsetSync() {
    if (chromeOffsetSyncHandle !== null) return;

    chromeOffsetSyncHandle = window.requestAnimationFrame(() => {
        chromeOffsetSyncHandle = null;
        syncFixedChromeOffsets();
    });
}

// Initialize on page load: read saved theme, set switch & label
function initThemeToggle() {
    const stored = localStorage.getItem("theme") || "light";
    const isDark = stored === "dark";
    $("#themeToggle").prop("checked", isDark);
    document.documentElement.setAttribute("data-bs-theme", stored);
    updateLabel(isDark);
}

// Update the theme toggle label
function updateLabel(isDark) {
    $("#themeToggleLabel").text(isDark ? "Dark" : "Light");
}

// Handler for clicking the theme toggle
function clickThemeToggle() {
    const isDark = this.checked;
    const newTheme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateLabel(isDark);
}

// Helper to parse a true bool
function parseBool(val, fallback = false) {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return val.toLowerCase() === "true";
    return fallback;
}

// function getConfigSection(obj, key) {
//     if (!obj || typeof obj !== "object") return {};
//     return obj[key] && typeof obj[key] === "object" ? obj[key] : {};
// }

// function getConfigValue(section, key, fallback) {
//     if (!section || typeof section !== "object") return fallback;
//     return section[key] !== undefined ? section[key] : fallback;
// }

function showLoadAlert() {
    const container = document.querySelector(".card-body");
    if (!container) return;

    const alert = document.createElement("div");
    alert.className = "alert alert-warning";
    alert.innerText =
        "Warning: Failed to fully load configuration. Defaults are in use.";

    container.prepend(alert);
}

function recoverFromPopulateConfigFailure() {
    document.querySelectorAll("input, select, button").forEach(el => {
        el.disabled = false;
    });
}

function configTypeMatches(value, expectedType) {
    if (value === undefined || value === null) return true;

    if (expectedType === "number") {
        if (typeof value === "number") {
            return !Number.isNaN(value);
        }

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed === "") return false;
            return !Number.isNaN(Number(trimmed));
        }

        return false;
    }

    if (expectedType === "boolean") {
        return (
            typeof value === "boolean" ||
            value === "true" ||
            value === "false" ||
            value === "1" ||
            value === "0" ||
            value === 1 ||
            value === 0
        );
    }

    if (expectedType === "string") {
        return typeof value === "string";
    }

    return true;
}

function getConfigSection(configJson, name) {
    const section = configJson[name];

    if (section === undefined || section === null) {
        logConfigWarningOnce(
            'Config section "' + name + '" not found. Using defaults.'
        );
        return {};
    }

    if (typeof section !== "object" || Array.isArray(section)) {
        logConfigWarningOnce(
            'Config section "' + name + '" is not an object. Using defaults.'
        );
        return {};
    }

    return section;
}

function getConfigValue(section, sectionName, key, fallback) {
    if (!section || typeof section !== "object") {
        logConfigWarningOnce(
            'Config section "' +
            sectionName +
            '" unavailable while reading "' +
            key +
            '". Using default.'
        );
        return fallback;
    }

    const value = section[key];

    if (value === undefined || value === null) {
        logConfigWarningOnce(
            'Config key "' +
            sectionName +
            "." +
            key +
            '" missing. Using default.'
        );
        return fallback;
    }

    return value;
}

function hasConfigValue(section, key) {
    return !!(
        section &&
        typeof section === "object" &&
        section[key] !== undefined &&
        section[key] !== null
    );
}

function getConfigIntValue(section, sectionName, key, fallback) {
    const rawValue = getConfigValue(section, sectionName, key, fallback);
    const value = parseInt(rawValue, 10);

    if (Number.isNaN(value)) {
        logConfigWarningOnce(
            'Config key "' +
            sectionName +
            "." +
            key +
            '" is not a valid integer. Using default.'
        );
        return fallback;
    }

    return value;
}

function getConfigFloatValue(section, sectionName, key, fallback) {
    const rawValue = getConfigValue(section, sectionName, key, fallback);
    const value = parseFloat(rawValue);

    if (Number.isNaN(value)) {
        logConfigWarningOnce(
            'Config key "' +
            sectionName +
            "." +
            key +
            '" is not a valid number. Using default.'
        );
        return fallback;
    }

    return value;
}

function getConfigBoolValue(section, sectionName, key, fallback) {
    const rawValue = getConfigValue(section, sectionName, key, fallback);

    if (
        rawValue === true ||
        rawValue === false ||
        rawValue === "true" ||
        rawValue === "false" ||
        rawValue === "1" ||
        rawValue === "0" ||
        rawValue === 1 ||
        rawValue === 0
    ) {
        return parseBool(rawValue);
    }

    logConfigWarningOnce(
        'Config key "' +
        sectionName +
        "." +
        key +
        '" is not a valid boolean. Using default.'
    );
    return fallback;
}

function validateConfigSchema(json, schema) {
    Object.keys(schema).forEach(function (sectionName) {
        const sectionRule = schema[sectionName];
        const section = json[sectionName];
        if (sectionRule.disabled) return; // Return early if section is disabled

        if (section === undefined || section === null) {
            if (sectionRule.required) {
                logConfigWarningOnce(
                    'Missing required config section "' + sectionName + '".'
                );
            } else {
                logConfigWarningOnce(
                    'Missing optional config section "' +
                    sectionName +
                    '". Defaults will be used.'
                );
            }
            return;
        }

        if (typeof section !== "object" || Array.isArray(section)) {
            logConfigWarningOnce(
                'Invalid config section "' +
                sectionName +
                '". Expected object. Defaults will be used.'
            );
            return;
        }

        Object.keys(sectionRule.keys).forEach(function (keyName) {
            const keyRule = sectionRule.keys[keyName];
            const value = section[keyName];

            if (value === undefined || value === null) {
                if (keyRule.required) {
                    logConfigWarningOnce(
                        'Missing required config key "' +
                        sectionName +
                        "." +
                        keyName +
                        '".'
                    );
                } else {
                    logConfigWarningOnce(
                        'Missing optional config key "' +
                        sectionName +
                        "." +
                        keyName +
                        '". Default will be used.'
                    );
                }
                return;
            }

            if (!configTypeMatches(value, keyRule.type)) {
                logConfigWarningOnce(
                    'Invalid type for config key "' +
                    sectionName +
                    "." +
                    keyName +
                    '". Expected ' +
                    keyRule.type +
                    ". Default may be used."
                );
            }
        });
    });
}

/**
 * Reload all UI data after communication is restored.
 */
function reloadAllData() {
    debugConsole("debug", "Reloading all UI data after communication recovery.");

    populateConfig(() => {
        if (typeof fetchSpots === "function") {
            fetchSpots();
        }

        if (typeof getTxState === "function") {
            getTxState();
        }
    });
}

function pageHasConnectionAlert() {
    return document.getElementById("connection-alert") !== null;
}

function showConnectionAlert() {
    if (!pageHasConnectionAlert()) {
        return;
    }

    const alertElement = document.getElementById("connection-alert");
    alertElement.hidden = false;
    alertElement.classList.add("show");
}

function hideConnectionAlert() {
    if (!pageHasConnectionAlert()) {
        return;
    }

    const alertElement = document.getElementById("connection-alert");
    alertElement.classList.remove("show");
    alertElement.hidden = true;
}

function shouldShowBackendLossStatus() {
    return pageHasConnectionAlert() && outageBannerArmed && !pageUnloading;
}

function shouldShowWebSocketLossStatus() {
    return pageHasConnectionAlert() && outageBannerArmed && !pageUnloading;
}

function armOutageBannerIfReady() {
    if (backendConnectedOnce && websocketConnectedOnce) {
        outageBannerArmed = true;
    }
}

function syncConnectionAlert() {
    if (!outageBannerArmed || pageUnloading) {
        hideConnectionAlert();
        return;
    }

    if (backendCurrentlyConnected && websocketCurrentlyConnected) {
        hideConnectionAlert();
        return;
    }

    showConnectionAlert();
}

// Data Load
function populateConfig(callback = null) {
    if (populateConfigRunning) return;
    populateConfigRunning = true;

    $.getJSON(SETTINGS_URL)
        .done(function (configJson) {
            try {
                if (!configJson || typeof configJson !== "object") {
                    throw new Error("Invalid JSON data received.");
                }

                backendCurrentlyConnected = true;
                backendConnectedOnce = true;
                armOutageBannerIfReady();
                syncConnectionAlert();

                validateConfigSchema(configJson, configSchema);

                const operation = getConfigSection(configJson, "Operation");
                const gpio = getConfigSection(configJson, "GPIO");
                const calibration = getConfigSection(configJson, "Calibration");
                const si5351 = getConfigSection(configJson, "Si5351");
                const wspr = getConfigSection(configJson, "WSPR");
                const cw = getConfigSection(configJson, "CW");
                const bandGpio = getConfigSection(configJson, "Band GPIO");
                const platform = getConfigSection(configJson, "Platform");

                window.WSPRRYPI_PLATFORM = {
                    model: getConfigValue(platform, "Platform", "Model", ""),
                    raspberryPiGeneration: getConfigIntValue(
                        platform,
                        "Platform",
                        "Raspberry Pi Generation",
                        -1
                    ),
                    gpioClockTransmissionSupported: getConfigBoolValue(
                        platform,
                        "Platform",
                        "GPIO Clock Transmission Supported",
                        true
                    ),
                    gpioClockTransmissionError: getConfigValue(
                        platform,
                        "Platform",
                        "GPIO Clock Transmission Error",
                        ""
                    ),
                    si5351Detected: getConfigBoolValue(
                        platform,
                        "Platform",
                        "Si5351 Detected",
                        true
                    ),
                    si5351DetectionError: getConfigValue(
                        platform,
                        "Platform",
                        "Si5351 Detection Error",
                        ""
                    )
                };

                let mode = getConfigValue(operation, "Operation", "Mode", "WSPR");
                if (!["WSPR", "QRSS", "FSKCW", "DFCW"].includes(mode)) {
                    mode = "WSPR";
                }

                let plannerPreference = getConfigValue(
                    wspr,
                    "WSPR",
                    "Planner Preference",
                    "auto"
                );
                if (
                    plannerPreference !== "auto" &&
                    plannerPreference !== "prefer_paired" &&
                    plannerPreference !== "require_paired"
                ) {
                    plannerPreference = "auto";
                }

                let transmit = getConfigBoolValue(
                    operation,
                    "Operation",
                    "Transmit",
                    false
                );
                let transmitBackend = String(
                    getConfigValue(
                        operation,
                        "Operation",
                        "Transmit Backend",
                        "gpio"
                    ) || "gpio"
                ).toLowerCase();
                if (transmitBackend !== "gpio" && transmitBackend !== "si5351") {
                    transmitBackend = "gpio";
                }
                const callsignWasLoaded = hasConfigValue(wspr, "Call Sign");
                let callsign = getConfigValue(
                    wspr,
                    "WSPR",
                    "Call Sign",
                    "N0CALL"
                );
                if (
                    !callsignWasLoaded &&
                    typeof callsign === "string" &&
                    ["N0CALL", "NXXX"].includes(callsign.toUpperCase())
                ) {
                    logConfigWarningOnce(
                        'Config key "WSPR.Call Sign" is placeholder (' + callsign + ').'
                    );
                }
                const gridSquareWasLoaded = hasConfigValue(wspr, "Grid Square");
                let gridsquare = getConfigValue(
                    wspr,
                    "WSPR",
                    "Grid Square",
                    "ZZ99"
                );
                if (
                    !gridSquareWasLoaded &&
                    typeof gridsquare === "string" &&
                    gridsquare.toUpperCase() === "ZZ99"
                ) {
                    logConfigWarningOnce(
                        'Config key "WSPR.Grid Square" is placeholder (ZZ99).'
                    );
                }
                let dbm = getConfigIntValue(wspr, "WSPR", "TX Power", 0);
                let frequencies = getConfigValue(
                    wspr,
                    "WSPR",
                    "Frequency",
                    "20m"
                );
                let tx_pin = getConfigIntValue(
                    gpio,
                    "GPIO",
                    "Transmit Pin",
                    4
                );
                let use_led = getConfigBoolValue(
                    operation,
                    "Operation",
                    "Use LED",
                    false
                );
                let led_pin = getConfigIntValue(
                    operation,
                    "Operation",
                    "LED Pin",
                    18
                );
                let use_ntp = getConfigBoolValue(
                    gpio,
                    "GPIO",
                    "Use NTP",
                    false
                );
                let ppm = getConfigFloatValue(calibration, "Calibration", "PPM", 0.0);
                let use_offset = getConfigBoolValue(
                    wspr,
                    "WSPR",
                    "Use Random Offset",
                    true
                );
                let power_level = getConfigIntValue(
                    gpio,
                    "GPIO",
                    "Power Level",
                    7
                );
                let si5351I2cBus = getConfigIntValue(
                    si5351,
                    "Si5351",
                    "I2C Bus",
                    1
                );
                let si5351I2cAddressRaw = getConfigValue(
                    si5351,
                    "Si5351",
                    "I2C Address",
                    "0x60"
                );
                let si5351ReferenceFrequency = getConfigIntValue(
                    si5351,
                    "Si5351",
                    "Reference Frequency",
                    27000000
                );
                let si5351PowerLevel = getConfigIntValue(
                    si5351,
                    "Si5351",
                    "Power Level",
                    1
                );
                let use_shutdown = getConfigBoolValue(
                    operation,
                    "Operation",
                    "Use Shutdown",
                    false
                );
                let shutdown_pin = getConfigIntValue(
                    operation,
                    "Operation",
                    "Shutdown Button",
                    19
                );
                let dot_length = getConfigFloatValue(cw, "CW", "Dot Seconds", 3.0);
                let fsk_offset = getConfigFloatValue(cw, "CW", "Shift Hz", 500.0);
                let cw_base_frequency = getConfigFloatValue(cw, "CW", "Base Frequency", 3572000.0);
                let tx_start_minute = getConfigIntValue(cw, "CW", "Start Minute", 0);
                let tx_repeat_every = getConfigIntValue(cw, "CW", "Repeat Minutes", 10);
                let cw_message = getConfigValue(cw, "CW", "Message", "");

                // Operation.Web Port and Operation.Socket Port remain
                // backend-managed settings without visible controls on this
                // page. Selector polarity is modeled per band under
                // Band GPIO.<band>.Active High and per-frequency via
                // @GPIO[H|L] metadata, not as a single GPIO-wide setting.

                // If we are on the config page
                if (window.currentPage == "index.php") {
                    if (typeof suspendConfigAutosave === "function") {
                        suspendConfigAutosave(true);
                    }

                    // Load form elements
                    //
                    if (typeof applyConfigModeSelection === "function") {
                        applyConfigModeSelection(mode);
                    } else if (mode === "WSPR") {
                        $('input[name="mode_toggle"][value="WSPR"]')
                            .prop("checked", true)
                            .trigger("change");
                    } else {
                        $('input[name="mode_toggle"][value="QRSS"]')
                            .prop("checked", true)
                            .trigger("change");
                        $(`input[name="qrss_type"][value="${mode}"]`)
                            .prop("checked", true)
                            .trigger("change");
                    }

                    if (typeof clearOfflineDefaults === "function") {
                        clearOfflineDefaults();
                    }

                    // Hardware Control
                    if (typeof setTransmitFromBackend === "function") {
                        setTransmitFromBackend(transmit);
                    } else {
                        $("#transmit").prop("checked", transmit);
                    }
                    if (typeof updateRuntimeControlConfigStatus === "function") {
                        updateRuntimeControlConfigStatus(mode, transmit);
                    }
                    $("#planner_preference").val(plannerPreference).trigger("change");
                    $("#transmit_backend").val(transmitBackend).trigger("change");
                    if (typeof updateBackendPlatformSupportUi === "function") {
                        updateBackendPlatformSupportUi();
                    }
                    if (typeof setTxPin === "function") {
                        setTxPin(tx_pin);
                    }
                    $("#use_led").prop("checked", use_led).trigger("change");
                    setLEDPin(led_pin);
                    $("#use_shutdown")
                        .prop("checked", use_shutdown)
                        .trigger("change");
                    setShutdownPin(shutdown_pin);
                    if (typeof populateBandGpioForm === "function") {
                        populateBandGpioForm(bandGpio);
                    }

                    // Operator Information
                    $("#callsign").val(callsign).trigger("change");
                    $("#gridsquare").val(gridsquare).trigger("change");

                    // Transmitter Information
                    $("#dbm").val(dbm).trigger("change");
                    $("#frequencies").val(frequencies).trigger("change");
                    $("#useoffset").prop("checked", use_offset).trigger("change");

                    // CW shared non-WSPR configuration
                    $("#dot_length").val(dot_length).trigger("change");
                    $("#fsk_offset").val(fsk_offset).trigger("change");
                    $("#qrss_frequency").val(cw_base_frequency).trigger("change");
                    $("#tx_start_minute").val(tx_start_minute).trigger("change");
                    $("#tx_repeat_every").val(tx_repeat_every).trigger("change");
                    $('#qrss_message').val(cw_message).trigger("change");

                    // Frequency Calibration
                    $("#use_ntp").prop("checked", use_ntp).trigger("change");
                    $("#ppm").val(ppm).trigger("change");
                    $("#ppm_cw").val(ppm).trigger("change");

                    $("#gpio-power-range").val(power_level).trigger("input");
                    $("#si5351_i2c_bus").val(si5351I2cBus).trigger("change");
                    if (typeof setSi5351AddressValue === "function") {
                        setSi5351AddressValue(si5351I2cAddressRaw);
                    } else {
                        $("#si5351_i2c_address").val(si5351I2cAddressRaw).trigger("change");
                    }
                    $("#si5351_reference_frequency")
                        .val(si5351ReferenceFrequency)
                        .trigger("change");
                    $("#si5351-power-range").val(si5351PowerLevel).trigger("input");

                    // Enable the form
                    $("#test_tone").prop("disabled", false);
                    $("#wsprform").prop("disabled", false);

                    validatePage();
                    if (typeof syncConfigAutosaveBaseline === "function") {
                        syncConfigAutosaveBaseline();
                    }
                    if (typeof suspendConfigAutosave === "function") {
                        suspendConfigAutosave(false);
                    }
                } else if (window.currentPage == "view_logs.php") {
                    $("#callsign").val(callsign);
                } else if (window.currentPage == "view_spots.php") {
                    $("#callsign").val(callsign);
                }

                // Do actions after page loaded
                pageLoaded();

                // Run callback if provided
                if (typeof callback === "function") {
                    callback();
                }
            } catch (error) {
                if (window.currentPage == "index.php" &&
                    typeof suspendConfigAutosave === "function") {
                    suspendConfigAutosave(false);
                }
                debugConsole("error", "Error parsing config JSON:", error);
                backendCurrentlyConnected = false;
                syncConnectionAlert();
                if (window.currentPage == "index.php" && shouldShowBackendLossStatus() && typeof setOfflineDefaults === "function") {
                    setOfflineDefaults();
                }
                // Only try to load if the system is *not* paused
                if (!systemPaused) {
                    pendingPopulateConfigTimeout = setTimeout(
                        function () {
                            populateConfig(callback);
                        },
                        10000
                    );
                }
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (window.currentPage == "index.php" &&
                typeof suspendConfigAutosave === "function") {
                suspendConfigAutosave(false);
            }
            debugConsole(
                "error",
                "Error fetching config JSON:",
                textStatus,
                errorThrown
            );
            backendCurrentlyConnected = false;
            syncConnectionAlert();
            if (window.currentPage == "index.php" && shouldShowBackendLossStatus() && typeof setOfflineDefaults === "function") {
                setOfflineDefaults();
            }
            // Only try to load if the system is *not* paused
            if (!systemPaused) {
                pendingPopulateConfigTimeout = setTimeout(
                    function () {
                        populateConfig(callback);
                    },
                    10000
                );
            }
        })
        .always(function () {
            populateConfigRunning = false;
        });
}

function resetToolTips(e) {
    const el = e.currentTarget;
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.hide();
}

/**
 * Update the connection-status icon and its tooltip.
 *
 * @param {'disconnected'|'connecting'|'connected'|'transmitting'} state
 * @param {string} [timestamp]  Optional timestamp for “transmitting”
 */
function setConnectionState(state, timestamp = "") {
    const icon = document.getElementById("connIcon");
    if (!icon) return;

    // Remove old state classes
    icon.classList.remove(
        "state-disconnected",
        "state-connecting",
        "state-connected",
        "state-transmitting"
    );

    // Add the new one
    icon.classList.add(`state-${state}`);

    // Choose the tooltip text
    let text;
    switch (state) {
        case "disconnected":
            text = "Controller disconnected.";
            break;
        case "connecting":
            text = "Connecting to controller…";
            break;
        case "connected":
            text = "Controller connected.";
            break;
        case "transmitting":
            text = `Transmission in progress${timestamp ? ": " + timestamp : "."}`;
            break;
        default:
            text = "";
    }

    // Update Bootstrap’s tooltip data attr (do NOT set title)
    icon.setAttribute("data-bs-original-title", text);

    // Remove the native title so the browser never shows it
    icon.removeAttribute("title");

    // (Re)initialize or fetch the Tooltip instance, then update its content
    let inst = bootstrap.Tooltip.getInstance(icon);
    if (!inst) {
        inst = new bootstrap.Tooltip(icon, { trigger: "hover" });
    }
    inst.setContent({ ".tooltip-inner": text });
}

function normalizeRuntimeStatus(msg) {
    if (!msg || typeof msg !== "object") {
        return null;
    }

    const planType = typeof msg.plan_type === "string" ? msg.plan_type : "";
    const frameCount = Number.isFinite(Number(msg.frame_count))
        ? Number(msg.frame_count)
        : 0;
    const currentFrame = Number.isFinite(Number(msg.current_frame))
        ? Number(msg.current_frame)
        : 0;
    const cwActiveCharIndex = Number.isInteger(Number(msg.cw_active_char_index))
        ? Number(msg.cw_active_char_index)
        : -1;

    return {
        txState:
            typeof msg.tx_state === "string"
                ? msg.tx_state
                : (typeof msg.state === "string" ? msg.state : ""),
        runtimeMode:
            typeof msg.runtime_mode === "string" ? msg.runtime_mode : "",
        planType,
        frameCount,
        currentFrame,
        callsignRaw: typeof msg.callsign_raw === "string" ? msg.callsign_raw : "",
        callsignNormalized:
            typeof msg.callsign_normalized === "string" ? msg.callsign_normalized : "",
        locatorRaw: typeof msg.locator_raw === "string" ? msg.locator_raw : "",
        locatorNormalized:
            typeof msg.locator_normalized === "string" ? msg.locator_normalized : "",
        frameCallsign: typeof msg.frame_callsign === "string" ? msg.frame_callsign : "",
        frameLocator: typeof msg.frame_locator === "string" ? msg.frame_locator : "",
        cwMessage: typeof msg.cw_message === "string" ? msg.cw_message : "",
        cwActiveCharIndex,
        timestamp: typeof msg.timestamp === "string" ? msg.timestamp : ""
    };
}

function renderRuntimeStatus(status) {
    renderRuntimeControlStatus();
}

function applyRuntimeStatus(msg) {
    const status = normalizeRuntimeStatus(msg);
    if (!status) {
        return;
    }

    currentRuntimeStatus = status;
    if (status.runtimeMode) {
        currentRuntimeConfigStatus.mode = status.runtimeMode;
    }
    renderRuntimeStatus(currentRuntimeStatus);
}

function updateRuntimeControlConfigStatus(mode, transmitEnabled) {
    if (typeof mode === "string" && mode) {
        currentRuntimeConfigStatus.mode = mode;
    }

    if (transmitEnabled !== undefined && transmitEnabled !== null) {
        currentRuntimeConfigStatus.transmitEnabled = !!transmitEnabled;
    }

    renderRuntimeControlStatus();
}

function renderRuntimeControlStatus() {
    const modeNode = document.getElementById("runtime_mode_value");
    const planLabelNode = document.getElementById("runtime_plan_label");
    const planNode = document.getElementById("runtime_wspr_plan_value");

    if (typeof syncStopButtonState === "function") {
        syncStopButtonState();
    }

    if (modeNode) {
        modeNode.textContent = currentRuntimeConfigStatus.mode || "Unknown";
    }

    if (!planNode) {
        return;
    }

    const currentMode = currentRuntimeConfigStatus.mode || "";
    if (currentMode === "QRSS" || currentMode === "FSKCW" || currentMode === "DFCW") {
        if (planLabelNode) {
            planLabelNode.textContent = "Message";
        }

        const configuredMessage = document.getElementById("qrss_message");
        const fallbackMessage =
            configuredMessage && typeof configuredMessage.value === "string"
                ? configuredMessage.value.trim()
                : "";
        const message =
            currentRuntimeStatus && currentRuntimeStatus.cwMessage
                ? currentRuntimeStatus.cwMessage
                : fallbackMessage;
        const activeCharIndex =
            currentRuntimeStatus &&
            currentRuntimeStatus.txState === "transmitting" &&
            Number.isInteger(currentRuntimeStatus.cwActiveCharIndex)
                ? currentRuntimeStatus.cwActiveCharIndex
                : -1;

        renderCwRuntimeMessage(planNode, message, activeCharIndex);
        planNode.setAttribute("title", message || "No CW message configured.");
        return;
    }

    if (planLabelNode) {
        planLabelNode.textContent = "Current WSPR plan";
    }

    if (
        currentMode !== "WSPR" ||
        !currentRuntimeStatus ||
        !currentRuntimeStatus.planType
    ) {
        planNode.textContent = "Not available";
        planNode.setAttribute("title", "");
        return;
    }

    let summary = currentRuntimeStatus.planType;
    if (currentRuntimeStatus.frameCount > 1 && currentRuntimeStatus.currentFrame > 0) {
        summary += ` F${currentRuntimeStatus.currentFrame}/${currentRuntimeStatus.frameCount}`;
    }

    const frameIdentity = [
        currentRuntimeStatus.frameCallsign,
        currentRuntimeStatus.frameLocator
    ]
        .filter(Boolean)
        .join(" ");
    if (frameIdentity) {
        summary += ` ${frameIdentity}`;
    }

    const overallIdentity = [
        currentRuntimeStatus.callsignNormalized,
        currentRuntimeStatus.locatorNormalized
    ]
        .filter(Boolean)
        .join(" ");
    const titleParts = [summary];
    if (overallIdentity) {
        titleParts.push(`Overall: ${overallIdentity}`);
    }
    if (
        currentRuntimeStatus.callsignRaw &&
        currentRuntimeStatus.locatorRaw &&
        (currentRuntimeStatus.callsignRaw !== currentRuntimeStatus.callsignNormalized ||
            currentRuntimeStatus.locatorRaw !== currentRuntimeStatus.locatorNormalized)
    ) {
        titleParts.push(`Raw: ${currentRuntimeStatus.callsignRaw} ${currentRuntimeStatus.locatorRaw}`);
    }
    if (currentRuntimeStatus.timestamp) {
        titleParts.push(`Updated: ${currentRuntimeStatus.timestamp}`);
    }

    planNode.textContent = summary;
    planNode.setAttribute("title", titleParts.join(" | "));
}

function renderCwRuntimeMessage(node, message, activeCharIndex) {
    node.replaceChildren();

    const container = document.createElement("div");
    container.className = "config-runtime-cw-message";

    if (!message) {
        container.textContent = "Not available";
        node.appendChild(container);
        return;
    }

    const messageNode = document.createElement("div");
    messageNode.className = "config-runtime-cw-message__text";

    Array.from(message).forEach((character, index) => {
        const charNode = document.createElement("span");
        charNode.className = "config-runtime-cw-message__char";
        const isActive = index === activeCharIndex;
        if (isActive) {
            charNode.classList.add("is-active");
        }
        charNode.textContent = isActive && character === " " ? "_" : character;
        messageNode.appendChild(charNode);
    });

    container.appendChild(messageNode);
    node.appendChild(container);
}

function getCallerLocation() {
    try {
        const err = new Error();
        const stack = err.stack?.split('\n');

        if (!stack || stack.length < 3) return '';

        // stack[0] = "Error"
        // stack[1] = this function (getCallerLocation)
        // stack[2] = debugConsole
        // stack[3] = actual caller
        const callerLine = stack[3] || stack[2];

        // Chrome format: "    at func (file:line:col)"
        // Firefox: "func@file:line:col"
        const match = callerLine.match(/(?:at\s+)?(.*?)(?:\s+\(|@)(.*):(\d+):\d+\)?/);

        if (!match) return '';

        const func = match[1];
        const file = match[2].split('/').pop();
        const line = match[3];

        return `${func} ${file}:${line}`;
    } catch {
        return '';
    }
}

const CALLER_LOCATION_WIDTH = 36;

const LOG_LEVEL_STYLES = {
    debug: "color: #1f6feb; font-weight: 600;",
    log: "color: #57606a; font-weight: 600;",
    warn: "color: #9a6700; font-weight: 600;",
    error: "color: #cf222e; font-weight: 700;"
};

function normalizeCallerLocation(location) {
    const normalized = typeof location === "string" ? location.trim() : "";

    if (!normalized) {
        return "";
    }

    const lowered = normalized.toLowerCase();
    if (
        lowered === "<anonymous>" ||
        lowered.includes("debugger eval code:") ||
        lowered.includes("eval code:") ||
        lowered.includes("eval at ")
    ) {
        return "";
    }

    return normalized;
}

function formatCallerLocation(location, width = CALLER_LOCATION_WIDTH) {
    const normalized = normalizeCallerLocation(location);

    if (!normalized) {
        return "";
    }

    if (normalized.length > width) {
        if (width <= 3) {
            return normalized.slice(-width);
        }

        return "..." + normalized.slice(-(width - 3));
    }
    return normalized.padEnd(width, " ");
}

/**
 * Logs at the specified level, if it meets or exceeds the
 * configured CONSOLE_LOG_LEVEL.
 *
 * @param {'debug'|'log'|'warn'|'error'} method
 *   The console method to invoke.
 * @param  {...any} args
 *   The message (or messages) to log.
 */
function debugConsole(method, ...args) {
    const levels = ["debug", "log", "warn", "error"];
    const threshold = String(CONSOLE_LOG_LEVEL || "debug").toLowerCase();
    const thresholdIndex = levels.indexOf(threshold);
    const currentLevelIndex = thresholdIndex >= 0 ? thresholdIndex : 0;
    const m = String(method).toLowerCase();
    const methodIndex = levels.indexOf(m);
    const validMethod = methodIndex >= 0 ? m : "log";

    if (methodIndex < currentLevelIndex) {
        return;
    }

    const tags = {
        debug: "[DEBUG]",
        log: "[LOG  ]",
        warn: "[WARN ]",
        error: "[ERROR]"
    };

    const tag = tags[validMethod];
    const consoleMethod =
        typeof console.log === 'function'
            ? console.log.bind(console)
            : null;

    if (!consoleMethod) {
        return;
    }

    const includeLocation =
        validMethod === "debug" ||
        validMethod === "warn" ||
        validMethod === "error";
    let location = "";

    if (includeLocation) {
        try {
            location = normalizeCallerLocation(getCallerLocation());
        } catch {
            location = "";
        }
    }

    const callerField = formatCallerLocation(location);
    const prefix = callerField ? `${callerField} ` : "";
    const style = LOG_LEVEL_STYLES[validMethod] || "";

    try {
        consoleMethod(`%c${tag}%c ${prefix}`, style, "", ...args);
    } catch {
        const fallbackArgs =
            prefix ? [tag, callerField, ...args] : [tag, ...args];
        consoleMethod(...fallbackArgs);
    }
}

/**
 * connectWebSocket
 * ----------------
 * Opens a WebSocket to the same host on the given port, updates the UI
 * connection state via setConnectionState(), and automatically reconnects
 * if the socket closes or errors out.
 *
 * @param {string} url
 *   The TCP port on which the WebSocket server is listening.
 * @param {number} [reconnectDelay=5000]
 *   Milliseconds to wait before trying to reconnect after a close or error.
 */
function connectWebSocket(url, reconnectDelay = 5000) {
    // Notify the UI we’re attempting to connect
    setConnectionState("connecting");
    debugConsole("debug", `WebSocket ▶️ connecting to ${url}`);

    // Create the WebSocket
    ws = new WebSocket(url);
    // On open: update UI and log
    ws.addEventListener("open", () => {
        debugConsole("debug", "WebSocket ▶️ open");
        websocketCurrentlyConnected = true;
        websocketConnectedOnce = true;
        armOutageBannerIfReady();
        setConnectionState("connected");

        const $reload = $("#systemModal .reload-btn");
        if ($reload.is(":visible")) {
            $("#systemModalBody").text("System has restarted, reload page.");
            $reload.prop("disabled", false);
        }

        if (reloadAfterReconnectPending) {
            reloadAfterReconnectPending = false;
            communicationInterrupted = false;
            reloadAllData();
        } else if (communicationInterrupted) {
            communicationInterrupted = false;
            reloadAllData();
        } else {
            getTxState();
            syncConnectionAlert();
            if (window.currentPage == "index.php" && typeof clearOfflineDefaults === "function") {
                clearOfflineDefaults();
            }
        }
    });

    // On message: Try to parse JSON and react to “transmitting” or
    // "tx_state" state
    ws.addEventListener("message", (ev) => {
        debugConsole("debug", "WebSocket ◀️ message:", ev.data);
        let msg;
        try {
            msg = JSON.parse(ev.data);
        } catch (err) {
            debugConsole("warn", "WebSocket ⚠️ invalid JSON:", err);
            return;
        }

        if (msg.command === "stop") {
            if (typeof handleStopCommandResponse === "function") {
                handleStopCommandResponse(msg);
            }
            return;
        }

        // If the server pushes a “transmit” event:
        if (msg.type === "transmit") {
            applyRuntimeStatus(msg);
            if (msg.state === "starting" || msg.tx_state === "transmitting") {
                const ts = new Date(msg.timestamp);
                setConnectionState("transmitting", ts);
                debugConsole(
                    "debug",
                    "Received transmit event:",
                    msg.state,
                    "tx_state=",
                    msg.tx_state,
                    "at",
                    ts.toString()
                );
            } else if (msg.state === "finished") {
                setConnectionState("connected");
                debugConsole(
                    "debug",
                    "Transmit finished at:",
                    new Date(msg.timestamp).toString()
                );
            } else if (
                msg.state === "canceled" ||
                msg.state === "skipped" ||
                msg.state === "stopped"
            ) {
                setConnectionState("connected");
                debugConsole(
                    "debug",
                    "Received transmit event:",
                    msg.state,
                    "tx_state=",
                    msg.tx_state
                );
            }
            return;
        }

        // If the server is replying to our get_tx_state command:
        if (msg.tx_state !== undefined) {
            applyRuntimeStatus(msg);
            setConnectionState(msg.tx_state === "transmitting" ? "transmitting" : "connected");
            debugConsole("debug", "Received tx_state reply:", msg.tx_state);
            return;
        }
        // {"state":"reload","timestamp":"2025-04-27T22:25:43Z","type":"configuration"}
        if (msg.type === "configuration" && msg.state === "reload") {
            // Clear any pending retry
            if (pendingPopulateConfigTimeout) {
                clearTimeout(pendingPopulateConfigTimeout);
                pendingPopulateConfigTimeout = null;
            }

            // Reload if it’s been more than 2 min since our last save
            const now = Date.now();
            if (!lastSaveTimestamp || now - lastSaveTimestamp > 2 * 60 * 1000) {
                debugConsole("debug", "Reloading config by notification.");
                populateConfig();
            }
        }

        if (msg.type === "configuration" && msg.state === "reload_failed") {
            const message =
                typeof msg.message === "string" && msg.message.trim()
                    ? msg.message.trim()
                    : "Configuration reload failed.";
            const formattedMessage =
                typeof formatReloadFailureMessage === "function"
                    ? formatReloadFailureMessage(message)
                    : message;
            if (typeof showBackendStatus === "function") {
                showBackendStatus(formattedMessage, "danger", "runtime");
            }
            alert(formattedMessage);
        }

        // …any other message types…
    });

    // On error: Log and treat as a disconnection
    ws.addEventListener("error", (err) => {
        debugConsole("error", "WebSocket ❌ error", err);
        communicationInterrupted = true;
        reloadAfterReconnectPending = true;
        websocketCurrentlyConnected = false;
        setConnectionState("disconnected");
        syncConnectionAlert();
    });

    // On close: Schedule a reconnect
    ws.addEventListener("close", (ev) => {
        debugConsole(
            "debug",
            `WebSocket 🔌 closed (code=${ev.code}), reconnecting in ${reconnectDelay}ms`
        );
        communicationInterrupted = true;
        reloadAfterReconnectPending = true;
        websocketCurrentlyConnected = false;
        setConnectionState("disconnected");
        syncConnectionAlert();

        if (!systemPaused) {
            setTimeout(() => connectWebSocket(url, reconnectDelay), reconnectDelay);
        }
    });

    // Return the socket in case the caller wants to send or inspect it
    return ws;
}

/**
 * Request the current transmit state from the server.
 * Server should reply with JSON: { tx_state: true|false }
 */
function getTxState() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: "get_tx_state" }));
    } else {
        debugConsole("warn", "WebSocket not open; cannot request TX state.");
    }
}

function updateCallsign(forceCallsign) {
    // This function is used across multiple pages. Not all pages include the
    // callsign input, so guard all DOM access to avoid exceptions.
    const $link = $("#wsprnet-link");
    if (!$link.length) {
        return;
    }

    const $text = $link.find(".ms-2");
    const $cs = $("#callsign");
    const isLightweightCallsign = function (value) {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if (!trimmed || /\s/.test(trimmed)) {
            return false;
        }

        return /^(?:[A-Za-z0-9/]+|<[A-Za-z0-9/]+>)$/.test(trimmed);
    };

    let callsign = "";

    if (typeof forceCallsign === "string") {
        callsign = forceCallsign.trim();
    } else if ($cs.length && typeof $cs.val() === "string") {
        callsign = $cs.val().trim();
    } else if (window.config && typeof window.config.callsign === "string") {
        callsign = window.config.callsign.trim();
    }

    const isValid = isLightweightCallsign(callsign);

    if ((isValid || !$cs.length) && callsign !== "") {
        $link
            .attr("href", WSPRNET_URL + encodeURIComponent(callsign))
            .attr("title", `${callsign} on WSPRNet`);

        if ($text.length) {
            $text.text(`${callsign} on WSPRNet`);
        }
    } else {
        $link.attr("href", WSPRNET_URL).attr("title", "WSPRNet Database");
        if ($text.length) {
            $text.text("WSPRNet Database");
        }
    }

    // Update Spots For page card header
    if (typeof refreshSpotsHeader === "function") {
        refreshSpotsHeader();
    }
}

function updateWsprryPiVersion() {
    let versionElement = document.getElementById("versionText");

    if (!versionElement) {
        debugConsole("error", "Version element not found.");
        return;
    }

    $.getJSON(VERSION_URL)
        .done(function (response) {
            if (response && response.wspr_version) {
                versionElement.textContent = response.wspr_version;
                versionElement.title = response.wspr_version;
            } else {
                versionElement.textContent = "Service unavailable";
                versionElement.removeAttribute("title");
                debugConsole("error", "Invalid JSON format from version.");
            }
            syncFixedChromeOffsets();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            versionElement.textContent = "Service unavailable";
            versionElement.removeAttribute("title");

            debugConsole(
                "error",
                "Error fetching WSPR version: "
                + textStatus
                + (errorThrown ? " (" + errorThrown + ")" : "")
            );
            syncFixedChromeOffsets();
        });
}

function updateClocks() {
    const now = new Date();
    // Format HH:MM:SS
    const pad = (n) => String(n).padStart(2, "0");
    const local = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map(pad)
        .join(":");
    const utc = [now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()]
        .map(pad)
        .join(":");

    // only write the times themselves
    document.getElementById("localTime").textContent = local;
    document.getElementById("utcTime").textContent = utc;

    // schedule next update right after the next full second
    const delay = 1000 - now.getMilliseconds();
    setTimeout(updateClocks, delay);
}

/**
 * toggleButtonLoading
 * -------------------
 * Show just a spinner in the button without changing its width,
 * then restore original text & width when done.
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 */
function toggleButtonLoading(btn, isLoading) {
    if (isLoading) {
        // first time only: save original HTML and width
        if (!btn.dataset.origHtml) {
            btn.dataset.origHtml = btn.innerHTML;
            btn.dataset.origWidth = btn.offsetWidth;
        }

        // freeze the width so it doesn't collapse
        btn.style.width = btn.dataset.origWidth + "px";
        btn.disabled = true;

        // show only the spinner
        btn.innerHTML =
            `<span class="spinner-border spinner-border-sm" role="status" ` +
            `aria-hidden="true"></span>`;
    } else {
        // restore text, unfreeze width, re-enable
        btn.innerHTML = btn.dataset.origHtml;
        btn.style.width = ""; // clear the inline width
        btn.disabled = false;

        // clean up our temporary data
        delete btn.dataset.origHtml;
        delete btn.dataset.origWidth;
    }
}

function bindTestToneControls() {
    const $modalEl = $("#testToneModal");
    if (!$modalEl.length) {
        return;
    }

    $("#test_tone").off(".testTone").on("click.testTone", clickTestTone);
    $("#testToneStart").off(".testTone").on("click.testTone", onTestToneStart);
    $("#testToneEnd").off(".testTone").on("click.testTone", onTestToneEnd);
    $modalEl.off("hidden.bs.modal.testTone").on("hidden.bs.modal.testTone", onTestToneEnd);
}

function clickTestTone(e) {
    e.preventDefault();
    const btn = this;
    toggleButtonLoading(btn, true);
    setTimeout(() => {
        toggleButtonLoading(btn, false);
    }, 500);
    $("#testToneStart").prop("disabled", false);
    $("#testToneEnd").prop("disabled", true);
    $("#testToneClose").prop("disabled", false);
    const modalEl = document.getElementById("testToneModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function onTestToneStart(e) {
    e.preventDefault();
    const btn = this;
    toggleButtonLoading(btn, true);
    $("#testToneStart").prop("disabled", true);
    $("#testToneEnd").prop("disabled", true);
    debugConsole("debug", "Test tone start.");
    sendCommand("tone_start");
    setTimeout(() => {
        toggleButtonLoading(btn, false);
        $("#testToneStart").prop("disabled", true);
        $("#testToneEnd").prop("disabled", false);
    }, 500);
}

function onTestToneEnd(e) {
    e.preventDefault();
    const btn = this;
    toggleButtonLoading(btn, true);
    $("#testToneStart").prop("disabled", true);
    $("#testToneEnd").prop("disabled", true);
    debugConsole("debug", "Test tone end.");
    sendCommand("tone_end");
    setTimeout(() => {
        toggleButtonLoading(btn, false);
        $("#testToneStart").prop("disabled", false);
        $("#testToneEnd").prop("disabled", true);
    }, 500);
}


/**
 * Send a JSON “command” message over the WebSocket.
 *
 * @param {any} payload
 *   Anything serializable — e.g. a string, object, number, etc.
 */
function sendCommand(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const msg = { command: payload };
        const json = JSON.stringify(msg);
        ws.send(json);
        debugConsole("debug", "WebSocket ▶️ command sent:", json);
    } else {
        debugConsole("warn", "WebSocket not open; cannot send command:", payload);
    }
}

// Show the system modal for reboot
function handleRebootClick() {
    showSystemModal("reboot");
}

// Show the system modal for shutdown
function handleShutdownClick() {
    showSystemModal("shutdown");
}

// Reload the page
function handleSystemReload() {
    location.reload();
}

// When the system modal finishes hiding
function handleSystemModalHidden() {
    systemPaused = false;
    connectWebSocket(WEBSOCKET_URL, WS_RECONNECT);
    setTimeout(populateConfig, 10000);
}

/**
 * showSystemModal
 * ----------------
 * Shows the “shutdown” or “reboot” modal.
 * - On shutdown: hides Reload button; Exit/X closes the tab.
 * - On reboot: shows Reload button, disabled until WS reconnects; Exit/X hides modal and restarts services.
 *
 * @param {'shutdown'|'reboot'} action
 * @param {boolean} [pause=true]
 */
function showSystemModal(action, pause = true) {
    const msgs = {
        shutdown: "System shutdown has been initiated.",
        reboot: "System reboot has been initiated.",
    };
    const message = msgs[action] || "Action initiated.";

    if (pause) systemPaused = true;
    $("#systemModalBody").text(message);

    const modalEl = document.getElementById("systemModal");
    const sysModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: "static",
        keyboard: !pause,
    });

    const $reloadBtn = $(modalEl).find(".reload-btn");

    if (action === "shutdown") {
        $reloadBtn.hide();
    } else {
        $reloadBtn
            .show()
            .prop("disabled", true) // start disabled
            .off("click")
            .on("click", (e) => {
                e.preventDefault();
                location.reload();
            });
    }

    // Exit button handler
    $(modalEl)
        .off("click", ".exit-btn")
        .on("click", ".exit-btn", () => {
            if (action === "shutdown") {
                window.close();
            } else {
                sysModal.hide();
            }
        });

    // X (hidden) handler
    $(modalEl)
        .off("hidden.bs.modal")
        .on("hidden.bs.modal", () => {
            if (action === "shutdown") {
                window.close();
            } else {
                systemPaused = false;
                connectWebSocket(WEBSOCKET_URL, WS_RECONNECT);
                setTimeout(populateConfig, 10000);
            }
        });

    sysModal.show();
}

// Show the “Are you sure?” question
function openConfirmModal(action, confirmModal) {
    pendingSystemAction = action;
    const msg = action === 'reboot'
        ? 'Are you sure you want to reboot the system?'
        : 'Are you sure you want to shut down the system?';
    document.getElementById('confirmModalBody').textContent = msg;

    // configure the confirm button
    $('#confirmActionBtn')
        .off('click')
        .on('click', () => {
            confirmModal.hide();
            // now actually do it
            if (action === 'reboot') {
                showSystemModal('reboot', false);
            } else {
                showSystemModal('shutdown', true);
            }
            sendCommand(action);
        });

    confirmModal.show();
}
