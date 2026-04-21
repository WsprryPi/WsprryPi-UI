let isUpdatingTransmitFromBackend = false;
let stopRequestInFlight = false;
let stopRequestTimeoutHandle = null;
const CONFIG_REQUEST_TIMEOUT_MS = 15000;
const STOP_REQUEST_TIMEOUT_MS = 10000;

let currentRuntimeTransmitBackend = "gpio";
let operationSnapshotLoaded = false;
let operationSnapshot = {
    mode: "",
    transmit: false,
    callsign: "",
    gridsquare: "",
};

function browserOfflineOperationMessage() {
    return "This browser is offline, so runtime controls cannot reach the controller.";
}

function runtimeConnectionUnavailableMessage() {
    if (navigator.onLine === false) {
        return browserOfflineOperationMessage();
    }

    return "The controller connection is unavailable right now, so the action could not be completed.";
}

function transientRuntimeActionMessage(textStatus = "") {
    const normalizedStatus = typeof textStatus === "string"
        ? textStatus.trim().toLowerCase()
        : "";

    if (navigator.onLine === false) {
        return runtimeConnectionUnavailableMessage();
    }

    if (normalizedStatus === "timeout") {
        return "The controller did not respond before the action timed out. Check connectivity and try again.";
    }

    return runtimeConnectionUnavailableMessage();
}

function isTransientNetworkFailure(xhr, textStatus = "") {
    if (navigator.onLine === false) {
        return true;
    }

    const normalizedStatus = typeof textStatus === "string"
        ? textStatus.trim().toLowerCase()
        : "";

    if ((normalizedStatus === "timeout" || normalizedStatus === "error") &&
        (!xhr || typeof xhr.status !== "number" || xhr.status === 0)) {
        return true;
    }

    return !!xhr && typeof xhr.status === "number" && xhr.status === 0;
}

function selectedRuntimeTransmitBackend() {
    return currentRuntimeTransmitBackend === "si5351" ? "si5351" : "gpio";
}

function setSelectedRuntimeTransmitBackend(backend) {
    currentRuntimeTransmitBackend = backend === "si5351" ? "si5351" : "gpio";
}

function hasAnySupportedTransmitBackend() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    return (
        platform.gpioClockTransmissionSupported !== false ||
        platform.si5351Detected !== false
    );
}

function noBackendAvailableMessage() {
    return "No supported transmit backend is currently available on this system.";
}

function selectedBackendUnavailableMessage() {
    const platform = window.WSPRRYPI_PLATFORM || {};
    const backend = selectedRuntimeTransmitBackend();

    if (backend === "gpio" && platform.gpioClockTransmissionSupported === false) {
        return "GPIO transmission is supported only on Raspberry Pi 1 through 4.";
    }

    if (backend === "si5351" && platform.si5351Detected === false) {
        return "No Si5351 detected on the configured I2C bus.";
    }

    return "";
}

function currentTransmitUnavailableMessage() {
    return hasAnySupportedTransmitBackend()
        ? selectedBackendUnavailableMessage()
        : noBackendAvailableMessage();
}

function formatTransmitFailureMessage(reason) {
    if (reason === noBackendAvailableMessage()) {
        return "Transmit cannot be enabled because no supported backend is currently available.";
    }

    if (reason === "GPIO transmission is supported only on Raspberry Pi 1 through 4.") {
        return "Transmit cannot be enabled with the GPIO backend on this Raspberry Pi.";
    }

    if (reason === "No Si5351 detected on the configured I2C bus.") {
        return "Transmit cannot be enabled because no Si5351 was detected on the configured I2C bus.";
    }

    return reason;
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
        .prop("hidden", false)
        .removeClass("alert-warning alert-danger alert-info")
        .addClass(alertClass)
        .attr("data-source", source)
        .text(message);
}

function clearBackendStatus(source = null) {
    const $status = $("#backendStatus");
    if (!$status.length) {
        return;
    }

    const currentSource = $status.attr("data-source") || "";
    if (source && currentSource && currentSource !== source) {
        return;
    }

    $status
        .prop("hidden", true)
        .removeClass("alert-warning alert-danger alert-info")
        .removeAttr("data-source")
        .text("");
}

function setOperationRecoveryUi({
    show = false,
    retryVisible = false,
    retryDisabled = false,
    retryLabel = "Retry now",
    setupVisible = false,
    hint = "",
} = {}) {
    const container = document.getElementById("operationRecoveryActions");
    const retryButton = document.getElementById("operationRetryButton");
    const setupButton = document.getElementById("operationSetupButton");
    const hintNode = document.getElementById("operationRecoveryHint");

    if (!container || !retryButton || !setupButton || !hintNode) {
        return;
    }

    container.hidden = !show;
    retryButton.hidden = !retryVisible;
    retryButton.disabled = !!retryDisabled;
    retryButton.textContent = retryLabel;
    setupButton.hidden = !setupVisible;
    hintNode.textContent = hint;
}

