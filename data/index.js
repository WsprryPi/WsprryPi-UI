let isUpdatingTransmitFromBackend = false;
let stopRequestInFlight = false;
const CONFIG_AUTOSAVE_DELAY_MS = 800;
let configAutosaveTimer = null;
let configAutosaveSuspended = false;
let configAutosaveInFlight = false;
let configAutosavePendingAfterFlight = false;
let configAutosaveDirty = false;
let lastSavedConfigPayload = "";
let lastFailedConfigPayload = "";
let configSaveStatusClearTimer = null;
let configAutosaveNeedsRuntimeRefresh = false;
let pendingPersistedMode = "";
let currentConfigModeSelection = "WSPR";
let pendingModeChange = null;
let modeChangeGuardBusy = false;
let suppressModeChangeGuard = false;

function bindIndexActions() {
    // Bind the Mode Switch
    $('input[name="mode_toggle"]').on('change', clickModeToggle);

    // Operation.Transmit is global and is patched immediately, independent of Save.
    $("#transmit").on("change", patchTransmitControl);

    // Stop is an explicit operator action, separate from Operation.Transmit PATCH.
    $("#stop_transmit").on("click", stopTransmission);

    // Bind the shared CW mode radio buttons
    $('input[name="qrss_type"]').on('change', clickQRSSModeToggle);

    // Bind the Use NTP Switch
    $("#use_ntp").on("change", clickUseNTP);
    $("#transmit_backend").on("change", clickTransmitBackend);
    $("#ppm").on("input change", () => syncPpmFields("wspr"));
    $("#ppm_cw").on("input change", () => syncPpmFields("cw"));

    // Wire up the LED switch
    $("#use_led").on("change", clickUseLED);

    // Wire up the LED switch
    $("#use_shutdown").on("change", clickUseShutdown);

    // Wire up Band GPIO switches
    $("#wsprform").on("change", ".band-gpio-enabled", clickBandGpioEnabled);
    $("#wsprform").on("change", "#band-gpio-enabled-all", () => {
        applyBandGpioColumnToggle("enabled", $("#band-gpio-enabled-all").is(":checked"));
    });
    $("#wsprform").on("change", "#band-gpio-active-high-all", () => {
        applyBandGpioColumnToggle("activeHigh", $("#band-gpio-active-high-all").is(":checked"));
    });
    $("#wsprform").on("change", ".band-gpio-active-high", syncBandGpioColumnHeaderStates);
    $("#wsprform").on("input change", ".band-gpio-input, .band-gpio-active-high", validateBandGpioFields);

    // Wire up the pin dropdown menus (only in the form)
    $('#wsprform')
        .off('click.pin', '[aria-labelledby="ledDropdownButton"] .dropdown-item, [aria-labelledby="shutdownDropdownButton"] .dropdown-item', selectPin)
        .on('click.pin', '[aria-labelledby="ledDropdownButton"] .dropdown-item, [aria-labelledby="shutdownDropdownButton"] .dropdown-item', selectPin);

    // Bind the transmit power slider
    $("#gpio-power-range").on("input", updateGpioPowerLabel);
    $("#si5351-power-range").on("input", updateSi5351PowerLabel);

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
    $("#qrss_message").on("input change blur", function () {
        validateCwMessage();
        if (typeof renderRuntimeStatus === "function") {
            renderRuntimeStatus(currentRuntimeStatus);
        }
    });
    $("#dot_length").on("input blur", validateCwDotSeconds);
    $("#fsk_offset").on("input blur", validateCwShiftHz);
    $("#tx_repeat_every").on("input blur", validateCwRepeatMinutes);
    $("#si5351_i2c_address").on("input blur", validateSi5351I2cAddress);
    $("#si5351_i2c_bus, #si5351_reference_frequency").on(
        "input blur",
        validateTransmitterHardwareFields
    );

    // Bind any text/number/select control changes
    $(document).on(
        "input change",
        '.form-control:not([type="range"], .form-check-input)',
        function () {
            validatePage();
            scheduleAutosave();
        }
    );

    $("#wsprform").on(
        "change input",
        'input:not(#transmit, [name="mode_toggle"], [name="qrss_type"]), select, textarea',
        scheduleAutosave
    );

    bindTestToneControls();
    bindModeChangeGuardModal();
    currentConfigModeSelection = selectedConfigMode();
}

function setTransmitFromBackend(enabled) {
    isUpdatingTransmitFromBackend = true;
    $("#transmit").prop("checked", !!enabled);
    isUpdatingTransmitFromBackend = false;
    updateRuntimeControlStatusFromForm(null);
}

function syncStopButtonState() {
    const $stop = $("#stop_transmit");
    if (!$stop.length) {
        return;
    }

    const runtimeStatus =
        typeof currentRuntimeStatus === "object" && currentRuntimeStatus !== null
            ? currentRuntimeStatus
            : null;
    const runtimeConfigStatus =
        typeof currentRuntimeConfigStatus === "object" &&
        currentRuntimeConfigStatus !== null
            ? currentRuntimeConfigStatus
            : null;

    const transmitting = runtimeStatus && runtimeStatus.txState === "transmitting";
    $stop.prop("disabled", stopRequestInFlight || !transmitting);
}

