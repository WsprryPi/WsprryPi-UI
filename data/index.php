<!DOCTYPE html>
<html lang="en" data-bs-theme="light">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- This page's css -->
    <link rel="stylesheet" href="index.css" />
</head>

<?php
require_once 'page_shell_start.php';

$defaultLedGpio = 'GPIO18';
$defaultShutdownGpio = 'GPIO19';
$bandGpioBands = ['2200m', '630m', '160m', '80m', '60m', '40m', '30m', '22m', '20m', '17m', '15m', '12m', '10m', '6m', '4m', '2m'];
?>

            <div class="card-header pb-0">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-2">
                    <!-- Mode Toggle and Hostname -->
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <div class="btn-group" role="group" aria-label="Mode Toggle">
                            <input type="radio" class="btn-check" name="mode_toggle" id="wspr_mode" value="WSPR" autocomplete="off" checked>
                            <label class="btn btn-outline-primary" for="wspr_mode">WSPR</label>

                            <input type="radio" class="btn-check" name="mode_toggle" id="qrss_mode" value="QRSS" autocomplete="off">
                            <label class="btn btn-outline-primary" for="qrss_mode">CW Modes</label>
                        </div>
                        <span>Configuration for: <?php echo gethostname(); ?></span>
                    </div>

                    <!-- Reboot, Shutdown and Clocks -->
                    <?php require_once 'clock_and_reboot.php'; ?>
                </div>

                <ul class="nav nav-tabs card-header-tabs" id="configTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button
                            class="nav-link active"
                            id="radio-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#radio-pane"
                            type="button"
                            role="tab"
                            aria-controls="radio-pane"
                            aria-selected="true">
                            Radio
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button
                            class="nav-link"
                            id="transmitter-hardware-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#transmitter-hardware-pane"
                            type="button"
                            role="tab"
                            aria-controls="transmitter-hardware-pane"
                            aria-selected="false">
                            Transmitter Hardware
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button
                            class="nav-link"
                            id="pi-hardware-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#pi-hardware-pane"
                            type="button"
                            role="tab"
                            aria-controls="pi-hardware-pane"
                            aria-selected="false">
                            Pi Hardware
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card-body">

                <form id="wsprform" class="needs-validation" novalidate>

                    <div class="tab-content pt-3" id="configTabsContent">
                        <div
                            class="tab-pane fade show active"
                            id="radio-pane"
                            role="tabpanel"
                            aria-labelledby="radio-tab"
                            tabindex="0">
                            <fieldset class="mb-4" id="global_runtime_control">
                                <legend>Transmitter Control</legend>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-4 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="transmit">Enable Transmit:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="transmit">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-12 col-lg-2">
                                        <button type="button" class="btn btn-danger btn-sm" id="stop_transmit">
                                            Stop
                                        </button>
                                    </div>
                                    <div class="col-12 col-lg-3">
                                        <div class="small text-body-secondary">Runtime Status</div>
                                        <div class="small">Mode: <span id="runtime_mode_value">Unknown</span></div>
                                    </div>
                                    <div class="col-12 col-lg-3">
                                        <div class="small text-body-secondary">WSPR Runtime</div>
                                        <div class="small" id="runtime_wspr_plan_value">Not available</div>
                                    </div>
                                </div>
                            </fieldset>

                            <div id="wspr_config">
                                <!-- Section 2: Operator Information -->
                                <fieldset class="mb-4" id="op_info">
                                    <legend>Station Info</legend>
                                    <div class="row gx-2 align-items-center">
                                        <!-- Left column: Call Sign -->
                                        <div class="col-md-6 mb-3 d-flex align-items-center">
                                            <label for="callsign" class="form-label mb-0 me-2 flex-shrink-0">
                                                Call Sign:
                                            </label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="text"
                                                    id="callsign"
                                                    class="form-control"
                                                    data-bs-toggle="tooltip"
                                                    title="Enter a callsign, compound callsign, or explicit Type 3 callsign such as K1ABC, AA0NT/12, or <AA0NT>"
                                                    required />
                                            </div>
                                        </div>
                                        <!-- Right column: Grid Square -->
                                        <div class="col-md-6 mb-3 d-flex align-items-center">
                                            <label for="gridsquare" class="form-label mb-0 me-2 flex-shrink-0">
                                                Grid Square:
                                            </label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="text"
                                                    id="gridsquare"
                                                    class="form-control"
                                                    data-bs-toggle="tooltip"
                                                    title="Enter a 4-character or 6-character Maidenhead locator such as FN20 or FN20AB"
                                                    required />
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <!-- Section 3: Transmitter Information -->
                                <fieldset class="mb-4" id="tx_info">
                                    <legend>Transmission Settings</legend>
                                    <div class="row gx-2 align-items-center">
                                        <div class="col-md-8 mb-3 d-flex align-items-center">
                                            <label for="frequencies" class="form-label mb-0 me-2 flex-shrink-0">
                                                Frequencies:
                                            </label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="text"
                                                    id="frequencies"
                                                    class="form-control"
                                                    data-bs-toggle="tooltip"
                                                    title="You may enter one or more frequencies in plain numeric form (Hz), with a magnitude indicator (Hz, KHz, MHz), or in band notation such as 20m. A 0 is a skipped transmission window."
                                                    required />
                                            </div>
                                        </div>

                                        <div class="col-md-4 mb-3 d-flex align-items-center">
                                            <label for="dbm" class="form-label mb-0 me-2 flex-shrink-0">
                                                TX dBm:
                                            </label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="text"
                                                    id="dbm"
                                                    class="form-control"
                                                    pattern="^(?:0|3|7|10|13|17|20|23|27|30|33|37|40|43|47|50|53|57|60)$"
                                                    data-bs-toggle="tooltip"
                                                    title="Valid dBm are one of: 0, 3, 7, 10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, or 60"
                                                    required />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row gx-2 align-items-center">
                                        <div class="col-12 mb-3">
                                            <label for="planner_preference" class="form-label">
                                                Planner preference
                                            </label>
                                            <select
                                                id="planner_preference"
                                                class="form-select"
                                                data-bs-toggle="tooltip"
                                                title="Choose how WsprryPi selects single-frame or paired WSPR planning for extended identities.">
                                                <option value="auto">Automatic</option>
                                                <option value="prefer_paired">Prefer paired when available</option>
                                                <option value="require_paired">Require paired</option>
                                            </select>
                                            <div class="form-text">
                                                Automatic uses a single-frame plan when possible and upgrades to paired when required.<br>
                                                Prefer paired when available chooses paired planning when supported.<br>
                                                Require paired rejects identities that cannot be sent as a paired plan.
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="mb-4">
                                    <legend>Frequency Calibration</legend>
                                    <div class="row gx-2 align-items-center">
                                        <div class="col-md-6 mb-3 d-flex align-items-center">
                                            <label for="ppm" class="form-label mb-0 me-2 flex-shrink-0">PPM Offset</label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="number"
                                                    class="form-control flex-grow-1"
                                                    id="ppm"
                                                    min="-200"
                                                    max="200"
                                                    step="0.000001"
                                                    data-bs-toggle="tooltip"
                                                    title="Enter a decimal value between -200.000000 to 200.000000">
                                            </div>
                                        </div>

                                        <div class="col-md-6 mb-3 d-flex align-items-center">
                                            <div class="form-check form-switch form-check-reverse mb-0">
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    data-bs-toggle="tooltip"
                                                    title="WSPR.Use Random Offset: randomize WSPR transmit frequency around the dial-derived RF frequency"
                                                    id="useoffset" />
                                                <label class="form-check-label mb-0" for="useoffset">
                                                    Use Random Offset
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                            </div>

                            <div id="qrss_config" style="display: none;">
                                <!-- Shared CW settings used by QRSS, FSKCW, and DFCW. -->
                                <fieldset class="mb-4" id="qrss_control">
                                    <legend>CW Control</legend>

                                    <!-- First Row -->
                                    <div class="row gx-2 gy-3 align-items-center">

                                        <!-- CW Mode -->
                                        <div class="col-12 col-lg-4">
                                            <fieldset class="d-flex align-items-center gap-3 flex-wrap border-0 p-0 m-0">
                                                <legend class="form-label mb-0 flex-shrink-0">Mode:</legend>
                                                <div id="mode_select" class="d-flex flex-wrap gap-3">
                                                    <div class="form-check">
                                                        <input
                                                            class="form-check-input"
                                                            type="radio"
                                                            name="qrss_type"
                                                            id="mode_qrss"
                                                            value="QRSS">
                                                        <label class="form-check-label" for="mode_qrss">QRSS</label>
                                                    </div>
                                                    <div class="form-check">
                                                        <input
                                                            class="form-check-input"
                                                            type="radio"
                                                            name="qrss_type"
                                                            id="mode_fskcw"
                                                            value="FSKCW">
                                                        <label class="form-check-label" for="mode_fskcw">FSKCW</label>
                                                    </div>
                                                    <div class="form-check">
                                                        <input
                                                            class="form-check-input"
                                                            type="radio"
                                                            name="qrss_type"
                                                            id="mode_dfcw"
                                                            value="DFCW">
                                                        <label class="form-check-label" for="mode_dfcw">DFCW</label>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>

                                        <!-- Dot Seconds -->
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="dot_length" class="form-label mb-0 me-2 flex-shrink-0">Dot Seconds:</label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="number"
                                                    class="form-control flex-grow-1"
                                                    id="dot_length"
                                                    min="1"
                                                    max="60"
                                                    step="1"
                                                    data-bs-toggle="tooltip"
                                                    title="CW.Dot Seconds: dot length in seconds for QRSS, FSKCW, and DFCW"
                                                    value="3"
                                                    required />
                                            </div>
                                        </div>

                                        <!-- Shift Hz -->
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="fsk_offset" class="form-label mb-0 me-2 flex-shrink-0">Shift Hz:</label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="number"
                                                    class="form-control flex-grow-1"
                                                    id="fsk_offset"
                                                    min="0"
                                                    max="1000"
                                                    step="0.01"
                                                    data-bs-toggle="tooltip"
                                                    title="CW.Shift Hz: FSKCW mark and DFCW dash frequency are Base Frequency + Shift Hz. QRSS ignores this field."
                                                    value="0"
                                                    required />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Second Row -->
                                    <div class="row gx-2 gy-3 align-items-center mt-1">

                                        <!-- Base Frequency -->
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="qrss_frequency" class="form-label mb-0 me-2 flex-shrink-0">Base Frequency:</label>
                                            <input
                                                type="text"
                                                class="form-control flex-grow-1"
                                                id="qrss_frequency"
                                                data-bs-toggle="tooltip"
                                                title="CW.Base Frequency in Hz. QRSS uses this directly; FSKCW/DFCW add Shift Hz for the second tone."
                                                value="7040000.0"
                                                required />
                                        </div>

                                        <!-- Start Time -->
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="tx_start_minute" class="form-label mb-0 me-2 flex-shrink-0">Start Time:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="tx_start_minute"
                                                min="0"
                                                max="59"
                                                step="1"
                                                data-bs-toggle="tooltip"
                                                title="Start time in minutes after the hour (0-59)"
                                                value="0"
                                                required />
                                        </div>

                                        <!-- Repeat Every -->
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="tx_repeat_every" class="form-label mb-0 me-2 flex-shrink-0">Repeat Every:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="tx_repeat_every"
                                                min="1"
                                                max="60"
                                                step="1"
                                                data-bs-toggle="tooltip"
                                                title="CW.Repeat Minutes: repeat interval in minutes"
                                                value="10"
                                                required />
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="mb-4" id="qrss_message_set">
                                    <legend>CW Message</legend>
                                    <div class="row gx-2 gy-3 align-items-center mt-1">
                                        <div class="col-12 col-lg-12 d-flex align-items-center">
                                            <input
                                                type="text"
                                                class="form-control flex-grow-1"
                                                id="qrss_message"
                                                maxlength="59"
                                                step="1"
                                                data-bs-toggle="tooltip"
                                                title="CW.Message sent by QRSS, FSKCW, or DFCW"
                                                value="Hello"
                                                required />
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                        </div>

                        <div
                            class="tab-pane fade"
                            id="transmitter-hardware-pane"
                            role="tabpanel"
                            aria-labelledby="transmitter-hardware-tab"
                            tabindex="0">
                            <fieldset class="mb-4">
                                <legend>Transmit Backend</legend>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-4">
                                        <label for="transmit_backend" class="form-label">Transmit Backend</label>
                                        <select
                                            id="transmit_backend"
                                            class="form-select"
                                            data-bs-toggle="tooltip"
                                            title="Choose the RF hardware backend used for transmission.">
                                            <option value="gpio">GPIO</option>
                                            <option value="si5351">Si5351</option>
                                        </select>
                                        <div id="backendPlatformHint" class="form-text mt-2"></div>
                                    </div>
                                </div>
                                <div id="backendStatus" class="alert d-none mt-3 mb-0" role="alert"></div>
                            </fieldset>

                            <fieldset class="mb-4 backend-settings-panel" id="gpio-backend-panel">
                                <legend>GPIO Hardware</legend>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-4 d-flex align-items-center">
                                        <label for="tx_pin" class="form-label mb-0 me-2 flex-shrink-0">Transmit Pin:</label>
                                        <div class="flex-grow-1">
                                            <select
                                                id="tx_pin"
                                                class="form-select"
                                                data-bs-toggle="tooltip"
                                                title="Only GPIO4 and GPIO20 support GPCLK0 clock output on the 40-pin header.">
                                                <option value="4">GPIO4</option>
                                                <option value="20">GPIO20</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="col-12 col-lg-4">
                                        <label for="gpio-power-range" class="form-label">Power Level</label>
                                        <div class="d-flex justify-content-center align-items-center">
                                            <input
                                                type="range"
                                                id="gpio-power-range"
                                                class="form-range me-3"
                                                style="width: 60%;"
                                                min="0"
                                                max="7"
                                                step="1"
                                                value="7" />
                                            <label for="gpio-power-range" class="form-label small mb-0">
                                                <span id="gpio-power-range-value" class="small"></span>
                                            </label>
                                        </div>
                                    </div>

                                    <div class="col-12 col-lg-4 d-flex align-items-center">
                                        <div class="form-check form-switch form-check-reverse mb-0">
                                            <input
                                                class="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                data-bs-toggle="tooltip"
                                                title="Use NTP for GPIO frequency calibration"
                                                id="use_ntp" />
                                            <label
                                                class="form-check-label mb-0"
                                                for="use_ntp">
                                                Use NTP
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset class="mb-4 backend-settings-panel d-none" id="si5351-backend-panel">
                                <legend>Si5351 Hardware</legend>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-3">
                                        <label for="si5351_i2c_bus" class="form-label">I2C Bus</label>
                                        <input
                                            type="number"
                                            id="si5351_i2c_bus"
                                            class="form-control"
                                            min="0"
                                            step="1"
                                            inputmode="numeric"
                                            data-bs-toggle="tooltip"
                                            title="Linux I2C bus number for the Si5351 device." />
                                    </div>

                                    <div class="col-12 col-lg-3">
                                        <label for="si5351_i2c_address" class="form-label">I2C Address</label>
                                        <input
                                            type="text"
                                            id="si5351_i2c_address"
                                            class="form-control"
                                            pattern="^(?:0[xX][0-9A-Fa-f]+|[0-9]+)$"
                                            inputmode="text"
                                            data-bs-toggle="tooltip"
                                            title="Enter a decimal or 0x-prefixed hexadecimal I2C address." />
                                    </div>

                                    <div class="col-12 col-lg-3">
                                        <label for="si5351_reference_frequency" class="form-label">Reference Frequency</label>
                                        <input
                                            type="number"
                                            id="si5351_reference_frequency"
                                            class="form-control"
                                            min="1"
                                            step="1"
                                            inputmode="numeric"
                                            data-bs-toggle="tooltip"
                                            title="Reference oscillator frequency in Hz." />
                                    </div>

                                    <div class="col-12 col-lg-3">
                                        <label for="si5351-power-range" class="form-label">Power Level</label>
                                        <div class="d-flex justify-content-center align-items-center">
                                            <input
                                                type="range"
                                                id="si5351-power-range"
                                                class="form-range me-3"
                                                style="width: 60%;"
                                                min="1"
                                                max="4"
                                                step="1"
                                                value="1" />
                                            <label for="si5351-power-range" class="form-label small mb-0">
                                                <span id="si5351-power-range-value" class="small"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>
                        </div>

                        <div
                            class="tab-pane fade"
                            id="pi-hardware-pane"
                            role="tabpanel"
                            aria-labelledby="pi-hardware-tab"
                            tabindex="0">
                            <fieldset class="mb-4">
                                <legend>Hardware Control</legend>

                                <!-- Transmit LED, LED Pin, Enable Shutdown, Shutdown Pin -->
                                <div class="row gx-2 gy-2 align-items-center mb-2">
                                    <!-- Transmit LED -->
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_led">Transmit LED:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_led">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- LED Pin -->
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <label for="ledDropdownButton" class="form-label mb-0 me-2 flex-shrink-0">LED Pin:</label>
                                        <div class="dropdown flex-grow-1">
                                            <?php
                                            $dropdownId = "ledDropdownButton";
                                            $defaultGpio = $defaultLedGpio;
                                            ?>
                                            <button id="ledDropdownButton"
                                                class="btn btn-outline-secondary dropdown-toggle w-100 text-start pin-dropdown-btn"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                title="GPIO18 (Pin 12 - TAPR LED)">
                                                <?= htmlspecialchars($defaultLedGpio) ?>
                                            </button>
                                            <?php include 'gpio_dropdown.php'; ?>
                                        </div>
                                    </div>

                                    <!-- Enable Shutdown -->
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_shutdown">Enable Shutdown:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_shutdown" title="Enable to shutdown system when a button is pushed">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Shutdown Pin -->
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <label for="shutdownDropdownButton" class="form-label mb-0 me-2 flex-shrink-0">Shutdown Pin:</label>
                                        <div class="dropdown flex-grow-1">
                                            <?php
                                            $dropdownId = "shutdownDropdownButton";
                                            $defaultGpio = $defaultShutdownGpio;
                                            ?>
                                            <button id="shutdownDropdownButton"
                                                class="btn btn-outline-secondary dropdown-toggle w-100 text-start pin-dropdown-btn"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                title="GPIO19 (Pin 35 - TAPR Shutdown)">
                                                <?= htmlspecialchars($defaultShutdownGpio) ?>
                                            </button>
                                            <?php include 'gpio_dropdown.php'; ?>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset class="mb-4">
                                <legend>Band GPIO</legend>
                                <div class="table-responsive">
                                    <table class="table table-sm align-middle mb-0" id="bandGpioTable">
                                        <thead>
                                            <tr>
                                                <th scope="col">Band</th>
                                                <th scope="col">Enabled</th>
                                                <th scope="col">GPIO</th>
                                                <th scope="col">Active High</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($bandGpioBands as $band): ?>
                                                <tr data-band="<?= htmlspecialchars($band) ?>">
                                                    <th scope="row"><?= htmlspecialchars($band) ?></th>
                                                    <td data-label="Enabled">
                                                        <div class="form-check mb-0">
                                                            <input
                                                                class="form-check-input band-gpio-enabled"
                                                                type="checkbox"
                                                                id="band-gpio-enabled-<?= htmlspecialchars($band) ?>"
                                                                data-band="<?= htmlspecialchars($band) ?>">
                                                        </div>
                                                    </td>
                                                    <td data-label="GPIO">
                                                        <?php
                                                        $gpioRenderMode = 'select';
                                                        $selectId = 'band-gpio-gpio-' . $band;
                                                        $selectName = $selectId;
                                                        $selectClass = 'form-select form-select-sm band-gpio-input';
                                                        $selectDataBand = $band;
                                                        $selectAttributes = 'disabled';
                                                        $defaultGpio = '';
                                                        $selectPlaceholder = 'Select GPIO';
                                                        include 'gpio_dropdown.php';
                                                        ?>
                                                    </td>
                                                    <td data-label="Active High">
                                                        <div class="form-check mb-0">
                                                            <input
                                                                class="form-check-input band-gpio-active-high"
                                                                type="checkbox"
                                                                id="band-gpio-active-high-<?= htmlspecialchars($band) ?>"
                                                                data-band="<?= htmlspecialchars($band) ?>"
                                                                disabled>
                                                        </div>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <!-- Section 8: Submit/Cancel/Test Tone -->
                    <fieldset class="mb-4">
                        <div class="d-flex justify-content-center gap-3">
                            <button
                                id="submit"
                                type="submit"
                                class="btn btn-danger"
                                data-bs-toggle="tooltip"
                                title="Save settings">
                                Save
                            </button>
                            <button
                                id="reset"
                                type="reset"
                                class="btn btn-secondary"
                                data-bs-toggle="tooltip"
                                title="Reset to saved settings">
                                Reset
                            </button>
                            <button
                                id="test_tone"
                                type="button"
                                class="btn btn-outline-warning"
                                data-bs-toggle="tooltip"
                                title="Click to generate a test tone">
                                Tone
                            </button>
                        </div>
                    </fieldset>

                    <!-- Test Tone Modal -->
                    <div
                        class="modal fade"
                        id="testToneModal"
                        tabindex="-1"
                        aria-labelledby="testToneModalLabel"
                        aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="testToneModalLabel">Test Tone</h5>
                                    <button
                                        type="button"
                                        class="btn-close"
                                        data-bs-dismiss="modal"
                                        aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    Use the controls below to start or stop the test tone.
                                </div>
                                <div class="modal-footer">
                                    <button
                                        type="button"
                                        id="testToneStart"
                                        class="btn btn-primary">
                                        Start
                                    </button>
                                    <button
                                        type="button"
                                        id="testToneEnd"
                                        class="btn btn-danger">
                                        End
                                    </button>
                                    <button
                                        type="button"
                                        id="testToneClose"
                                        class="btn btn-secondary"
                                        data-bs-dismiss="modal">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
<?php require_once 'page_shell_end.php'; ?>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- Index JavaScript -->
    <script src="index.js"></script>
</body>

</html>