function retryOperationRuntimeLoad() {
    if (navigator.onLine === false) {
        showBackendStatus(browserOfflineOperationMessage(), "warning", "runtime");
        updateOperationStatusSummary(currentRuntimeStatus);
        return;
    }

    clearBackendStatus("runtime");
    clearBackendStatus("backend");

    if (typeof reloadAllData === "function") {
        reloadAllData();
        return;
    }

    if (typeof populateConfig === "function") {
        populateConfig();
    }
    if (typeof getTxState === "function") {
        getTxState();
    }
}

function setRuntimeUiDisabled(disabled) {
    $("#transmit").prop("disabled", !!disabled);
    if (disabled) {
        $("#stop_transmit").prop("disabled", true);
        return;
    }

    syncStopButtonState();
    syncTransmitAvailabilityUi();
}

function setTransmitFromBackend(enabled) {
    isUpdatingTransmitFromBackend = true;
    $("#transmit").prop("checked", !!enabled);
    isUpdatingTransmitFromBackend = false;
    if (typeof updateRuntimeControlConfigStatus === "function") {
        updateRuntimeControlConfigStatus(
            operationSnapshot.mode || currentRuntimeConfigStatus.mode || "",
            !!enabled
        );
    }
}

function syncStopButtonState() {
    const $stop = $("#stop_transmit");
    if (!$stop.length) {
        return;
    }

    const transmitting =
        currentRuntimeStatus && currentRuntimeStatus.txState === "transmitting";
    $stop.prop("disabled", stopRequestInFlight || !transmitting);
}

function clearStopRequestTimeout() {
    if (stopRequestTimeoutHandle !== null) {
        clearTimeout(stopRequestTimeoutHandle);
        stopRequestTimeoutHandle = null;
    }
}

function failStopRequest(message) {
    clearStopRequestTimeout();
    stopRequestInFlight = false;
    syncStopButtonState();
    showBackendStatus(message, "warning", "runtime");
}

function syncTransmitAvailabilityUi() {
    const transmitField = document.getElementById("transmit");
    const transmitHint = document.getElementById("transmitAvailabilityHint");
    if (!transmitField) {
        return;
    }

    const unavailableMessage = currentTransmitUnavailableMessage();
    const formattedMessage = unavailableMessage
        ? formatTransmitFailureMessage(unavailableMessage)
        : "";
    const transmitEnabled = transmitField.checked;
    const shouldDisableEnable = !!unavailableMessage && !transmitEnabled;

    transmitField.disabled = shouldDisableEnable;
    if (shouldDisableEnable) {
        transmitField.setAttribute("title", formattedMessage);
    } else {
        transmitField.removeAttribute("title");
    }

    if (transmitHint) {
        transmitHint.hidden = !formattedMessage;
        transmitHint.textContent = formattedMessage;
    }
}

function requestTransmitEnabledChange(enabled, previousEnabled) {
    const $transmit = $("#transmit");

    if (enabled) {
        const unavailableMessage = currentTransmitUnavailableMessage();
        if (unavailableMessage) {
            const formattedMessage = formatTransmitFailureMessage(unavailableMessage);
            setTransmitFromBackend(previousEnabled);
            showBackendStatus(formattedMessage, "danger", "runtime");
            return null;
        }
    }

    if (navigator.onLine === false) {
        const message = runtimeConnectionUnavailableMessage();
        setTransmitFromBackend(previousEnabled);
        showBackendStatus(message, "warning", "runtime");
        return null;
    }

    $transmit.prop("disabled", true);

    return $.ajax({
        url: SETTINGS_URL,
        type: "PATCH",
        contentType: "application/merge-patch+json",
        timeout: CONFIG_REQUEST_TIMEOUT_MS,
        data: JSON.stringify({
            Operation: {
                "Transmit": enabled,
            },
        }),
    })
        .done(function () {
            lastSaveTimestamp = Date.now();
            setTransmitFromBackend(enabled);
            clearBackendStatus("runtime");
            if (typeof getTxState === "function") {
                getTxState();
            }
        })
        .fail(function (xhr, textStatus) {
            let message = "Failed to update transmit state.";

            if (isTransientNetworkFailure(xhr, textStatus)) {
                message = transientRuntimeActionMessage(textStatus);
                showBackendStatus(message, "warning", "runtime");
                setTransmitFromBackend(previousEnabled);
                return;
            }

            if (xhr.responseJSON && typeof xhr.responseJSON === "object" &&
                typeof xhr.responseJSON.message === "string" && xhr.responseJSON.message.trim()) {
                message = xhr.responseJSON.message.trim();
            }

            setTransmitFromBackend(previousEnabled);
            showBackendStatus(message, "danger", "runtime");
        })
        .always(function () {
            $transmit.prop("disabled", false);
            syncTransmitAvailabilityUi();
        });
}

