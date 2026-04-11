function bindIndexActions() {
    // Bind the Mode Switch
    $('input[name="mode_toggle"]').on('change', clickModeToggle);

    // Bind the shared CW mode radio buttons
    $('input[name="qrss_type"]').on('change', clickQRSSModeToggle);

    // Bind the Use NTP Switch
    $("#use_ntp").on("change", clickUseNTP);

    // Wire up the LED switch
    $("#use_led").on("change", clickUseLED);

    // Wire up the LED switch
    $("#use_shutdown").on("change", clickUseShutdown);

    // Wire up Band GPIO switches
    $("#wsprform").on("change", ".band-gpio-enabled", clickBandGpioEnabled);
    $("#wsprform").on("input change", ".band-gpio-input, .band-gpio-active-high", validateBandGpioFields);

    // Wire up the pin dropdown menus (only in the form)
    $('#wsprform')
        .off('click.pin', '[aria-labelledby="ledDropdownButton"] .dropdown-item, [aria-labelledby="shutdownDropdownButton"] .dropdown-item', selectPin)
        .on('click.pin', '[aria-labelledby="ledDropdownButton"] .dropdown-item, [aria-labelledby="shutdownDropdownButton"] .dropdown-item', selectPin);

    // Bind the transmit power slider
    $("#tx-power-range").on("input", updateTxPowerLabel);

    // Bind clicks on buttons/switches for resetting tooltips
    $(document).on(
        "click",
        'a[data-bs-toggle="tooltip"], button[data-bs-toggle="tooltip"]',
        resetToolTips
    );

    // Update WSPRNet link and bind changes to callsign
    $("#callsign").on("input blur", updateCallsign);

    // Run validation live as the user types:
    $("#frequencies").on("input blur", validateFrequencies);

    // Run validation live as the user types:
    $("#qrss_frequency").on("input blur", validateCwBaseFrequency);

    // Bind any text/number/select control changes
    $(document).on(
        "input change",
        '.form-control:not([type="range"], .form-check-input)',
        validatePage
    );

    // Modal Action Handlers
    const $modalEl = $("#testToneModal");
    //const tone_modal = new bootstrap.Modal($modalEl[0]);
    $("#test_tone").on("click", clickTestTone);
    $("#testToneStart").on("click", onTestToneStart);
    $("#testToneEnd").on("click", onTestToneEnd);
    $modalEl.on("hidden.bs.modal", onTestToneEnd);

    // Bind Submit and Reset Buttons
    $("#submit").click(savePage);
    $("#reset").click(resetPage);
}

// Transmit power slider update
function updateTxPowerLabel() {
    var val = this.value;
    var rangeValues = {
        0: "2mA<br/>3.0dBm",
        1: "4mA<br/>6.0dBm",
        2: "6mA<br/>7.8dBm",
        3: "8mA<br/>9.0dBm",
        4: "10mA<br/>10.0dBm",
        5: "12mA<br/>10.8dBm",
        6: "14mA<br/>11.5dBm",
        7: "16mA<br/>12.0dBm",
    };
    var label = rangeValues[val] || val;
    $("#tx-power-range-value").html(label);
}

function clickUseLED() {
    const on = $("#use_led").prop("checked");
    $("#ledDropdownButton").prop("disabled", !on);
    refreshBandGpioOptions();
}

function clickUseShutdown() {
    const on = $('#use_shutdown').prop('checked');
    $('#shutdownDropdownButton').prop('disabled', !on);
    refreshBandGpioOptions();
}

function getBandGpioRows() {
    return $("#bandGpioTable tbody tr[data-band]");
}

function setBandGpioRowState($row, enabled) {
    $row.find(".band-gpio-enabled").prop("checked", enabled);
    $row.find(".band-gpio-input").prop("disabled", !enabled);
    $row.find(".band-gpio-active-high").prop("disabled", !enabled);
}

function clickBandGpioEnabled() {
    const $row = $(this).closest("tr[data-band]");
    setBandGpioRowState($row, $(this).is(":checked"));
    validateBandGpioFields();
}

