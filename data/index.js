function bindIndexActions() {
    // Bind the Mode Switch
    $('input[name="mode_toggle"]').on('change', clickModeToggle);

    // Bind the QRSS Radio Buttons
    $('input[name="qrss_type"]').on('change', clickQRSSModeToggle);

    // Bind the Use NTP Switch
    $("#use_ntp").on("change", clickUseNTP);

    // Wire up the LED switch
    $("#use_led").on("change", clickUseLED);

    // Wire up the LED switch
    $("#use_shutdown").on("change", clickUseShutdown);

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
    $("#qrss_frequency").on("input blur", validateQRSSFrequencies);

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
}

function clickUseShutdown() {
    const on = $('#use_shutdown').prop('checked');
    $('#shutdownDropdownButton').prop('disabled', !on);
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

function validatePage() {
    const form = document.getElementById("wsprform");

    let invalidCount = 0;

    // ONLY the .form-control elements (no switches, ranges, etc)
form
    .querySelectorAll(".form-control:not(.form-check-input)")
    .forEach((ctrl) => {
        if (ctrl.id === "callsign") {
            if (isPlaceholderCallsign(ctrl.value)) {
                ctrl.setCustomValidity(
                    "Placeholder callsign is not allowed."
                );
            } else {
                ctrl.setCustomValidity("");
            }
        }

        if (ctrl.id === "gridsquare") {
            if (isPlaceholderGridSquare(ctrl.value)) {
                ctrl.setCustomValidity(
                    "Placeholder grid square ZZ99 is not allowed."
                );
            } else {
                ctrl.setCustomValidity("");
            }
        }

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
    } else {
        $('#qrss_config').hide();
        $('#wspr_config').show();
    }
}


function clickQRSSModeToggle() {
    const selectedMode = $('input[name="qrss_type"]:checked').val();

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

    // Mark this item active, clear others
    const $menu = $item.closest('.dropdown-menu');
    $menu.find('.dropdown-item').removeClass('active');
    $item.addClass('active');

    // Clear focus from item and (after hide) from the button
    $item.trigger('blur');
    setTimeout(() => $btn.trigger('blur').removeClass('active show'), 0);
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

    // Load form elements
    //
    // Mode
    let mode = $('input[name="mode_toggle"]:checked').val();

    // Hardware Control
    let transmit = parseBool($("#transmit").is(":checked"));
    let use_led = parseBool($("#use_led").is(":checked"));
    let led_pin = parseInt(getLEDPin()) || 18;
    let use_shutdown = parseBool($("#use_shutdown").is(":checked"));
    let shutdown_pin = parseInt(getShutdownPin()) || 19;

    // Operator Information
    let callsign = $("#callsign").val() || "";
    let gridsquare = $("#gridsquare").val() || "";

    // Transmitter Information
    let dbm = parseInt($("#dbm").val());
    let frequencies = $("#frequencies").val() || "";
    let useoffset = parseBool($("#useoffset").is(":checked"));

    // QRSS Information
    let qrss_type = $('input[name="qrss_type"]:checked').val();
    let dot_length = parseInt($('#dot_length').val(), 10);
    let fsk_offset = parseFloat($('#fsk_offset').val());
    let qrss_frequency = parseInt($('#qrss_frequency').val(), 10);
    let tx_start_minute = parseInt($('#tx_start_minute').val(), 10);
    let tx_repeat_every = parseInt($('#tx_repeat_every').val(), 10);
    let qrss_message = $('#qrss_message').val();

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

    var Control = {
        "Transmit": transmit,
    };

    var Common = {
        "Call Sign": callsign,
        "Grid Square": gridsquare,
        "TX Power": dbm,
        "Frequency": frequencies,
    };

    var QRSS = {
        "QRSS Mode": qrss_type,
        "Dot Length": dot_length,
        "FSK Offset": fsk_offset,
        "QRSS Frequency": qrss_frequency,
        "TX Start Minute": tx_start_minute,
        "TX Repeat Every": tx_repeat_every,
        "Message": qrss_message,
    }

    var Extended = {
        "PPM": ppm_val,
        "Use NTP": use_ntp,
        "Offset": useoffset,
        "Use LED": use_led,
        "LED Pin": led_pin,
        "Power Level": transmit_power,
    };

    var Server = {
        "Use Shutdown": use_shutdown,
        "Shutdown Button": shutdown_pin,
    };

    var configJson = {
        Meta,
        Control,
        Common,
        QRSS,
        Extended,
        Server,
    };
    var json = JSON.stringify(configJson);

    $.ajax({
        url: SETTINGS_URL,
        type: "PUT",
        contentType: "application/json",
        data: json,
    })
        .done(function (data) {
            lastSaveTimestamp = Date.now(); // Save to prevent forced reload
        })
        .fail(function (xhr) {
            alert(
                "Settings update failed with status: " + xhr.status,
                xhr.responseText
            );
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

    // build our two regexes
    const numericRx = /^\d+(?:\.\d+)?(?:hz|khz|mhz|ghz)?$/i;
    const bandRx =
        /^(?:lf(?:-15)?|mf(?:-15)?|160m(?:-15)?|80m|60m|40m|30m|20m|17m|15m|12m|10m|6m|4m|2m)$/i;

    // Split on any whitespace
    const tokens = raw.split(/\s+/);
    for (const tok of tokens) {
        if (!(numericRx.test(tok) || bandRx.test(tok))) {
            valid = false;
        }
    }

    // Add/remove validity classes
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

/**
 * Validate the “QRSS Frequencies” field.
 * @returns {boolean} true if valid, false otherwise.
 */
function validateQRSSFrequencies() {
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