function requestTransmitEnabledChange(enabled, previousEnabled, options = {}) {
    const $transmit = $("#transmit");
    const updateCheckboxOnSuccess = options.updateCheckboxOnSuccess === true;
    const syncAutosaveBaselineOnSuccess =
        options.syncAutosaveBaselineOnSuccess !== false;
    const onSuccess =
        typeof options.onSuccess === "function" ? options.onSuccess : null;
    const onFailure =
        typeof options.onFailure === "function" ? options.onFailure : null;

    if (enabled) {
        const unavailableMessage = selectedBackendUnavailableMessage();
        if (unavailableMessage) {
            const formattedMessage = formatTransmitFailureMessage(unavailableMessage);
            setTransmitFromBackend(previousEnabled);
            showBackendStatus(formattedMessage, "danger", "runtime");
            alert(formattedMessage);
            if (onFailure) {
                onFailure(formattedMessage);
            }
            return null;
        }
    }

    $transmit.prop("disabled", true);

    return $.ajax({
        url: SETTINGS_URL,
        type: "PATCH",
        contentType: "application/merge-patch+json",
        data: JSON.stringify({
            Operation: {
                "Transmit": enabled,
            },
        }),
    })
        .done(function () {
            lastSaveTimestamp = Date.now();
            if (onSuccess) {
                onSuccess();
            }
            if (updateCheckboxOnSuccess) {
                setTransmitFromBackend(enabled);
            }
            updateRuntimeControlStatusFromForm(null);
            clearBackendStatus("runtime");
            if (typeof getTxState === "function") {
                getTxState();
            }
            if (syncAutosaveBaselineOnSuccess &&
                typeof syncConfigAutosaveBaseline === "function") {
                syncConfigAutosaveBaseline();
            }
        })
        .fail(function (xhr) {
            let message = "Failed to update transmit state.";
            console.error("Failed to update Operation.Transmit:", xhr);

            if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
                message = buildConfigErrorMessage(xhr.responseJSON, message);
            } else if (typeof xhr.responseText === "string" && xhr.responseText.trim()) {
                try {
                    const parsedError = JSON.parse(xhr.responseText);
                    if (parsedError && typeof parsedError === "object") {
                        message = buildConfigErrorMessage(parsedError, message);
                    }
                } catch (error) {
                    console.warn("Unable to parse transmit toggle error response:", error);
                }
            }

            message = formatTransmitFailureMessage(message);
            setTransmitFromBackend(previousEnabled);
            showBackendStatus(message, "danger", "runtime");
            alert(message);
            if (onFailure) {
                onFailure(message);
            }
        })
        .always(function () {
            $transmit.prop("disabled", false);
        });
}

function patchTransmitControl() {
    if (isUpdatingTransmitFromBackend) return;

    const enabled = $("#transmit").is(":checked");
    const previous = !enabled;

    if (enabled && pendingPersistedMode) {
        setTransmitFromBackend(previous);
        if (!configAutosaveInFlight && typeof flushAutosave === "function") {
            flushAutosave();
        }
        showBackendStatus(
            "Wait for the mode change to save before enabling transmissions.",
            "warning",
            "runtime"
        );
        return;
    }

    requestTransmitEnabledChange(enabled, previous);
}

function stopTransmission() {
    const $stop = $("#stop_transmit");
    if ($stop.prop("disabled")) {
        return false;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("Failed to stop transmission: WebSocket is not connected.");
        return false;
    }

    stopRequestInFlight = true;
    syncStopButtonState();

    ws.send(JSON.stringify({ command: "stop" }));
    return true;
}

function handleStopCommandResponse(message) {
    const response = message && typeof message === "object" ? message : {};
    const stopSucceeded =
        response.transmit_disabled === true || response.stop_performed === true;

    if (pendingModeChange && pendingModeChange.prerequisite === "stop") {
        if (stopSucceeded) {
            pendingModeChange.awaitingRuntimeIdle = true;
        } else {
            clearPendingModeChange();
        }
    }

    if (response.transmit_disabled === true) {
        setTransmitFromBackend(false);
    }
    if (typeof getTxState === "function") {
        getTxState();
    }

    stopRequestInFlight = false;
    syncStopButtonState();

    if (!stopSucceeded) {
        console.error("Failed to stop transmission:", response);
    }
}

function selectedConfigMode() {
    const mode = $('input[name="mode_toggle"]:checked').val();
    if (mode === "WSPR") {
        return "WSPR";
    }

    return $('input[name="qrss_type"]:checked').val() || "QRSS";
}

function bindModeChangeGuardModal() {
    const modalEl = document.getElementById("modeChangeGuardModal");
    if (!modalEl) {
        return;
    }

    $(modalEl)
        .off("hidden.bs.modal.modeGuard")
        .on("hidden.bs.modal.modeGuard", function () {
            if (pendingModeChange && !modeChangeGuardBusy) {
                clearPendingModeChange();
            }
        });
}

function modeChangeGuardModalInstance() {
    const modalEl = document.getElementById("modeChangeGuardModal");
    if (!modalEl) {
        return null;
    }

    return bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: "static",
        keyboard: false,
    });
}

function clearPendingModeChange() {
    pendingModeChange = null;
    modeChangeGuardBusy = false;
    if (typeof suspendConfigAutosave === "function") {
        suspendConfigAutosave(false);
    }
}

function applyCommittedConfigMode(mode) {
    suppressModeChangeGuard = true;
    applyConfigModeSelection(mode);
    suppressModeChangeGuard = false;
    updateRuntimeControlStatusFromForm(mode);
    if (typeof renderRuntimeStatus === "function") {
        renderRuntimeStatus(currentRuntimeStatus);
    }
    currentConfigModeSelection = selectedConfigMode();
    configAutosaveNeedsRuntimeRefresh = true;
    pendingPersistedMode = currentConfigModeSelection;
    validatePage();
    if (typeof suspendConfigAutosave === "function") {
        suspendConfigAutosave(false);
    }
    scheduleAutosave();
    flushAutosave();
}

function revertConfigModeSelection() {
    suppressModeChangeGuard = true;
    applyConfigModeSelection(currentConfigModeSelection);
    suppressModeChangeGuard = false;
}

function showModeChangeGuardModal(options) {
    const modalEl = document.getElementById("modeChangeGuardModal");
    const modal = modeChangeGuardModalInstance();
    if (!modalEl || !modal) {
        return;
    }

    document.getElementById("modeChangeGuardModalLabel").textContent = options.title;
    document.getElementById("modeChangeGuardModalBody").textContent = options.message;
    const confirmBtn = document.getElementById("modeChangeGuardConfirmBtn");
    const cancelBtn = document.getElementById("modeChangeGuardCancelBtn");
    confirmBtn.textContent = options.confirmLabel;
    confirmBtn.className = options.confirmClass || "btn btn-danger";
    cancelBtn.textContent = options.cancelLabel || "Cancel";

    $(confirmBtn)
        .off("click.modeGuard")
        .on("click.modeGuard", function () {
            options.onConfirm();
        });
    $(cancelBtn)
        .off("click.modeGuard")
        .on("click.modeGuard", function () {
            if (typeof options.onCancel === "function") {
                options.onCancel();
            }
        });

    modal.show();
}