function getReservedBandGpioPins() {
    const reservedPins = new Set();

    if ($("#use_led").is(":checked")) {
        const ledPin = getLEDPin();
        if (Number.isInteger(ledPin)) {
            reservedPins.add(String(ledPin));
        }
    }

    if ($("#use_shutdown").is(":checked")) {
        const shutdownPin = getShutdownPin();
        if (Number.isInteger(shutdownPin)) {
            reservedPins.add(String(shutdownPin));
        }
    }

    return reservedPins;
}

function refreshBandGpioOptions() {
    const reservedPins = getReservedBandGpioPins();

    getBandGpioRows().each(function () {
        const $select = $(this).find(".band-gpio-input");
        const currentValue = $select.val();

        $select.find("option").each(function () {
            const $option = $(this);
            const optionValue = String($option.val() || "");
            const isPlaceholder = optionValue === "";
            const isReserved = reservedPins.has(optionValue);
            const keepCurrentSelection = currentValue !== "" && currentValue === optionValue;
            const shouldDisable = !isPlaceholder && isReserved && !keepCurrentSelection;

            $option.prop("disabled", shouldDisable);
            $option.prop("hidden", shouldDisable);
        });
    });
}

function populateBandGpioForm(bandGpioConfig = {}) {
    getBandGpioRows().each(function () {
        const $row = $(this);
        const band = $row.data("band");
        const $gpioInput = $row.find(".band-gpio-input");
        const bandConfig = bandGpioConfig && typeof bandGpioConfig === "object"
            ? bandGpioConfig[band]
            : null;
        const backendEnabled = !!(bandConfig && bandConfig["Enabled"] === true);
        const gpio = bandConfig && Number.isInteger(bandConfig["GPIO"])
            ? bandConfig["GPIO"]
            : -1;
        const gpioValue = gpio >= 0 ? String(gpio) : "";

        $gpioInput.val(gpioValue);

        const resolvedGpioValue = $gpioInput.val();
        const hasSelectableGpio = gpioValue !== "" && resolvedGpioValue === gpioValue;
        const enabled = backendEnabled && hasSelectableGpio;
        const activeHigh = enabled && !!(bandConfig && bandConfig["Active High"] === true);

        if (!hasSelectableGpio) {
            $gpioInput.val("");
        }

        $row.find(".band-gpio-active-high").prop("checked", activeHigh);
        setBandGpioRowState($row, enabled);
    });

    refreshBandGpioOptions();
    validateBandGpioFields();
}

function collectBandGpioConfig() {
    const bandGpio = {};

    getBandGpioRows().each(function () {
        const $row = $(this);
        const band = $row.data("band");
        const enabled = $row.find(".band-gpio-enabled").is(":checked");
        const gpioRaw = $row.find(".band-gpio-input").val();
        const gpioValue = gpioRaw === "" || gpioRaw === null
            ? -1
            : parseInt(gpioRaw, 10);
        const activeHigh = $row.find(".band-gpio-active-high").is(":checked");
        const validEnabledRow = enabled && gpioValue >= 0;

        bandGpio[band] = validEnabledRow
            ? {
                "GPIO": gpioValue,
                "Enabled": true,
                "Active High": activeHigh,
            }
            : {
                "GPIO": -1,
                "Enabled": false,
                "Active High": false,
            };
    });

    return bandGpio;
}

function validateBandGpioFields() {
    let invalidCount = 0;

    getBandGpioRows().each(function () {
        const $row = $(this);
        const enabled = $row.find(".band-gpio-enabled").is(":checked");
        const gpioValue = $row.find(".band-gpio-input").val();
        const valid = !enabled || (gpioValue !== "" && gpioValue !== null);

        if (!valid) {
            invalidCount++;
        }
    });

    return invalidCount === 0;
}

function isPlaceholderCallsign(callsign) {
    if (typeof callsign !== "string") return false;

    const value = callsign.trim().toUpperCase();
    return value === "N0CALL" || value === "NXXX";
}

