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

// Allow reloading data after communication interruption
let communicationInterrupted = false;
let reloadAfterReconnectPending = false;
let backendConnectedOnce = false;
let websocketConnectedOnce = false;
let outageBannerArmed = false;
let pageUnloading = false;

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
    Meta: {
        required: false,
        keys: {
            "Mode": { required: false, type: "string" }
        }
    },
    Control: {
        required: false,
        keys: {
            "Transmit": { required: false, type: "boolean" }
        }
    },
    Common: {
        required: false,
        keys: {
            "Call Sign": { required: false, type: "string" },
            "Grid Square": { required: false, type: "string" },
            "TX Power": { required: false, type: "number" },
            "Frequency": { required: false, type: "string" },
            "Transmit Pin": { required: false, type: "number" }
        }
    },
    QRSS: {
        disabled: true, // Not yet in use
        required: false,
        keys: {
            "QRSS Mode": { required: false, type: "string" },
            "Dot Length": { required: false, type: "number" },
            "FSK Offset": { required: false, type: "number" },
            "QRSS Frequency": { required: false, type: "number" },
            "TX Start Minute": { required: false, type: "number" },
            "TX Repeat Every": { required: false, type: "number" },
            "Message": { required: false, type: "string" }
        }
    },
    Extended: {
        required: false,
        keys: {
            "Use LED": { required: false, type: "boolean" },
            "LED Pin": { required: false, type: "number" },
            "Use NTP": { required: false, type: "boolean" },
            "PPM": { required: false, type: "number" },
            "Offset": { required: false, type: "boolean" },
            "Power Level": { required: false, type: "number" }
        }
    },
    Server: {
        required: false,
        keys: {
            "Use Shutdown": { required: false, type: "boolean" },
            "Shutdown Button": { required: false, type: "number" }
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
    setConnectionState("disconnected");
    connectWebSocket(WEBSOCKET_URL, WS_RECONNECT);
    updateClocks();
    if (typeof initLogStream === "function") {
        initLogStream();
    }
    populateConfig();
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

function shouldShowBackendLossStatus() {
    return window.currentPage == "index.php" && outageBannerArmed && !pageUnloading;
}

function shouldShowWebSocketLossStatus() {
    return window.currentPage == "index.php" && outageBannerArmed && !pageUnloading;
}

function armOutageBannerIfReady() {
    if (backendConnectedOnce && websocketConnectedOnce) {
        outageBannerArmed = true;
    }
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

                backendConnectedOnce = true;
                armOutageBannerIfReady();

                validateConfigSchema(configJson, configSchema);

                const meta = getConfigSection(configJson, "Meta");
                const control = getConfigSection(configJson, "Control");
                const common = getConfigSection(configJson, "Common");
                // A guard while we implement
                let qrss = {};
                if (configJson.QRSS) {
                    qrss = getConfigSection(configJson, "QRSS");
                }
                const extended = getConfigSection(configJson, "Extended");
                const server = getConfigSection(configJson, "Server");
                const bandGpio = getConfigSection(configJson, "Band GPIO");

                // Safely assign values from JSON to temporary elements
                //
                // [Meta]
                let mode = getConfigValue(meta, "Meta", "Mode", "WSPR");
                // let mode = configJson["Meta"]["Mode"] || "WSPR";
                // [Control]
                let transmit = getConfigBoolValue(
                    control,
                    "Control",
                    "Transmit",
                    false
                );
                // [Common]
                let callsign = getConfigValue(
                    common,
                    "Common",
                    "Call Sign",
                    "N0CALL"
                );
                if (
                    typeof callsign === "string" &&
                    ["N0CALL", "NXXX"].includes(callsign.toUpperCase())
                ) {
                    logConfigWarningOnce(
                        'Config key "Common.Call Sign" is placeholder (' + callsign + ').'
                    );
                }
                let gridsquare = getConfigValue(
                    common,
                    "Common",
                    "Grid Square",
                    "ZZ99"
                );
                if (typeof gridsquare === "string" && gridsquare.toUpperCase() === "ZZ99") {
                    logConfigWarningOnce(
                        'Config key "Common.Grid Square" is placeholder (ZZ99).'
                    );
                }
                let dbm = getConfigIntValue(common, "Common", "TX Power", 0);
                let frequencies = getConfigValue(
                    common,
                    "Common",
                    "Frequency",
                    "20m"
                );
                let tx_pin = getConfigIntValue(
                    common,
                    "Common",
                    "Transmit Pin",
                    4
                );
                // [QRSS]
                // let qrss_type = configJson["QRSS"]["QRSS Mode"] || "QRSS";
                // let dot_length = parseInt(configJson["QRSS"]["Dot Length"]) || 10;
                // let fsk_offset = parseInt(configJson["QRSS"]["FSK Offset"]) || 10;
                // let qrss_frequency = parseFloat(configJson["QRSS"]["QRSS Frequency"]) || 7039900.0;
                // let tx_start_minute = parseInt(configJson["QRSS"]["TX Start Minute"]) || 0;
                // let tx_repeat_every = parseInt(configJson["QRSS"]["TX Repeat Every"]) || 10;
                // let qrss_message_content = configJson["QRSS"]["Message"] || "AA0NT EM18";
                // [Extended]
                let use_led = getConfigBoolValue(
                    extended,
                    "Extended",
                    "Use LED",
                    false
                );
                let led_pin = getConfigIntValue(
                    extended,
                    "Extended",
                    "LED Pin",
                    18
                );
                let use_ntp = getConfigBoolValue(
                    extended,
                    "Extended",
                    "Use NTP",
                    false
                );
                let ppm = getConfigFloatValue(extended, "Extended", "PPM", 0.0);
                let use_offset = getConfigBoolValue(
                    extended,
                    "Extended",
                    "Offset",
                    true
                );
                let power_level = getConfigIntValue(
                    extended,
                    "Extended",
                    "Power Level",
                    0
                );
                // [Server]
                let use_shutdown = getConfigBoolValue(
                    server,
                    "Server",
                    "Use Shutdown",
                    false
                );
                let shutdown_pin = getConfigIntValue(
                    server,
                    "Server",
                    "Shutdown Button",
                    19
                );
                // let web_port = parseInt(configJson["Server"]["Web Port"]) || 3145;
                // let socket_port = parseInt(configJson["Server"]["Socket Port"]) || 3146;
                // [Meta]
                // let center_frequency_set = parseFloat(configJson["Meta"]["Center Frequency Set"]) || 0.0;
                // let date_time_log = parseBool(configJson["Meta"]["Date Time Log"]);
                // let use_ini = parseBool(configJson["Meta"]["Use INI"]);
                // let ini_file_name = configJson["Meta"]["INI Filename"] || "/usr/local/etc/wsprrypi.ini";
                // let loop_tx = parseBool(configJson["Meta"]["Loop TX"]);
                // let tx_iter = parseInt(configJson["Meta"]["TX Iterations"]) || 0;
                // let test_tone = parseFloat(configJson["Meta"]["Test Tone"]) || 14097100.0;

                // Prevent unused variable warning while keeping the documented assignment
                void qrss;
                void tx_pin;

                // If we are on the config page
                if (window.currentPage == "index.php") {
                    // Load form elements
                    //
                    // Meta
                    if (mode === "QRSS") {
                        // Set to QRSS
                        $('input[name="mode_toggle"][value="QRSS"]')
                            .prop("checked", true)
                            .trigger("change");
                    } else {
                        // Set to WSPR
                        $('input[name="mode_toggle"][value="WSPR"]')
                            .prop("checked", true)
                            .trigger("change");
                    }

                    if (typeof clearOfflineDefaults === "function") {
                        clearOfflineDefaults();
                    }

                    // Hardware Control
                    $("#transmit").prop("checked", transmit).trigger("change");
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

                    // QRSS Information
                    // $(`input[name="qrss_type"][value="${qrss_type}"]`).prop("checked", true).trigger("change");
                    // $("#dot_length").val(dot_length).trigger("change");
                    // $("#fsk_offset").val(fsk_offset).trigger("change");
                    // $("#qrss_frequency").val(qrss_frequency).trigger("change");
                    // $("#tx_start_minute").val(tx_start_minute).trigger("change");
                    // $("#tx_repeat_every").val(tx_repeat_every).trigger("change");
                    // $('#qrss_message').val(qrss_message_content).trigger("change");

                    // Frequency Calibration
                    $("#use_ntp").prop("checked", use_ntp).trigger("change");
                    $("#ppm").val(ppm).trigger("change");

                    // Transmit Power
                    $("#tx-power-range").val(power_level).trigger("input");

                    // Enable the form
                    $("#submit").prop("disabled", false);
                    $("#reset").prop("disabled", false);
                    $("#test_tone").prop("disabled", false);
                    $("#wsprform").prop("disabled", false);

                    validatePage();
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
                debugConsole("error", "Error parsing config JSON:", error);
                if (shouldShowBackendLossStatus() && typeof setOfflineDefaults === "function") {
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
            debugConsole(
                "error",
                "Error fetching config JSON:",
                textStatus,
                errorThrown
            );
            if (shouldShowBackendLossStatus() && typeof setOfflineDefaults === "function") {
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
            text = "Disconnected.";
            break;
        case "connecting":
            text = "Connecting…";
            break;
        case "connected":
            text = "Ready.";
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
    // Define level order
    const levels = ['debug', 'log', 'warn', 'error'];

    // Determine the current threshold (default to 'debug')
    const threshold = String(CONSOLE_LOG_LEVEL || 'debug').toLowerCase();
    const thresholdIndex = levels.indexOf(threshold);
    // If the user supplied an invalid level, default to allowing everything
    const currentLevelIndex = thresholdIndex >= 0 ? thresholdIndex : 0;

    // Normalize requested method
    const m = String(method).toLowerCase();
    const methodIndex = levels.indexOf(m);
    // If unknown method, treat as 'log'
    const validMethod = methodIndex >= 0 ? m : 'log';

    // Suppress messages below threshold
    if (methodIndex < currentLevelIndex) {
        return;
    }

    // Fixed-width tags for each level
    const tags = {
        debug: '[DEBUG]',
        log: '[LOG  ]',
        warn: '[WARN ]',
        error: '[ERROR]'
    };
    const tag = tags[validMethod];

    // Invoke the console method if it exists, else fall back to console.log
    if (typeof console[validMethod] === 'function') {
        console[validMethod](tag, ...args);
    } else {
        console.log(tag, ...args);
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
            if (shouldShowBackendLossStatus() && typeof clearOfflineDefaults === "function") {
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

        // If the server is replying to our get_tx_state command:
        if (msg.tx_state !== undefined) {
            setConnectionState(msg.tx_state === "transmitting" ? "transmitting" : "connected");
            debugConsole("debug", "Received tx_state:", msg.tx_state);
            return;
        }

        // If the server pushes a “transmit” event:
        if (msg.type === "transmit") {
            if (msg.state === "starting") {
                const ts = new Date(msg.timestamp);
                setConnectionState("transmitting", ts);
                debugConsole("debug", "Transmit started at:", ts.toString());
            } else if (msg.state === "finished") {
                setConnectionState("connected");
                debugConsole(
                    "debug",
                    "Transmit finished at:",
                    new Date(msg.timestamp).toString()
                );
            }
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

        // …any other message types…
    });

    // On error: Log and treat as a disconnection
    ws.addEventListener("error", (err) => {
        debugConsole("error", "WebSocket ❌ error", err);
        communicationInterrupted = true;
        reloadAfterReconnectPending = true;
        setConnectionState("disconnected");
        if (shouldShowWebSocketLossStatus() && typeof setBackendStatus === "function") {
            setBackendStatus(true);
        }
    });

    // On close: Schedule a reconnect
    ws.addEventListener("close", (ev) => {
        debugConsole(
            "debug",
            `WebSocket 🔌 closed (code=${ev.code}), reconnecting in ${reconnectDelay}ms`
        );
        communicationInterrupted = true;
        reloadAfterReconnectPending = true;
        setConnectionState("disconnected");
        if (shouldShowWebSocketLossStatus() && typeof setBackendStatus === "function") {
            setBackendStatus(true);
        }

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

    let callsign = "";

    if (typeof forceCallsign === "string") {
        callsign = forceCallsign.trim();
    } else if ($cs.length && typeof $cs.val() === "string") {
        callsign = $cs.val().trim();
    } else if (window.config && typeof window.config.callsign === "string") {
        callsign = window.config.callsign.trim();
    }

    const isValid =
        $cs.length &&
        $cs[0] &&
        typeof $cs[0].checkValidity === "function" &&
        $cs[0].checkValidity();

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