function finalizePendingModeChange(targetModeOverride = null) {
    const targetMode =
        typeof targetModeOverride === "string" && targetModeOverride
            ? targetModeOverride
            : (pendingModeChange ? pendingModeChange.targetMode : "");

    if (!targetMode) {
        return;
    }

    applyCommittedConfigMode(targetMode);
    clearPendingModeChange();
}

function handleRuntimeStatusUpdate(status) {
    if (
        pendingModeChange &&
        pendingModeChange.prerequisite === "stop" &&
        pendingModeChange.awaitingRuntimeIdle === true &&
        (!status || status.txState !== "transmitting")
    ) {
        finalizePendingModeChange();
    }
}

function requestConfigModeChange(targetMode) {
    if (suppressModeChangeGuard) {
        return;
    }

    const normalizedTargetMode = ["WSPR", "QRSS", "FSKCW", "DFCW"].includes(targetMode)
        ? targetMode
        : "WSPR";
    const previousMode = currentConfigModeSelection;

    if (normalizedTargetMode === previousMode) {
        applyCommittedConfigMode(previousMode);
        return;
    }

    const runtimeStatus =
        typeof currentRuntimeStatus === "object" && currentRuntimeStatus !== null
            ? currentRuntimeStatus
            : null;
    const transmitting = runtimeStatus && runtimeStatus.txState === "transmitting";
    const transmitEnabled = $("#transmit").is(":checked");

    if (typeof suspendConfigAutosave === "function") {
        suspendConfigAutosave(true);
    }

    if (transmitting) {
        revertConfigModeSelection();
        pendingModeChange = {
            targetMode: normalizedTargetMode,
            prerequisite: "stop",
            awaitingRuntimeIdle: false,
        };
        showModeChangeGuardModal({
            title: "Stop transmission to change mode",
            message: "A transmission is in progress. Stop it before switching modes.",
            confirmLabel: "Stop transmission",
            confirmClass: "btn btn-danger",
            onConfirm() {
                modeChangeGuardBusy = true;
                const modal = modeChangeGuardModalInstance();
                if (modal) {
                    modal.hide();
                }
                if (!stopTransmission()) {
                    clearPendingModeChange();
                }
            },
            onCancel() {
                clearPendingModeChange();
            },
        });
        return;
    }

    if (transmitEnabled) {
        revertConfigModeSelection();
        pendingModeChange = {
            targetMode: normalizedTargetMode,
            prerequisite: "disable",
        };
        showModeChangeGuardModal({
            title: "Disable transmissions to change mode",
            message: "Disable transmissions before switching modes.",
            confirmLabel: "Disable & switch",
            confirmClass: "btn btn-danger",
            onConfirm() {
                const requestedMode = normalizedTargetMode;
                modeChangeGuardBusy = true;
                const modal = modeChangeGuardModalInstance();
                if (modal) {
                    modal.hide();
                }
                requestTransmitEnabledChange(false, true, {
                    updateCheckboxOnSuccess: true,
                    syncAutosaveBaselineOnSuccess: false,
                    onSuccess() {
                        finalizePendingModeChange(requestedMode);
                    },
                    onFailure() {
                        clearPendingModeChange();
                    },
                });
            },
            onCancel() {
                clearPendingModeChange();
            },
        });
        return;
    }

    applyCommittedConfigMode(normalizedTargetMode);
}

function updateRuntimeControlStatusFromForm(mode) {
    if (typeof updateRuntimeControlConfigStatus !== "function") {
        return;
    }

    updateRuntimeControlConfigStatus(
        mode || selectedConfigMode(),
        $("#transmit").is(":checked")
    );

    syncStopButtonState();
}

function selectedTransmitBackend() {
    const backend = String($("#transmit_backend").val() || "gpio").toLowerCase();
    return backend === "si5351" ? "si5351" : "gpio";
}

function showBackendStatus(message, level = "warning", source = "runtime") {
    const $status = $("#backendStatus");
    if (!$status.length) {
        return;
    }

    const alertClass =
        level === "danger" ? "alert-danger" :
        level === "info" ? "alert-info" :
        "alert-warning";

    $status
        .removeClass("d-none alert-warning alert-danger alert-info")
        .addClass(alertClass)
        .attr("data-source", source)
        .text(message);
}

function clearBackendStatus(source = null) {
    const $status = $("#backendStatus");
    if (!$status.length) {
        return;
    }

    if (source && $status.attr("data-source") !== source) {
        return;
    }

    $status
        .addClass("d-none")
        .removeClass("alert-warning alert-danger alert-info")
        .removeAttr("data-source")
        .text("");
}

function gpioPlatformRestrictionMessage() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    if (
        typeof platform.gpioClockTransmissionError === "string" &&
        platform.gpioClockTransmissionError.trim()
    ) {
        return platform.gpioClockTransmissionError.trim();
    }

    return "GPIO transmission is supported only on Raspberry Pi 1 through 4.";
}

function si5351UnavailableMessage() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    if (
        typeof platform.si5351DetectionError === "string" &&
        platform.si5351DetectionError.trim()
    ) {
        return platform.si5351DetectionError.trim();
    }

    return "Si5351 transmission is unavailable because no Si5351 device was detected on the I2C bus.";
}

function selectedBackendUnavailableMessage() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    const backend = selectedTransmitBackend();

    if (backend === "gpio" && platform.gpioClockTransmissionSupported === false) {
        return gpioPlatformRestrictionMessage();
    }

    if (backend === "si5351" && platform.si5351Detected === false) {
        return si5351UnavailableMessage();
    }

    return "";
}

function isGpioUnsupportedReason(reason) {
    const normalized = String(reason || "").toLowerCase();
    if (!normalized) {
        return false;
    }

    return (
        normalized.includes("gpio transmission") ||
        normalized.includes("raspberry pi 5 and newer") ||
        normalized.includes("supported only on raspberry pi 1 through 4") ||
        normalized.includes("unsupported on this raspberry pi")
    );
}

function isSi5351MissingReason(reason) {
    const normalized = String(reason || "").toLowerCase();
    if (!normalized) {
        return false;
    }

    return (
        normalized.includes("no si5351") ||
        normalized.includes("si5351 device was detected") ||
        normalized.includes("i2c bus")
    );
}