function isPlaceholderGridSquare(gridSquare) {
    if (typeof gridSquare !== "string") return false;

    return gridSquare.trim().toUpperCase() === "ZZ99";
}

function trimIdentityValue(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isLightweightCallsign(value) {
    const trimmed = trimIdentityValue(value);
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }

    return /^(?:[A-Za-z0-9/]+|<[A-Za-z0-9/]+>)$/.test(trimmed);
}

function isLightweightGridSquare(value) {
    const trimmed = trimIdentityValue(value);
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }

    return /^[A-Za-z]{2}[0-9]{2}(?:[A-Za-z]{2})?$/.test(trimmed);
}

function setIdentityValidity(ctrl) {
    if (ctrl.id === "callsign") {
        const callsign = trimIdentityValue(ctrl.value);
        if (!callsign) {
            ctrl.setCustomValidity("Callsign is required.");
        } else if (!isLightweightCallsign(callsign)) {
            ctrl.setCustomValidity(
                "Enter a callsign using letters, digits, '/', or explicit Type 3 form like <CALLSIGN>."
            );
        } else if (isPlaceholderCallsign(callsign)) {
            ctrl.setCustomValidity("Placeholder callsign is not allowed.");
        } else {
            ctrl.setCustomValidity("");
        }
    }

    if (ctrl.id === "gridsquare") {
        const gridSquare = trimIdentityValue(ctrl.value);
        if (!gridSquare) {
            ctrl.setCustomValidity("Grid square is required.");
        } else if (!isLightweightGridSquare(gridSquare)) {
            ctrl.setCustomValidity(
                "Enter a 4-character or 6-character Maidenhead locator such as FN20 or FN20AB."
            );
        } else if (isPlaceholderGridSquare(gridSquare)) {
            ctrl.setCustomValidity("Placeholder grid square ZZ99 is not allowed.");
        } else {
            ctrl.setCustomValidity("");
        }
    }
}

function buildConfigErrorMessage(data, fallbackMessage) {
    if (!data || typeof data !== "object") {
        return fallbackMessage;
    }

    const lines = [];
    if (typeof data.message === "string" && data.message.trim()) {
        lines.push(data.message.trim());
    } else {
        lines.push(fallbackMessage);
    }

    if (typeof data.plan_status === "string" && data.plan_status.trim()) {
        lines.push(`Plan status: ${data.plan_status.trim()}`);
    }

    if (typeof data.rationale === "string" && data.rationale.trim()) {
        lines.push(data.rationale.trim());
    }

    if (
        typeof data.normalized_callsign === "string" &&
        data.normalized_callsign.trim()
    ) {
        lines.push(`Normalized callsign: ${data.normalized_callsign.trim()}`);
    }

    if (
        typeof data.normalized_locator === "string" &&
        data.normalized_locator.trim()
    ) {
        lines.push(`Normalized locator: ${data.normalized_locator.trim()}`);
    }

    return lines.join("\n");
}

function validatePage() {
    const form = document.getElementById("wsprform");

    let invalidCount = 0;

    validateFrequencies();
    validateCwBaseFrequency();
    validateBandGpioFields();

    // ONLY the .form-control elements (no switches, ranges, etc)
    form
        .querySelectorAll(".form-control:not(.form-check-input)")
        .forEach((ctrl) => {
            setIdentityValidity(ctrl);

            if (ctrl.checkValidity()) {
                ctrl.classList.add("is-valid");
                ctrl.classList.remove("is-invalid");
            } else {
                ctrl.classList.add("is-invalid");
                ctrl.classList.remove("is-valid");
                invalidCount++;
            }
        });

    return invalidCount === 0;
}

function clickModeToggle() {
    const selected = $('input[name="mode_toggle"]:checked').val();

    if (selected === "QRSS") {
        $('#wspr_config').hide();
        $('#qrss_config').show();
        if (!$('input[name="qrss_type"]:checked').length) {
            $('input[name="qrss_type"][value="QRSS"]').prop("checked", true);
        }
        clickQRSSModeToggle();
    } else {
        $('#qrss_config').hide();
        $('#wspr_config').show();
    }
}