function patchTransmitControl() {
    if (isUpdatingTransmitFromBackend) {
        return;
    }

    const enabled = $("#transmit").is(":checked");
    requestTransmitEnabledChange(enabled, !enabled);
}

function stopTransmission(options = {}) {
    const $stop = $("#stop_transmit");
    if ($stop.prop("disabled")) {
        return false;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showBackendStatus(runtimeConnectionUnavailableMessage(), "warning", "runtime");
        return false;
    }

    stopRequestInFlight = true;
    syncStopButtonState();
    clearStopRequestTimeout();
    stopRequestTimeoutHandle = window.setTimeout(() => {
        failStopRequest("Stop command timed out before the controller confirmed it. Check controller connectivity and runtime state, then try again.");
    }, STOP_REQUEST_TIMEOUT_MS);

    ws.send(
        JSON.stringify({
            command: "stop",
            persist_transmit:
                options && options.persistTransmit === false ? false : true,
        })
    );
    return true;
}

function handleStopCommandResponse(message) {
    const response = message && typeof message === "object" ? message : {};
    const stopSucceeded =
        response.transmit_disabled === true || response.stop_performed === true;
    clearStopRequestTimeout();

    if (response.transmit_disabled === true) {
        setTransmitFromBackend(false);
    }
    if (typeof getTxState === "function") {
        getTxState();
    }

    stopRequestInFlight = false;
    syncStopButtonState();

    if (!stopSucceeded) {
        showBackendStatus("The controller did not confirm the stop action. Check runtime state and try again.", "warning", "runtime");
    }
}

function handleOperationConfigSnapshot(snapshot = {}) {
    operationSnapshotLoaded = true;
    operationSnapshot = {
        mode: typeof snapshot.mode === "string" ? snapshot.mode : "",
        transmit: snapshot.transmit === true,
        callsign: typeof snapshot.callsign === "string" ? snapshot.callsign.trim() : "",
        gridsquare: typeof snapshot.gridsquare === "string" ? snapshot.gridsquare.trim() : "",
    };

    updateOperationStatusSummary(currentRuntimeStatus);
}