function backendInlineHintMessage() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    const backend = selectedTransmitBackend();

    if (backend === "si5351" && platform.si5351Detected === false) {
        return "No Si5351 detected on the configured I2C bus.";
    }

    if (backend === "gpio" && platform.gpioClockTransmissionSupported === false) {
        return "GPIO transmission is supported only on Raspberry Pi 1 through 4.";
    }

    return "";
}

function formatBackendBannerMessage(reason) {
    if (isGpioUnsupportedReason(reason)) {
        return "Transmission is unavailable with the GPIO backend on this Raspberry Pi. Use the Si5351 backend to enable transmission.";
    }

    if (isSi5351MissingReason(reason)) {
        return "Transmission is unavailable because no Si5351 was detected on the configured I2C bus. Check I2C bus, address, wiring, and power, or select a different backend.";
    }

    return reason;
}

function formatTransmitFailureMessage(reason) {
    if (isGpioUnsupportedReason(reason)) {
        return "Transmit cannot be enabled with the GPIO backend on this Raspberry Pi.";
    }

    if (isSi5351MissingReason(reason)) {
        return "Transmit cannot be enabled because no Si5351 was detected on the configured I2C bus.";
    }

    return reason;
}

function formatReloadFailureMessage(reason) {
    if (isGpioUnsupportedReason(reason)) {
        return "Configuration rejected: GPIO transmission is not supported on this Raspberry Pi.";
    }

    if (isSi5351MissingReason(reason)) {
        return "Configuration rejected: no Si5351 device was detected on the configured I2C bus.";
    }

    return reason;
}

function updateBackendPlatformSupportUi() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    const gpioSupported = platform.gpioClockTransmissionSupported !== false;
    const backendWarning = selectedBackendUnavailableMessage();
    const $gpioOption = $('#transmit_backend option[value="gpio"]');
    const $hint = $("#backendPlatformHint");

    $gpioOption.text(gpioSupported ? "GPIO" : "GPIO (Unsupported on this Pi)");
    $gpioOption.prop("disabled", !gpioSupported);
    $hint.text(backendInlineHintMessage());

    if (backendWarning) {
        showBackendStatus(formatBackendBannerMessage(backendWarning), "warning", "platform");
    } else {
        clearBackendStatus("platform");
    }
}

function syncCalibrationControls() {
    const backend = selectedTransmitBackend();
    const useNtp = backend === "gpio" && $("#use_ntp").is(":checked");
    const $ppm = $("#ppm");
    const $ppmCw = $("#ppm_cw");

    $ppm.prop("disabled", useNtp);
    $ppmCw.prop("disabled", useNtp);

    if (useNtp) {
        $ppm.removeClass("is-valid is-invalid").prop("required", false);
        $ppmCw.removeClass("is-valid is-invalid").prop("required", false);
    } else {
        $ppm.prop("required", true);
        $ppmCw.prop("required", true);
    }
}

function syncPpmFields(source = "wspr") {
    const $ppm = $("#ppm");
    const $ppmCw = $("#ppm_cw");

    if (!$ppm.length || !$ppmCw.length) {
        return;
    }

    if (source === "cw") {
        $ppm.val($ppmCw.val());
    } else {
        $ppmCw.val($ppm.val());
    }
}

function clickTransmitBackend() {
    const backend = selectedTransmitBackend();
    const gpioActive = backend === "gpio";
    const $gpioPanel = $("#gpio-backend-panel");
    const $si5351Panel = $("#si5351-backend-panel");

    $gpioPanel.toggleClass("d-none", !gpioActive);
    $si5351Panel.toggleClass("d-none", gpioActive);

    $gpioPanel
        .find("input, select, button")
        .prop("disabled", !gpioActive);
    $si5351Panel
        .find("input, select, button")
        .prop("disabled", gpioActive);

    syncCalibrationControls();
    updateBackendPlatformSupportUi();
    validateTransmitterHardwareFields();
    validatePage();
    scheduleAutosave();
}

// GPIO transmit power slider update
function updateGpioPowerLabel() {
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
    $("#gpio-power-range-value").html(label);
}

function updateSi5351PowerLabel() {
    var val = this.value;
    var rangeValues = {
        1: "2mA",
        2: "4mA",
        3: "6mA",
        4: "8mA",
    };
    var label = rangeValues[val] || val;
    $("#si5351-power-range-value").html(label);
}

function clickUseLED() {
    const on = $("#use_led").prop("checked");
    $("#ledDropdownButton").prop("disabled", !on);
    refreshBandGpioOptions();
    scheduleAutosave();
}

function clickUseShutdown() {
    const on = $('#use_shutdown').prop('checked');
    $('#shutdownDropdownButton').prop('disabled', !on);
    refreshBandGpioOptions();
    scheduleAutosave();
}

function getBandGpioRows() {
    return $("#bandGpioTable tbody tr[data-band]");
}

function getBandGpioHeaderCheckboxes() {
    return {
        enabled: $("#band-gpio-enabled-all"),
        activeHigh: $("#band-gpio-active-high-all")
    };
}

function getBandGpioColumnCheckboxes(column) {
    if (column === "enabled") {
        return getBandGpioRows().find(".band-gpio-enabled");
    }

    if (column === "activeHigh") {
        return getBandGpioRows().find(".band-gpio-active-high");
    }

    return $();
}

function syncBandGpioColumnHeaderState(column) {
    const headerCheckboxes = getBandGpioHeaderCheckboxes();
    const $header = headerCheckboxes[column];
    if (!$header || !$header.length) {
        return;
    }

    const $columnCheckboxes = getBandGpioColumnCheckboxes(column);
    const total = $columnCheckboxes.length;

    if (total === 0) {
        $header.prop({
            checked: false,
            indeterminate: false,
            disabled: true
        });
        return;
    }

    const checkedCount = $columnCheckboxes.filter(":checked").length;
    $header.prop("disabled", false);
    $header.prop("checked", checkedCount === total);
    $header.prop("indeterminate", checkedCount > 0 && checkedCount < total);
}

function syncBandGpioColumnHeaderStates() {
    syncBandGpioColumnHeaderState("enabled");
    syncBandGpioColumnHeaderState("activeHigh");
}

function applyBandGpioColumnToggle(column, checked) {
    const $columnCheckboxes = getBandGpioColumnCheckboxes(column);
    if (!$columnCheckboxes.length) {
        syncBandGpioColumnHeaderStates();
        return;
    }

    if (column === "enabled") {
        getBandGpioRows().each(function () {
            const $row = $(this);
            setBandGpioRowState($row, checked);
        });
    } else {
        $columnCheckboxes.prop("checked", checked);
    }

    syncBandGpioColumnHeaderStates();
    validateBandGpioFields();
    scheduleAutosave();
}