function clickQRSSModeToggle() {
    const selectedMode = $('input[name="qrss_type"]:checked').val();

    // CW.Shift Hz is only used by FSKCW and DFCW.
    if (selectedMode === "QRSS") {
        $('#fsk_offset').prop('disabled', true);
    } else {
        $('#fsk_offset').prop('disabled', false);
    }
}

// Function to enable/disable & reset PPM field when Use NTP toggles
function clickUseNTP() {
    const $ntp = $("#use_ntp");
    const $ppm = $("#ppm");
    const useNtp = $ntp.is(":checked");

    // disable/enable the PPM input
    $ppm.prop("disabled", useNtp);

    if (useNtp) {
        // when disabling, clear & reset validation
        $ppm.removeClass("is-valid is-invalid").prop("required", false);
    } else {
        // when enabling, make it required again
        $ppm.prop("required", true);
    }
}

function setLEDPin(gpioNumber) {
    const code = "GPIO" + gpioNumber;
    const $btn = $("#ledDropdownButton");
    const $item = $(`.dropdown-item[data-val="${code}"]`);
    if ($item.length) {
        $btn.text(code);
    $btn.attr("title", $item.text().trim());
        $btn.attr("title", $item.text().trim());
    } else {
        debugConsole("warn", "GPIO value not found:", code);
    }
}

/**
 * Read the current LED‐pin selection out of your custom dropdown.
 * @returns {number|null} the pin number, e.g. 18, or null if nothing
 * is selected
 */
function getLEDPin() {
    const txt = $("#ledDropdownButton").text().trim();
    const m = txt.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
}

/**
 * Universal dropdown-pin selector
 */
function selectPin(e) {
    const $item = $(this);
    const code = $item.data('val');                     // just "GPIO18"
    const menuId = $item.closest('.dropdown-menu').attr('aria-labelledby');
    const $btn = $('#' + menuId);

    // Update the toggle button text with the short code
    $btn.text(code);
        $btn.attr("title", $item.text().trim());

    // Mark this item active, clear others
    const $menu = $item.closest('.dropdown-menu');
    $menu.find('.dropdown-item').removeClass('active');
    $item.addClass('active');

    // Clear focus from item and (after hide) from the button
    $item.trigger('blur');
    setTimeout(() => $btn.trigger('blur').removeClass('active show'), 0);
    refreshBandGpioOptions();
}

/**
 * Programmatically set a pin in your custom dropdown.
 * @param {number} gpioNumber  e.g. 18
 */
function setShutdownPin(gpioNumber) {
    const code = "GPIO" + gpioNumber;
    const $btn = $("#shutdownDropdownButton");
    const $item = $(`.dropdown-item[data-val="${code}"]`);
    if ($item.length) {
        $btn.text(code);
    } else {
        debugConsole("warn", "GPIO value not found:", code);
    }
}

/**
 * Read the current shutdown pin selection out of your custom dropdown.
 * @returns {number|null} the pin number, e.g. 18, or null if nothing
 * is selected
 */
function getShutdownPin() {
    const txt = $("#shutdownDropdownButton").text().trim();
    const m = txt.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
}

