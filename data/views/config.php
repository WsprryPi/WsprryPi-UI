<?php
$defaultLedGpio = 'GPIO18';
$defaultShutdownGpio = 'GPIO19';
$bandGpioBands = ['2200m', '630m', '160m', '80m', '60m', '40m', '30m', '22m', '20m', '17m', '15m', '12m', '10m', '6m', '4m', '2m'];
?>

            <div class="card-header pb-0">
                <div class="config-header-bar mb-2">
                    <div class="config-header-context">
                        <div class="config-header-copy">
                            <div class="config-header-label">Control Surface</div>
                            <div class="config-header-title-row">
                                <div class="config-header-title">Signal setup</div>
                                <span
                                    id="configSaveStatus"
                                    class="config-save-status"
                                    aria-live="polite"
                                    aria-atomic="true"></span>
                            </div>
                        </div>
                    </div>

                    <div class="config-header-actions">
                        <button
                            type="button"
                            class="btn btn-danger btn-sm config-header-stop"
                            id="stop_transmit"
                            disabled>
                            Stop transmission
                        </button>
                        <?php require_once __DIR__ . '/../clock_and_reboot.php'; ?>
                    </div>
                </div>

                <ul class="nav nav-tabs card-header-tabs" id="configTabs" role="tablist" data-persist-tab-state="true" data-persist-tab-state-scope="reload">
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
                            Signal Setup
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
                            Transmitter
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
                            Pi I/O
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card-body">

                <form id="wsprform" class="needs-validation" novalidate>
                    <fieldset class="config-operator-strip mb-4" id="global_runtime_control">
                        <legend class="visually-hidden">Operating controls</legend>
                        <div class="config-operator-panel config-operator-panel--mode">
                            <div class="config-operator-label">Signal mode</div>
                            <div class="btn-group config-mode-toggle" role="group" aria-label="Signal mode">
                                <input type="radio" class="btn-check" name="mode_toggle" id="wspr_mode" value="WSPR" autocomplete="off" checked>
                                <label class="btn config-mode-toggle__segment" for="wspr_mode">WSPR</label>

                                <input type="radio" class="btn-check" name="mode_toggle" id="qrss_mode" value="QRSS" autocomplete="off">
                                <label class="btn config-mode-toggle__segment" for="qrss_mode">CW Modes</label>
                            </div>
                        </div>

                        <div class="config-operator-panel config-operator-panel--runtime">
                            <div class="config-runtime-header">
                                <div class="config-runtime-header__copy">
                                    <div class="config-operator-label">Runtime state</div>
                                </div>
                                <div class="config-runtime-header__control">
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" role="switch" id="transmit">
                                        <label class="form-check-label" for="transmit">Transmit enabled</label>
                                    </div>
                                </div>
                            </div>
                            <div class="config-runtime-grid">
                                <div class="config-runtime-item">
                                    <div class="config-runtime-item__label">Current mode</div>
                                    <div class="config-runtime-item__value">Mode: <span id="runtime_mode_value">Unknown</span></div>
                                </div>
                                <div class="config-runtime-item">
                                    <div class="config-runtime-item__label" id="runtime_plan_label">Current WSPR plan</div>
                                    <div class="config-runtime-item__value" id="runtime_wspr_plan_value">Not available</div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <div class="tab-content pt-2" id="configTabsContent">
                        <div
                            class="tab-pane fade show active"
                            id="radio-pane"
                            role="tabpanel"
                            aria-labelledby="radio-tab"
                            tabindex="0">
                            <div id="wspr_config" class="config-section-stack">
                                <fieldset class="config-panel" id="op_info">
                                    <legend>WSPR Station Configuration</legend>
                                    <div class="row gx-2 align-items-center">
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
                                                    title="Enter a callsign, compound callsign, or explicit Type 3 callsign such as AA0NT, AA0NT/12, or <AA0NT>"
                                                    required />
                                            </div>
                                        </div>
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
                                                    title="Enter a 4-character or 6-character Maidenhead locator such as EM18 or EM18IG"
                                                    required />
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="config-panel" id="tx_info">
                                    <legend>WSPR Transmission Settings</legend>
                                    <div class="config-wspr-top-row">
                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--wide">
                                            <label for="frequencies" class="form-label">
                                                Frequencies:
                                            </label>
                                            <input
                                                type="text"
                                                id="frequencies"
                                                class="form-control"
                                                data-bs-toggle="tooltip"
                                                title="You may enter one or more frequencies in plain numeric form (Hz), with a magnitude indicator (Hz, KHz, MHz), or in band notation such as 20m. A 0 is a skipped transmission window."
                                                required />
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__item--toggle">
                                            <div class="config-wspr-top-row__toggle">
                                                <label class="form-check-label mb-0" for="useoffset">
                                                    Randomize
                                                </label>
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    data-bs-toggle="tooltip"
                                                    title="Randomly shift each WSPR transmission around the dial-derived RF frequency."
                                                    id="useoffset" />
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--dbm">
                                            <label for="dbm" class="form-label">
                                                TX dBm:
                                            </label>
                                            <select
                                                id="dbm"
                                                class="form-select"
                                                data-bs-toggle="tooltip"
                                                title="Valid dBm are one of: 0, 3, 7, 10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, or 60"
                                                required>
                                                <option value="0">0</option>
                                                <option value="3">3</option>
                                                <option value="7">7</option>
                                                <option value="10">10</option>
                                                <option value="13">13</option>
                                                <option value="17">17</option>
                                                <option value="20">20</option>
                                                <option value="23">23</option>
                                                <option value="27">27</option>
                                                <option value="30">30</option>
                                                <option value="33">33</option>
                                                <option value="37">37</option>
                                                <option value="40">40</option>
                                                <option value="43">43</option>
                                                <option value="47">47</option>
                                                <option value="50">50</option>
                                                <option value="53">53</option>
                                                <option value="57">57</option>
                                                <option value="60">60</option>
                                            </select>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--ppm">
                                            <label for="ppm" class="form-label">PPM Offset</label>
                                            <input
                                                type="number"
                                                class="form-control"
                                                id="ppm"
                                                min="-200"
                                                max="200"
                                                step="0.000001"
                                                data-bs-toggle="tooltip"
                                                title="Enter a decimal value between -200.000000 to 200.000000">
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__item--toggle">
                                            <div class="config-wspr-top-row__toggle">
                                                <label
                                                    class="form-check-label mb-0"
                                                    for="use_ntp">
                                                    Use NTP
                                                </label>
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    data-bs-toggle="tooltip"
                                                    title="Use NTP for GPIO frequency calibration"
                                                    id="use_ntp" />
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__planner">
                                            <label for="planner_preference" class="form-label">
                                                WSPR planning mode
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
                                        </div>
                                    </div>
                                </fieldset>

                            </div>

                            <div id="qrss_config" style="display: none;">
                                <fieldset class="config-panel" id="qrss_control">
                                    <legend>CW Control</legend>
                                    <p class="config-panel__summary">Choose the CW mode and timing first, then tune the base frequency and repeat interval.</p>

                                    <div class="row gx-2 gy-3 align-items-center">

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

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="fsk_offset" class="form-label mb-0 me-2 flex-shrink-0">Frequency Offset:</label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="number"
                                                    class="form-control flex-grow-1"
                                                    id="fsk_offset"
                                                    min="0"
                                                    max="1000"
                                                    step="0.01"
                                                    data-bs-toggle="tooltip"
                                                    title="CW.Shift Hz: offset in Hz from the base frequency for FSKCW and DFCW. QRSS ignores this field."
                                                    value="0"
                                                    required />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row gx-2 gy-3 align-items-center mt-1">

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

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="ppm_cw" class="form-label mb-0 me-2 flex-shrink-0">PPM Offset:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="ppm_cw"
                                                min="-200"
                                                max="200"
                                                step="0.000001"
                                                data-bs-toggle="tooltip"
                                                title="Calibration.PPM: frequency calibration offset applied to the transmitter clock." />
                                        </div>

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

                                <fieldset class="config-panel" id="qrss_message_set">
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
                            <fieldset class="config-panel">
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

                            <fieldset class="config-panel backend-settings-panel" id="gpio-backend-panel">
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

                                </div>
                            </fieldset>

                            <fieldset class="config-panel backend-settings-panel d-none" id="si5351-backend-panel">
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
                            <fieldset class="config-panel">
                                <legend>Hardware Control</legend>

                                <div class="row gx-2 gy-2 align-items-center mb-2">
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_led">Transmit LED:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_led">
                                            </div>
                                        </div>
                                    </div>

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
                                            <?php include __DIR__ . '/../gpio_dropdown.php'; ?>
                                        </div>
                                    </div>

                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_shutdown">Enable Shutdown:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_shutdown" title="Enable to shutdown system when a button is pushed">
                                            </div>
                                        </div>
                                    </div>

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
                                            <?php include __DIR__ . '/../gpio_dropdown.php'; ?>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset class="config-panel">
                                <legend>Band GPIO</legend>
                                <div class="table-responsive">
                                    <table class="table table-sm align-middle mb-0" id="bandGpioTable">
                                        <thead>
                                            <tr>
                                                <th scope="col">Band</th>
                                                <th scope="col">
                                                    <div class="d-inline-flex align-items-center gap-2">
                                                        <div class="form-check mb-0">
                                                            <input
                                                                class="form-check-input"
                                                                type="checkbox"
                                                                id="band-gpio-enabled-all"
                                                                aria-label="Toggle all Band GPIO enabled checkboxes">
                                                        </div>
                                                        <span>Enabled</span>
                                                    </div>
                                                </th>
                                                <th scope="col">GPIO</th>
                                                <th scope="col">
                                                    <div class="d-inline-flex align-items-center gap-2">
                                                        <div class="form-check mb-0">
                                                            <input
                                                                class="form-check-input"
                                                                type="checkbox"
                                                                id="band-gpio-active-high-all"
                                                                aria-label="Toggle all Band GPIO active high checkboxes">
                                                        </div>
                                                        <span>Active High</span>
                                                    </div>
                                                </th>
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
                                                        include __DIR__ . '/../gpio_dropdown.php';
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

                </form>

                <div
                    class="modal fade"
                    id="modeChangeGuardModal"
                    tabindex="-1"
                    aria-labelledby="modeChangeGuardModalLabel"
                    aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modeChangeGuardModalLabel">Change mode</h5>
                                <button
                                    type="button"
                                    class="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p id="modeChangeGuardModalBody" class="mb-0"></p>
                            </div>
                            <div class="modal-footer">
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    data-bs-dismiss="modal"
                                    id="modeChangeGuardCancelBtn">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-danger"
                                    id="modeChangeGuardConfirmBtn">
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