function setBandGpioRowState($row, enabled) {
    $row.find(".band-gpio-enabled").prop("checked", enabled);
    $row.find(".band-gpio-input").prop("disabled", !enabled);
    $row.find(".band-gpio-active-high").prop("disabled", !enabled);
}

function clickBandGpioEnabled() {
    const $row = $(this).closest("tr[data-band]");
    setBandGpioRowState($row, $(this).is(":checked"));
    syncBandGpioColumnHeaderStates();
    validateBandGpioFields();
    scheduleAutosave();
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
    syncBandGpioColumnHeaderStates();
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
                "Enter a 4-character or 6-character Maidenhead locator such as EM18 or EM18IG."
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
    let invalidCount = 0;
    const activeSelectors = ["#global_runtime_control"];
    const mode = selectedConfigMode();

    if (mode === "WSPR") {
        activeSelectors.push("#wspr_config");
        if (!validateFrequencies()) {
            invalidCount++;
        }
        clearValidationState("#qrss_config");
    } else {
        activeSelectors.push("#qrss_config");
        if (!validateCwBaseFrequency()) {
            invalidCount++;
        }
        if (!validateCwDotSeconds()) {
            invalidCount++;
        }
        if (!validateCwMessage()) {
            invalidCount++;
        }
        if (!validateCwShiftHz()) {
            invalidCount++;
        }
        if (!validateCwRepeatMinutes()) {
            invalidCount++;
        }
        clearValidationState("#wspr_config");
    }

    if (!validateTransmitterHardwareFields()) {
        invalidCount++;
    }

    validateBandGpioFields();

    // ONLY visible/relevant .form-control elements for the selected mode.
    document
        .querySelectorAll(
            activeSelectors.join(", ") + " .form-control:not(.form-check-input)"
        )
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

function clearValidationState(selector) {
    document.querySelectorAll(`${selector} .form-control`).forEach((ctrl) => {
        ctrl.setCustomValidity("");
        ctrl.classList.remove("is-valid", "is-invalid");
    });
}

function syncConfigModeSections() {
    const selected = $('input[name="mode_toggle"]:checked').val();
    if (selected === "QRSS") {
        $('#wspr_config').hide();
        $('#qrss_config').show();
        if (!$('input[name="qrss_type"]:checked').length) {
            $('input[name="qrss_type"][value="QRSS"]').prop("checked", true);
        }
        syncSelectedCwModeControls();
    } else {
        $('#qrss_config').hide();
        $('#wspr_config').show();
    }

    updateRuntimeControlStatusFromForm(null);
}

function applyConfigModeSelection(mode) {
    const normalizedMode = ["WSPR", "QRSS", "FSKCW", "DFCW"].includes(mode)
        ? mode
        : "WSPR";

    if (normalizedMode === "WSPR") {
        $('input[name="mode_toggle"][value="WSPR"]').prop("checked", true);
    } else {
        $('input[name="mode_toggle"][value="QRSS"]').prop("checked", true);
        $(`input[name="qrss_type"][value="${normalizedMode}"]`).prop("checked", true);
    }

    syncConfigModeSections();
    currentConfigModeSelection = selectedConfigMode();
}

function clickModeToggle() {
    requestConfigModeChange(selectedConfigMode());
}


function clickQRSSModeToggle() {
    requestConfigModeChange(selectedConfigMode());
}

function syncSelectedCwModeControls() {
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
    syncCalibrationControls();
    validatePage();
    scheduleAutosave();
}

function setTxPin(gpioNumber) {
    const normalizedPin = gpioNumber === 20 ? 20 : 4;
    $("#tx_pin").val(String(normalizedPin));
}

function getTxPin() {
    const raw = String($("#tx_pin").val() || "").trim();
    const pin = parseInt(raw, 10);
    return Number.isInteger(pin) ? pin : null;
}

function formatSi5351Address(value) {
    const raw = String(value ?? "").trim();
    if (!raw) {
        return "";
    }

    if (!/^(?:0[xX][0-9A-Fa-f]+|[0-9]+)$/.test(raw)) {
        return raw;
    }

    const parsed = Number.parseInt(raw, 0);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return raw;
    }

    return "0x" + parsed.toString(16).toUpperCase();
}

function setSi5351AddressValue(value) {
    $("#si5351_i2c_address").val(formatSi5351Address(value)).trigger("change");
}

function normalizeIntegerInputValue(selector, fallback) {
    const parsed = parseInt($(selector).val(), 10);
    return Number.isInteger(parsed) ? parsed : fallback;
}

function validateSi5351I2cAddress() {
    const fld = document.getElementById("si5351_i2c_address");
    if (!fld) return true;

    const raw = String(fld.value || "").trim();
    let valid = true;

    if (!raw) {
        fld.setCustomValidity("I2C address is required.");
        valid = false;
    } else if (!/^(?:0[xX][0-9A-Fa-f]+|[0-9]+)$/.test(raw)) {
        fld.setCustomValidity("Enter a decimal or 0x-prefixed hexadecimal I2C address.");
        valid = false;
    } else {
        const parsed = Number.parseInt(raw, 0);
        if (!Number.isInteger(parsed) || parsed < 0x03 || parsed > 0x77) {
            fld.setCustomValidity("Enter an I2C address from 0x03 through 0x77.");
            valid = false;
        } else {
            fld.setCustomValidity("");
            fld.value = formatSi5351Address(raw);
        }
    }

    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);
    return valid;
}