function updateOperationStatusSummary(status) {
    const stateNode = document.getElementById("operationCurrentState");
    const detailNode = document.getElementById("operationStateDetail");
    const hintNode = document.getElementById("operationNextActionHint");

    if (!stateNode || !detailNode || !hintNode) {
        return;
    }

    const callsignReady = !!operationSnapshot.callsign;
    const gridReady = !!operationSnapshot.gridsquare;
    const configuredEnough = callsignReady && gridReady;
    const txState = status && typeof status.txState === "string" ? status.txState : "";
    const transmitEnabled = currentRuntimeConfigStatus.transmitEnabled === true;
    const nextTransmissionAt =
        status && typeof status.nextTransmissionAt === "string"
            ? status.nextTransmissionAt
            : "";
    const unavailableMessage = currentTransmitUnavailableMessage();
    const websocketConnected = websocketCurrentlyConnected === true;
    const backendConnected = backendCurrentlyConnected === true;

    setOperationRecoveryUi();

    if (!operationSnapshotLoaded) {
        if (navigator.onLine === false) {
            stateNode.textContent = "Browser offline";
            detailNode.textContent = "Operation is waiting for this browser to reconnect before it can load current controller state.";
            hintNode.textContent = "Reconnect this browser, then retry loading runtime state.";
            setOperationRecoveryUi({
                show: true,
                retryVisible: true,
                retryDisabled: true,
                retryLabel: "Retry when online",
                hint: "Runtime loading will resume after this browser reconnects.",
            });
            return;
        }

        if (!backendConnected) {
            stateNode.textContent = "Controller unavailable";
            detailNode.textContent = "Operation could not load saved controller values, so live controls are temporarily unavailable.";
            hintNode.textContent = "Retry loading runtime state. If this persists after recovery, use Setup or Maintenance for investigation.";
            setOperationRecoveryUi({
                show: true,
                retryVisible: true,
                setupVisible: true,
                hint: "Retry now after the controller comes back, or open Setup to review saved values once communication is restored.",
            });
            return;
        }

        stateNode.textContent = "Loading runtime state";
        detailNode.textContent = "Connecting to the controller and loading the latest operating values.";
        hintNode.textContent = "Wait for the current runtime snapshot to load before using live controls.";
        return;
    }

    if (!configuredEnough) {
        stateNode.textContent = "Setup required";
        detailNode.textContent = "Station identity is incomplete. Open Setup before normal operation so the controller can build valid transmit frames.";
        hintNode.textContent = "Open Setup to complete callsign and grid before relying on this page for normal operation.";
        setOperationRecoveryUi({
            show: true,
            setupVisible: true,
            hint: "Complete callsign and grid in Setup before enabling normal on-air operation.",
        });
        return;
    }

    if (navigator.onLine === false) {
        stateNode.textContent = "Browser offline";
        detailNode.textContent = "Last known operating values remain visible, but live control is paused until this browser reconnects.";
        hintNode.textContent = "Reconnect this browser to resume live runtime control.";
        setOperationRecoveryUi({
            show: true,
            retryVisible: true,
            retryDisabled: true,
            retryLabel: "Retry when online",
            hint: "Live control resumes automatically when this browser reconnects.",
        });
        return;
    }

    if (!backendConnected || !websocketConnected) {
        stateNode.textContent = "Reconnecting";
        detailNode.textContent = "Last known operating values remain visible while Operation retries the controller connection.";
        hintNode.textContent = "Use Retry now if the controller is back but this page has not recovered yet.";
        setOperationRecoveryUi({
            show: true,
            retryVisible: true,
            hint: "Retry reloads saved values and requests a fresh runtime state immediately.",
        });
        return;
    }

    if (stopRequestInFlight) {
        stateNode.textContent = "Stopping transmission";
        detailNode.textContent = "A stop command is in flight. Wait for controller confirmation before retrying or changing transmit state.";
        hintNode.textContent = "If the controller does not confirm the stop request, a warning will appear and the control will re-enable.";
        return;
    }

    if (unavailableMessage) {
        stateNode.textContent = "Transmit unavailable";
        detailNode.textContent = formatTransmitFailureMessage(unavailableMessage);
        hintNode.textContent = "Review Transmitter settings in Setup before enabling transmissions from this page.";
        setOperationRecoveryUi({
            show: true,
            setupVisible: true,
            hint: "Open Setup to review backend hardware and saved RF output settings.",
        });
        return;
    }

    if (txState === "transmitting") {
        stateNode.textContent = "Transmitting";
        detailNode.textContent = "An active transmission is underway. Use Stop only if you need to interrupt it immediately.";
        hintNode.textContent = "Monitor the current mode and plan below. Open Setup only if you need to change saved operating values after the transmission stops.";
        return;
    }

    if (!transmitEnabled) {
        stateNode.textContent = "Transmit paused";
        detailNode.textContent = "Saved runtime settings are loaded, but transmissions are disabled until you re-enable them here.";
        hintNode.textContent = "Enable transmissions when you are ready to resume normal scheduling.";
        return;
    }

    stateNode.textContent = nextTransmissionAt ? "Standing by" : "Ready";
    detailNode.textContent = nextTransmissionAt
        ? `The controller is idle and waiting for the next scheduled activity at ${nextTransmissionAt}.`
        : "The controller is connected and ready. Review the current mode and plan below for operating context.";
    hintNode.textContent = "Use this page for live monitoring and high-level control. Open Setup only when a saved value needs to change.";
}

function handleRuntimeStatusUpdate(status) {
    syncStopButtonState();
    updateOperationStatusSummary(status);
}

function setOfflineDefaults() {
    setTransmitFromBackend(false);
    setRuntimeUiDisabled(true);
    updateOperationStatusSummary(null);
}

function clearOfflineDefaults() {
    setRuntimeUiDisabled(false);
    updateOperationStatusSummary(currentRuntimeStatus);
}

function bindOperationNetworkHandlers() {
    window.addEventListener("offline", () => {
        showBackendStatus(browserOfflineOperationMessage(), "warning", "runtime");
        updateOperationStatusSummary(currentRuntimeStatus);
    });

    window.addEventListener("online", () => {
        clearBackendStatus("runtime");
        syncTransmitAvailabilityUi();
        updateOperationStatusSummary(currentRuntimeStatus);
    });
}

function bindOperationActions() {
    $("#transmit").on("change", patchTransmitControl);
    $("#stop_transmit").on("click", stopTransmission);
    $("#operationRetryButton").on("click", retryOperationRuntimeLoad);
    bindOperationNetworkHandlers();
    syncTransmitAvailabilityUi();
    syncStopButtonState();
    updateOperationStatusSummary(currentRuntimeStatus);
}