// Open Test Tone Modal
function clickTestTone(e) {
    // Disable Buttons
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

// Start Test Tone
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

// End Test Tone
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

// Save all fields
function savePage(e) {
    if (!validatePage()) {
        alert("Please correct the errors on the page.");
        return false;
    }
    e.preventDefault();
    const btn = this;
    // Disable Buttons
    $("#submit").prop("disabled", true);
    $("#reset").prop("disabled", true);
    toggleButtonLoading(btn, true);

    // Mode: WSPR uses WSPR fields; QRSS/FSKCW/DFCW use the shared CW section.
    let mode = $('input[name="mode_toggle"]:checked').val();
    if (mode !== "WSPR") {
        mode = $('input[name="qrss_type"]:checked').val() || "QRSS";
    }

    // Runtime
    let transmit = parseBool($("#transmit").is(":checked"));
    let use_led = parseBool($("#use_led").is(":checked"));
    let led_pin = parseInt(getLEDPin()) || 18;
    let use_shutdown = parseBool($("#use_shutdown").is(":checked"));
    let shutdown_pin = parseInt(getShutdownPin()) || 19;
    let band_gpio = collectBandGpioConfig();

    // WSPR
    let planner_preference = String($("#planner_preference").val() || "auto");
    let callsign = trimIdentityValue($("#callsign").val());
    let gridsquare = trimIdentityValue($("#gridsquare").val());
    let dbm = parseInt($("#dbm").val());
    let frequencies = $("#frequencies").val() || "";
    let useoffset = parseBool($("#useoffset").is(":checked"));

    // CW shared non-WSPR settings
    let dot_length = parseFloat($('#dot_length').val());
    let fsk_offset = parseFloat($('#fsk_offset').val());
    let cw_base_frequency = parseFloat($('#qrss_frequency').val());
    let tx_start_minute = parseInt($('#tx_start_minute').val(), 10);
    let tx_repeat_every = parseInt($('#tx_repeat_every').val(), 10);
    let cw_message = $('#qrss_message').val();
    if (!Number.isFinite(dot_length)) dot_length = 3.0;
    if (!Number.isFinite(fsk_offset)) fsk_offset = 0.0;
    if (!Number.isFinite(cw_base_frequency)) cw_base_frequency = 0.0;
    if (!Number.isInteger(tx_start_minute)) tx_start_minute = 0;
    if (!Number.isInteger(tx_repeat_every)) tx_repeat_every = 10;

    // Frequency Calibration
    let use_ntp = parseBool($("#use_ntp").is(":checked"));
    let ppm_val = parseFloat($("#ppm").val()) || 0.0;

    // Transmit Power
    const raw = $("#tx-power-range").val();
    let transmit_power = parseInt(raw, 10);
    // Use 7 if parsing fails
    if (!(transmit_power >= 0 && transmit_power <= 7)) {
        transmit_power = 7;
    }

    var Meta = {
        "Mode": mode
    }

    var Runtime = {
        "Transmit": transmit,
        "Power Level": transmit_power,
        "Use LED": use_led,
        "LED Pin": led_pin,
        "Use Shutdown": use_shutdown,
        "Shutdown Button": shutdown_pin,
    };

    var Calibration = {
        "PPM": ppm_val,
        "Use NTP": use_ntp,
    };

    var WSPR = {
        "Call Sign": callsign,
        "Grid Square": gridsquare,
        "TX Power": dbm,
        "Frequency": frequencies,
        "Planner Preference": planner_preference,
        "Use Random Offset": useoffset,
    };

    var CW = {
        "Message": cw_message,
        "Base Frequency": cw_base_frequency,
        "Shift Hz": fsk_offset,
        "Dot Seconds": dot_length,
        "Start Minute": tx_start_minute,
        "Repeat Minutes": tx_repeat_every,
    };

    var configJson = {
        Meta,
        Runtime,
        Calibration,
        WSPR,
        CW,
        "Band GPIO": band_gpio,
    };
    var json = JSON.stringify(configJson);

    $.ajax({
        url: SETTINGS_URL,
        type: "PATCH",
        contentType: "application/merge-patch+json",
        data: json,
    })
        .done(function (data) {
            lastSaveTimestamp = Date.now(); // Save to prevent forced reload
        })
        .fail(function (xhr) {
            let message = "Settings update failed with status: " + xhr.status;
            let parsedError = null;

            if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
                parsedError = xhr.responseJSON;
                message = buildConfigErrorMessage(parsedError, message);
            } else if (typeof xhr.responseText === "string" && xhr.responseText.trim()) {
                try {
                    parsedError = JSON.parse(xhr.responseText);
                    if (parsedError && typeof parsedError === "object") {
                        message = buildConfigErrorMessage(parsedError, message);
                    }
                } catch (error) {
                    debugConsole("warn", "Unable to parse settings error response:", error);
                }
            }

            alert(message);
        })
        .always(function () {
            setTimeout(() => {
                $("#submit").prop("disabled", false);
                $("#reset").prop("disabled", false);
                $("#wsprform").prop("disabled", false);
                toggleButtonLoading(btn, false);
            }, 500);
        });
}