function validateTransmitterHardwareFields() {
    const backend = selectedTransmitBackend();
    let invalidCount = 0;

    const gpioPower = normalizeIntegerInputValue("#gpio-power-range", 7);
    const si5351Bus = normalizeIntegerInputValue("#si5351_i2c_bus", 1);
    const si5351Reference = normalizeIntegerInputValue("#si5351_reference_frequency", 27000000);
    const si5351Power = normalizeIntegerInputValue("#si5351-power-range", 1);

    const txPin = getTxPin();
    const txPinValid = txPin === 4 || txPin === 20;
    const txPinField = document.getElementById("tx_pin");
    if (txPinField) {
        txPinField.setCustomValidity(
            backend === "gpio" && !txPinValid
                ? "Only GPIO4 and GPIO20 support GPCLK0 clock output."
                : ""
        );
    }
    $("#tx_pin").toggleClass("is-invalid", backend === "gpio" && !txPinValid);
    $("#tx_pin").toggleClass("is-valid", backend === "gpio" && txPinValid);
    if (backend === "gpio" && !txPinValid) {
        invalidCount++;
    } else if (backend !== "gpio") {
        $("#tx_pin").removeClass("is-valid is-invalid");
    }

    const gpioPowerValid = gpioPower >= 0 && gpioPower <= 7;
    $("#gpio-power-range").toggleClass("is-invalid", backend === "gpio" && !gpioPowerValid);
    if (backend === "gpio" && !gpioPowerValid) {
        invalidCount++;
    }

    const busValid = si5351Bus >= 0;
    $("#si5351_i2c_bus")
        .get(0)
        .setCustomValidity(busValid ? "" : "I2C bus must be 0 or greater.");
    $("#si5351_i2c_bus").toggleClass("is-invalid", backend === "si5351" && !busValid);
    $("#si5351_i2c_bus").toggleClass("is-valid", backend === "si5351" && busValid);
    if (backend === "si5351" && !busValid) {
        invalidCount++;
    }

    const refValid = si5351Reference > 0;
    $("#si5351_reference_frequency")
        .get(0)
        .setCustomValidity(refValid ? "" : "Reference frequency must be greater than 0.");
    $("#si5351_reference_frequency")
        .toggleClass("is-invalid", backend === "si5351" && !refValid);
    $("#si5351_reference_frequency")
        .toggleClass("is-valid", backend === "si5351" && refValid);
    if (backend === "si5351" && !refValid) {
        invalidCount++;
    }

    const si5351PowerValid = si5351Power >= 1 && si5351Power <= 4;
    $("#si5351-power-range")
        .toggleClass("is-invalid", backend === "si5351" && !si5351PowerValid);
    if (backend === "si5351" && !si5351PowerValid) {
        invalidCount++;
    }

    if (backend === "si5351" && !validateSi5351I2cAddress()) {
        invalidCount++;
    } else if (backend !== "si5351") {
        const fld = document.getElementById("si5351_i2c_address");
        if (fld) {
            fld.setCustomValidity("");
            fld.classList.remove("is-valid", "is-invalid");
        }
    }

    return invalidCount === 0;
}

function setLEDPin(gpioNumber) {
    const code = "GPIO" + gpioNumber;
    const $btn = $("#ledDropdownButton");
    const $item = $(`.dropdown-item[data-val="${code}"]`);
    if ($item.length) {
        $btn.text(code);
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
    const code = $item.data('val');
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
    scheduleAutosave();
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
        $btn.attr("title", $item.text().trim());
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

function buildConfigPayload() {
    // Mode: WSPR uses WSPR fields; QRSS/FSKCW/DFCW use the shared CW section.
    let mode = selectedConfigMode();

    // Runtime
    let transmit = parseBool($("#transmit").is(":checked"));
    let use_led = parseBool($("#use_led").is(":checked"));
    let led_pin = parseInt(getLEDPin()) || 18;
    let use_shutdown = parseBool($("#use_shutdown").is(":checked"));
    let shutdown_pin = parseInt(getShutdownPin()) || 19;
    let band_gpio = collectBandGpioConfig();
    let transmit_backend = selectedTransmitBackend();

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
    let cw_base_frequency = parseFrequencyWithOptionalUnits($('#qrss_frequency').val());
    let tx_start_minute = parseInt($('#tx_start_minute').val(), 10);
    let tx_repeat_every = parseInt($('#tx_repeat_every').val(), 10);
    let cw_message = String($('#qrss_message').val() || "").trim();
    if (!Number.isFinite(dot_length)) dot_length = 3.0;
    if (!Number.isFinite(fsk_offset)) fsk_offset = 0.0;
    if (!Number.isFinite(cw_base_frequency)) cw_base_frequency = 0.0;
    if (!Number.isInteger(tx_start_minute)) tx_start_minute = 0;
    if (!Number.isInteger(tx_repeat_every)) tx_repeat_every = 10;

    // GPIO timing calibration
    let use_ntp = parseBool($("#use_ntp").is(":checked"));
    let ppmSource = $('input[name="mode_toggle"]:checked').val() === "QRSS"
        ? $("#ppm_cw").val()
        : $("#ppm").val();
    let ppm_val = parseFloat(ppmSource) || 0.0;

    let gpio_tx_pin = parseInt(getTxPin(), 10);
    if (gpio_tx_pin !== 4 && gpio_tx_pin !== 20) {
        gpio_tx_pin = 4;
    }

    const raw = $("#gpio-power-range").val();
    let transmit_power = parseInt(raw, 10);
    if (!(transmit_power >= 0 && transmit_power <= 7)) {
        transmit_power = 7;
    }

    let si5351_i2c_bus = parseInt($("#si5351_i2c_bus").val(), 10);
    if (!Number.isInteger(si5351_i2c_bus) || si5351_i2c_bus < 0) {
        si5351_i2c_bus = 1;
    }

    let si5351_i2c_address = formatSi5351Address(
        $("#si5351_i2c_address").val() || "0x60"
    );
    if (!si5351_i2c_address) {
        si5351_i2c_address = "0x60";
    }

    let si5351_reference_frequency = parseInt($("#si5351_reference_frequency").val(), 10);
    if (!Number.isInteger(si5351_reference_frequency) || si5351_reference_frequency <= 0) {
        si5351_reference_frequency = 27000000;
    }

    let si5351_power_level = parseInt($("#si5351-power-range").val(), 10);
    if (!(si5351_power_level >= 1 && si5351_power_level <= 4)) {
        si5351_power_level = 1;
    }

    var Operation = {
        "Mode": mode,
        "Transmit": transmit,
        "Transmit Backend": transmit_backend,
        "Use LED": use_led,
        "LED Pin": led_pin,
        "Use Shutdown": use_shutdown,
        "Shutdown Button": shutdown_pin,
    };

    var GPIO = {
        "Power Level": transmit_power,
        "Use NTP": use_ntp,
        "Transmit Pin": gpio_tx_pin,
    };

    var Si5351 = {
        "I2C Bus": si5351_i2c_bus,
        "I2C Address": si5351_i2c_address,
        "Reference Frequency": si5351_reference_frequency,
        "Power Level": si5351_power_level,
    };

    var Calibration = {
        "PPM": ppm_val,
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

    return {
        Operation,
        GPIO,
        Si5351,
        Calibration,
        WSPR,
        CW,
        "Band GPIO": band_gpio,
    };
}

function setConfigSaveStatus(state, message = "") {
    const node = document.getElementById("configSaveStatus");
    if (!node) {
        return;
    }

    if (configSaveStatusClearTimer) {
        clearTimeout(configSaveStatusClearTimer);
        configSaveStatusClearTimer = null;
    }

    node.dataset.state = state || "";
    node.textContent = message;
    node.classList.toggle("is-visible", !!message);

    if (state === "saved" && message) {
        configSaveStatusClearTimer = window.setTimeout(() => {
            node.textContent = "";
            node.dataset.state = "";
            node.classList.remove("is-visible");
            configSaveStatusClearTimer = null;
        }, 1800);
    }
}

function suspendConfigAutosave(suspended) {
    configAutosaveSuspended = !!suspended;
    if (configAutosaveSuspended && configAutosaveTimer) {
        clearTimeout(configAutosaveTimer);
        configAutosaveTimer = null;
    }
}

function syncConfigAutosaveBaseline() {
    if (typeof validatePage !== "function" || !validatePage()) {
        lastSavedConfigPayload = "";
        lastFailedConfigPayload = "";
        configAutosaveDirty = false;
        setConfigSaveStatus("", "");
        return;
    }

    const payloadJson = JSON.stringify(buildConfigPayload());
    lastSavedConfigPayload = payloadJson;
    lastFailedConfigPayload = "";
    configAutosaveDirty = false;
    configAutosavePendingAfterFlight = false;
    pendingPersistedMode = "";
    setConfigSaveStatus("saved", "Saved");
}

function scheduleAutosave() {
    if (configAutosaveSuspended) {
        return;
    }

    configAutosaveDirty = true;
    if (configAutosaveTimer) {
        clearTimeout(configAutosaveTimer);
    }

    configAutosaveTimer = window.setTimeout(() => {
        configAutosaveTimer = null;
        flushAutosave();
    }, CONFIG_AUTOSAVE_DELAY_MS);
}

function flushAutosave() {
    if (configAutosaveSuspended) {
        return;
    }

    if (!validatePage()) {
        setConfigSaveStatus("invalid", "Invalid - not saved");
        return;
    }

    const payloadJson = JSON.stringify(buildConfigPayload());

    if (payloadJson === lastSavedConfigPayload) {
        configAutosaveDirty = false;
        lastFailedConfigPayload = "";
        setConfigSaveStatus("saved", "Saved");
        return;
    }

    if (payloadJson === lastFailedConfigPayload) {
        configAutosaveDirty = false;
        debugConsole("warn", "Suppressing autosave retry for unchanged rejected payload.");
        setConfigSaveStatus("error", "Save failed");
        return;
    }

    if (configAutosaveInFlight) {
        configAutosavePendingAfterFlight = true;
        return;
    }

    configAutosaveInFlight = true;
    configAutosaveDirty = false;
    configAutosavePendingAfterFlight = false;
    setConfigSaveStatus("saving", "Saving...");

    $.ajax({
        url: SETTINGS_URL,
        type: "PATCH",
        contentType: "application/merge-patch+json",
        data: payloadJson,
    })
        .done(function () {
            lastSaveTimestamp = Date.now();
            lastSavedConfigPayload = payloadJson;
            lastFailedConfigPayload = "";
            pendingPersistedMode = "";
            setConfigSaveStatus("saved", "Saved");
            if (configAutosaveNeedsRuntimeRefresh && typeof getTxState === "function") {
                configAutosaveNeedsRuntimeRefresh = false;
                getTxState();
            }
        })
        .fail(function (xhr) {
            let message = "Save failed";
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

            debugConsole("error", "Autosave failed:", message);
            lastFailedConfigPayload = payloadJson;
            configAutosaveDirty = false;
            setConfigSaveStatus("error", "Save failed");
        })
        .always(function () {
            configAutosaveInFlight = false;

            if (configAutosavePendingAfterFlight || configAutosaveDirty) {
                configAutosavePendingAfterFlight = false;
                scheduleAutosave();
            }
        });
}

/**
 * Validate the WSPR “Frequencies” field.
 * @returns {boolean} true if valid, false otherwise.
 */
function splitWsprFrequencyTokens(raw) {
    return String(raw || "")
        .replace(/,/g, " ")
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0);
}

function validateWsprFrequencyBaseToken(token) {
    const trimmed = String(token || "").trim();
    if (!trimmed) {
        return false;
    }

    const bandAliases = new Set([
        "lf",
        "2200m",
        "mf",
        "630m",
        "160m",
        "80m",
        "60m",
        "40m",
        "30m",
        "22m",
        "20m",
        "17m",
        "15m",
        "12m",
        "10m",
        "6m",
        "4m",
        "2m",
    ]);
    if (bandAliases.has(trimmed.toLowerCase())) {
        return true;
    }

    const numericRx = /^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:hz|khz|mhz|ghz)?$/i;
    if (!numericRx.test(trimmed)) {
        return false;
    }

    return Number.isFinite(Number.parseFloat(trimmed));
}

function validateWsprFrequencyToken(token) {
    const trimmed = String(token || "").trim();
    if (!trimmed) {
        return false;
    }

    const atPos = trimmed.indexOf("@");
    if (atPos === -1) {
        return validateWsprFrequencyBaseToken(trimmed);
    }

    if (trimmed.indexOf("@", atPos + 1) !== -1) {
        return false;
    }

    const baseToken = trimmed.slice(0, atPos).trim();
    let gpioToken = trimmed.slice(atPos + 1).trim();
    if (!baseToken || !gpioToken) {
        return false;
    }

    const suffix = gpioToken.slice(-1).toUpperCase();
    if (suffix === "H" || suffix === "L") {
        gpioToken = gpioToken.slice(0, -1).trim();
        if (!gpioToken) {
            return false;
        }
    }

    if (!/^\d+$/.test(gpioToken)) {
        return false;
    }

    const gpio = Number.parseInt(gpioToken, 10);
    if (!Number.isInteger(gpio) || gpio < 0 || gpio > 27) {
        return false;
    }

    return validateWsprFrequencyBaseToken(baseToken);
}

function validateFrequencies() {
    let valid = true;
    const fld = document.getElementById("frequencies");
    const raw = fld.value.trim();

    // Empty is invalid
    if (!raw) {
        valid = false;
    }

    const tokens = splitWsprFrequencyTokens(raw);

    for (const tok of tokens) {
        if (!validateWsprFrequencyToken(tok)) {
            valid = false;
            break;
        }
    }

    fld.setCustomValidity(
        valid
            ? ""
            : "Enter WSPR band names like 20m or 2200m, numeric frequencies or 0, separated by spaces or commas. Optional @GPIO, @GPIOH, or @GPIOL suffixes are supported."
    );

    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

function parseFrequencyWithOptionalUnits(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) {
        return Number.NaN;
    }

    const numericRx = /^(\d+(?:\.\d+)?)(hz|khz|mhz|ghz)?$/i;
    const match = raw.match(numericRx);
    if (!match) {
        return Number.NaN;
    }

    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) {
        return Number.NaN;
    }

    const unit = (match[2] || "").toLowerCase();
    if (unit === "ghz") {
        return value * 1e9;
    }
    if (unit === "mhz") {
        return value * 1e6;
    }
    if (unit === "khz") {
        return value * 1e3;
    }
    return value;
}