// Reload page config
function resetPage(e) {
    // Disable Form
    e.preventDefault();
    const btn = this;
    toggleButtonLoading(btn, true);
    $("#submit").prop("disabled", true);
    $("#reset").prop("disabled", true);
    $("#test_tone").prop("disabled", true);
    $("#wsprform").prop("disabled", true);
    populateConfig();
    setTimeout(() => {
        toggleButtonLoading(btn, false);
    }, 500);
}

/**
 * Validate the WSPR “Frequencies” field.
 * @returns {boolean} true if valid, false otherwise.
 */
function validateFrequencies() {
    let valid = true;
    const fld = document.getElementById("frequencies");
    const raw = fld.value.trim();

    // Empty is invalid
    if (!raw) {
        valid = false;
    }

    // Match numeric values with optional frequency unit
    const numericRx = /^(\d+(?:\.\d+)?)(hz|khz|mhz|ghz)?$/i;

    // Match named amateur bands
    const bandRx =
        /^(?:lf(?:-15)?|mf(?:-15)?|160m(?:-15)?|80m|60m|40m|30m|20m|17m|15m|12m|10m|6m|4m|2m)$/i;

    // Split on any whitespace
    const tokens = raw.split(/\s+/);

    for (const tok of tokens) {
        if (bandRx.test(tok)) {
            continue;
        }

        const numericMatch = tok.match(numericRx);
        if (numericMatch) {
            const value = Number.parseFloat(numericMatch[1]);
            const unit = numericMatch[2]?.toLowerCase() || "";

            // Bare numbers must be at least 137
            if (!unit && value < 137) {
                valid = false;
            }

            continue;
        }

        valid = false;
    }

    fld.setCustomValidity(
        valid ? "" : "Enter band names like 80m, or numeric frequencies 137 or higher."
    );

    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

/**
 * Validate the shared CW “Base Frequency” field.
 * @returns {boolean} true if valid, false otherwise.
 */
function validateCwBaseFrequency() {
    const fld = document.getElementById("qrss_frequency");
    const raw = fld.value.trim();

    let valid = true;

    // False if blank or 0
    if (!raw) valid = false;

    // Only accept one frequency
    const tokens = raw.split(/\s+/);
    if (tokens.length !== 1) valid = false;

    // Allow a frequency unit
    const numericRx = /^\d+(\.\d+)?(hz|khz|mhz|ghz)?$/i;
    if (!numericRx.test(raw)) valid = false;

    // Apply visual styling
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}


function setHardwareControlsDisabled(disabled) {
    const controlIds = [
        "#transmit",
        "#planner_preference",
        "#use_led",
        "#ledDropdownButton",
        "#use_shutdown",
        "#shutdownDropdownButton",
        "#submit",
        "#reset",
        "#test_tone"
    ];

    controlIds.forEach((selector) => {
        $(selector).prop("disabled", disabled);
    });

    getBandGpioRows().each(function () {
        const $row = $(this);
        $row.find(".band-gpio-enabled").prop("disabled", disabled);
        $row.find(".band-gpio-input").prop("disabled", disabled || !$row.find(".band-gpio-enabled").is(":checked"));
        $row.find(".band-gpio-active-high").prop("disabled", disabled || !$row.find(".band-gpio-enabled").is(":checked"));
    });
}

function setOfflineDefaults() {
    $("#transmit").prop("checked", false);
    $("#use_led").prop("checked", false);
    $("#use_shutdown").prop("checked", false);
    populateBandGpioForm({});

    $("#ledDropdownButton")
        .text("GPIO18")
        .attr("title", "GPIO18 (Pin 12 - TAPR LED)");

    $("#shutdownDropdownButton")
        .text("GPIO19")
        .attr("title", "GPIO19 (Pin 35 - TAPR Shutdown)");

    setHardwareControlsDisabled(true);
}

function clearOfflineDefaults() {
    setHardwareControlsDisabled(false);
}