/**
 * Validate the shared CW “Base Frequency” field.
 * @returns {boolean} true if valid, false otherwise.
 */
function validateCwBaseFrequency() {
    const fld = document.getElementById("qrss_frequency");
    const raw = fld.value.trim();

    let valid = true;

    if (!raw) {
        valid = false;
    }

    // Only accept one frequency
    const tokens = raw.split(/\s+/);
    if (tokens.length !== 1) {
        valid = false;
    }

    if (valid) {
        const value = parseFrequencyWithOptionalUnits(raw);
        if (!Number.isFinite(value) || value <= 0) {
            valid = false;
        }
    }

    fld.setCustomValidity(valid ? "" : "Enter a positive CW base frequency.");

    // Apply visual styling
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

function validateCwMessage() {
    const fld = document.getElementById("qrss_message");
    const message = String(fld.value || "").trim();
    const valid = message.length > 0;

    fld.setCustomValidity(valid ? "" : "CW message is required.");
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

function validateCwDotSeconds() {
    const fld = document.getElementById("dot_length");
    const mode = selectedConfigMode();

    if (mode === "WSPR" || fld.disabled) {
        fld.setCustomValidity("");
        fld.classList.remove("is-invalid");
        fld.classList.remove("is-valid");
        return true;
    }

    const value = Number.parseFloat(fld.value);
    const valid = Number.isFinite(value) && value > 0;

    fld.setCustomValidity(valid ? "" : "Enter a positive CW dot length.");
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

function validateCwShiftHz() {
    const fld = document.getElementById("fsk_offset");
    const mode = selectedConfigMode();

    if (mode === "QRSS" || fld.disabled) {
        fld.setCustomValidity("");
        fld.classList.remove("is-invalid");
        fld.classList.remove("is-valid");
        return true;
    }

    const value = Number.parseFloat(fld.value);
    const valid = Number.isFinite(value) && value > 0;

    fld.setCustomValidity(valid ? "" : "Enter a positive CW frequency offset.");
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}

function validateCwRepeatMinutes() {
    const fld = document.getElementById("tx_repeat_every");
    const mode = selectedConfigMode();

    if (mode === "WSPR" || fld.disabled) {
        fld.setCustomValidity("");
        fld.classList.remove("is-invalid");
        fld.classList.remove("is-valid");
        return true;
    }

    const value = Number.parseInt(fld.value, 10);
    const valid = Number.isInteger(value) && value > 0;

    fld.setCustomValidity(valid ? "" : "Enter a repeat interval of at least 1 minute.");
    fld.classList.toggle("is-invalid", !valid);
    fld.classList.toggle("is-valid", valid);

    return valid;
}


function setHardwareControlsDisabled(disabled) {
    const controlIds = [
        "#transmit",
        "#stop_transmit",
        "#planner_preference",
        "#transmit_backend",
        "#tx_pin",
        "#gpio-power-range",
        "#use_ntp",
        "#si5351_i2c_bus",
        "#si5351_i2c_address",
        "#si5351_reference_frequency",
        "#si5351-power-range",
        "#use_led",
        "#ledDropdownButton",
        "#use_shutdown",
        "#shutdownDropdownButton",
        "#test_tone"
    ];

    controlIds.forEach((selector) => {
        $(selector).prop("disabled", disabled);
    });

    if (!disabled) {
        syncStopButtonState();
    }

    syncCalibrationControls();

    getBandGpioRows().each(function () {
        const $row = $(this);
        $row.find(".band-gpio-enabled").prop("disabled", disabled);
        $row.find(".band-gpio-input").prop("disabled", disabled || !$row.find(".band-gpio-enabled").is(":checked"));
        $row.find(".band-gpio-active-high").prop("disabled", disabled || !$row.find(".band-gpio-enabled").is(":checked"));
    });

    const headerCheckboxes = getBandGpioHeaderCheckboxes();
    Object.values(headerCheckboxes).forEach(($header) => {
        if ($header && $header.length) {
            $header.prop("disabled", disabled || !getBandGpioRows().length);
        }
    });
    syncBandGpioColumnHeaderStates();
}

function setOfflineDefaults() {
    setTransmitFromBackend(false);
    $("#transmit_backend").val("gpio");
    setTxPin(4);
    $("#gpio-power-range").val(7);
    updateGpioPowerLabel.call(document.getElementById("gpio-power-range"));
    $("#use_ntp").prop("checked", true);
    $("#si5351_i2c_bus").val(1);
    setSi5351AddressValue(0x60);
    $("#si5351_reference_frequency").val(27000000);
    $("#si5351-power-range").val(1);
    updateSi5351PowerLabel.call(document.getElementById("si5351-power-range"));
    clickTransmitBackend();
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
    clickTransmitBackend();
}
