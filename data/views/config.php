<?php
$defaultLedGpio = 'GPIO18';
$defaultShutdownGpio = 'GPIO19';
$bandGpioBands = ['2200m', '630m', '160m', '80m', '60m', '40m', '30m', '22m', '20m', '17m', '15m', '12m', '10m', '6m', '4m', '2m'];
?>

            <div class="card-header pb-0">
                <div class="config-header-bar mb-2">
                    <div class="config-header-context">
                        <div class="config-header-copy">
                            <p class="config-header-label mb-0">Setup</p>
                            <div class="config-header-title-row" role="group" aria-labelledby="configPageTitle">
                                <h1 id="configPageTitle" class="config-header-title mb-0">Signal setup</h1>
                                <span
                                    id="configSaveStatus"
                                    class="config-save-status"
                                    aria-describedby="configSaveStatusHint configSaveStatusDetail"
                                    aria-live="polite"
                                    aria-atomic="true"></span>
                            </div>
                            <p class="config-header-summary mb-0">
                                Use Setup to define station identity, transmission behavior, and hardware mappings. For live status and transmit controls, use Operation.
                            </p>
                            <div id="configSaveStatusHint" class="form-text mt-2">
                                Changes save automatically. If a field is invalid, Setup keeps the edit locally and shows what still needs attention.
                            </div>
                            <div id="configSaveStatusDetail" class="form-text mt-2" aria-live="polite" aria-atomic="true" hidden></div>
                        </div>
                    </div>

                    <div class="config-header-actions">
                        <?php require_once __DIR__ . '/../clock_and_reboot.php'; ?>
                    </div>
                </div>

                <div id="config-tabs-hint" class="form-text mt-2 mb-2">
                    Signal Setup covers on-air identity and mode settings. Transmitter covers the RF output path and hardware. Pi I/O covers LED, shutdown, and band GPIO controls.
                </div>
                <ul class="nav nav-tabs card-header-tabs" id="configTabs" role="tablist" aria-describedby="config-tabs-hint" data-persist-tab-state="true" data-persist-tab-state-scope="reload">
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

                <form id="wsprform" class="needs-validation config-setup-form" novalidate>
                    <fieldset class="config-operator-strip mb-4" id="global_runtime_control">
                        <legend class="visually-hidden">Configuration scope</legend>
                        <div class="config-operator-panel config-operator-panel--mode">
                            <div class="config-operator-copy">
                                <h2 class="config-operator-label mb-0">Signal mode</h2>
                                <p class="mb-0">
                                    Choose the signal family first. Setup then shows only the identity, timing, and message fields that apply to that mode.
                                </p>
                            </div>
                            <div class="btn-group config-mode-toggle" role="group" aria-label="Signal mode" aria-describedby="signal-mode-hint">
                                <input type="radio" class="btn-check" name="mode_toggle" id="wspr_mode" value="WSPR" autocomplete="off" checked>
                                <label class="btn config-mode-toggle__segment" for="wspr_mode">WSPR</label>

                                <input type="radio" class="btn-check" name="mode_toggle" id="qrss_mode" value="QRSS" autocomplete="off">
                                <label class="btn config-mode-toggle__segment" for="qrss_mode">CW Modes</label>
                            </div>
                            <div id="signal-mode-hint" class="form-text mt-2">
                                WSPR shows beacon identity and scheduling. CW Modes shows QRSS, FSKCW, and DFCW timing, tone, and message settings.
                            </div>
                        </div>
                    </fieldset>

                    <div class="tab-content config-tabs-content" id="configTabsContent">
                        <div
                            class="tab-pane fade show active"
                            id="radio-pane"
                            role="tabpanel"
                            aria-labelledby="radio-tab"
                            tabindex="0">
                            <div class="config-pane-intro">
                                <span class="config-pane-intro__label">Signal Setup</span>
                                <p class="mb-0">
                                    Set what the transmitter identifies as on air, then choose the planning and timing details for the selected signal family.
                                </p>
                            </div>
                            <div id="wspr_config" class="config-section-stack">
                                <fieldset class="config-panel" id="op_info">
                                    <legend>WSPR Station Identity</legend>
                                    <p class="config-panel__summary">
                                        Enter the callsign and locator that WSPR reports on air.
                                    </p>
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
                                                    maxlength="32"
                                                    pattern="(?:[A-Za-z0-9/]+|&lt;[A-Za-z0-9/]+&gt;)"
                                                    autocapitalize="characters"
                                                    autocomplete="off"
                                                    spellcheck="false"
                                                    aria-describedby="callsign-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="Enter a callsign, compound callsign, or explicit Type 3 callsign such as AA0NT, AA0NT/12, or <AA0NT>"
                                                    required />
                                                <div id="callsign-hint" class="form-text mt-2">
                                                    Use letters, digits, and `/` with no spaces. Explicit Type 3 forms such as `&lt;AA0NT&gt;` are also accepted.
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3 d-flex align-items-center">
                                            <label for="gridsquare" class="form-label mb-0 me-2 flex-shrink-0">
                                                Grid locator:
                                            </label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="text"
                                                    id="gridsquare"
                                                    class="form-control"
                                                    pattern="[A-Za-z]{2}[0-9]{2}(?:[A-Za-z]{2})?"
                                                    maxlength="6"
                                                    autocapitalize="characters"
                                                    autocomplete="off"
                                                    spellcheck="false"
                                                    aria-describedby="gridsquare-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="Enter a 4-character or 6-character Maidenhead locator such as EM18 or EM18IG"
                                                    required />
                                                <div id="gridsquare-hint" class="form-text mt-2">
                                                    Use a 4-character or 6-character Maidenhead locator such as `EM18` or `EM18IG`.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="config-panel" id="tx_info">
                                    <legend>WSPR Transmission Plan</legend>
                                    <p class="config-panel__summary">
                                        Set the WSPR frequencies, reported power, calibration, and planning behavior used in WSPR mode.
                                    </p>
                                    <div class="config-wspr-top-row">
                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--wide">
                                            <label for="frequencies" class="form-label">
                                                Frequencies:
                                            </label>
                                            <input
                                                type="text"
                                                id="frequencies"
                                                class="form-control"
                                                maxlength="256"
                                                autocapitalize="off"
                                                autocomplete="off"
                                                spellcheck="false"
                                                aria-describedby="frequencies-hint"
                                                data-bs-toggle="tooltip"
                                                title="Enter one or more WSPR dial frequencies as numeric values with optional Hz/kHz/MHz/GHz units, or as band aliases such as 20m, 22m, 2200m, or 630m. Separate entries with spaces or commas. A 0 skips a transmission window. Append @GPIO, @GPIOH, or @GPIOL to override the selector for one entry."
                                                required />
                                                <div id="frequencies-hint" class="form-text mt-2">
                                                Separate entries with spaces or commas. Use band names such as `20m`, numeric values, or `0` to skip a slot. Optional `@GPIO`, `@GPIOH`, or `@GPIOL` suffixes are supported.
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__item--toggle">
                                            <div class="config-wspr-top-row__toggle">
                                                <label class="form-check-label mb-0" for="useoffset">
                                                    Random offset
                                                </label>
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    aria-describedby="useoffset-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="Randomly shift each WSPR transmission around the dial-derived RF frequency."
                                                    id="useoffset" />
                                                <div id="useoffset-hint" class="form-text mt-2">
                                                    Shift each WSPR transmission randomly around the selected dial-derived RF frequency.
                                                </div>
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--dbm">
                                            <label for="dbm" class="form-label">
                                                Reported power:
                                            </label>
                                            <select
                                                id="dbm"
                                                class="form-select"
                                                aria-describedby="dbm-hint"
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
                                            <div id="dbm-hint" class="form-text mt-2">
                                                Choose the standard WSPR power value to report on air, from 0 through 60 dBm.
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__field--ppm">
                                            <label for="ppm" class="form-label">Frequency calibration (PPM)</label>
                                            <input
                                                type="number"
                                                class="form-control"
                                                id="ppm"
                                                min="-200"
                                                max="200"
                                                step="0.000001"
                                                inputmode="decimal"
                                                aria-describedby="ppm-hint"
                                                data-bs-toggle="tooltip"
                                                title="Enter a decimal value between -200.000000 to 200.000000">
                                            <div id="ppm-hint" class="form-text mt-2">
                                                Enter the transmitter frequency calibration offset, from -200.000000 through 200.000000 PPM.
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__item--toggle">
                                            <div class="config-wspr-top-row__toggle">
                                                <label
                                                    class="form-check-label mb-0"
                                                    for="use_ntp">
                                                    NTP calibration
                                                </label>
                                                <input
                                                    class="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    aria-describedby="use-ntp-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="Use NTP for GPIO frequency calibration"
                                                    id="use_ntp" />
                                                <div id="use-ntp-hint" class="form-text mt-2">
                                                    Use NTP-based frequency calibration when the GPIO backend is active.
                                                </div>
                                            </div>
                                        </div>

                                        <div class="config-wspr-top-row__item config-wspr-top-row__field config-wspr-top-row__planner">
                                            <label for="planner_preference" class="form-label">
                                                Planning mode
                                            </label>
                                            <select
                                                id="planner_preference"
                                                class="form-select"
                                                aria-describedby="planner-preference-hint"
                                                data-bs-toggle="tooltip"
                                                title="Choose how WsprryPi selects single-frame or paired WSPR planning for extended identities.">
                                                <option value="auto">Automatic</option>
                                                <option value="prefer_paired">Prefer paired when available</option>
                                                <option value="require_paired">Require paired</option>
                                            </select>
                                            <div id="planner-preference-hint" class="form-text mt-2">
                                                Choose how extended identities use single or paired WSPR frames.
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                            </div>

                            <div id="qrss_config" hidden>
                                <fieldset class="config-panel" id="qrss_control">
                                    <legend>CW Control</legend>
                                    <p class="config-panel__summary">Choose the CW mode and timing first, then set frequency and repeat timing.</p>

                                    <div class="row gx-2 gy-3 align-items-center">

                                        <div class="col-12 col-lg-4">
                                            <fieldset class="d-flex align-items-center gap-3 flex-wrap border-0 p-0 m-0">
                                                <legend class="form-label mb-0 flex-shrink-0">Mode:</legend>
                                                <div id="mode_select" class="d-flex flex-wrap gap-3" aria-describedby="qrss-mode-hint">
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
                                                <div id="qrss-mode-hint" class="form-text mt-2">
                                                    QRSS uses the base frequency directly. FSKCW and DFCW also use the offset field to generate the second tone.
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
                                                    min="0.000000001"
                                                    step="any"
                                                    inputmode="decimal"
                                                    aria-describedby="dot-length-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="CW.Dot Seconds: dot length in seconds for QRSS, FSKCW, and DFCW"
                                                    value="3"
                                                    required />
                                                <div id="dot-length-hint" class="form-text mt-2">
                                                    Enter a positive dot length in seconds.
                                                </div>
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="fsk_offset" class="form-label mb-0 me-2 flex-shrink-0">Frequency Offset:</label>
                                            <div class="flex-grow-1">
                                                <input
                                                    type="number"
                                                    class="form-control flex-grow-1"
                                                    id="fsk_offset"
                                                    min="0.000000001"
                                                    step="0.01"
                                                    inputmode="decimal"
                                                    aria-describedby="fsk-offset-hint"
                                                    data-bs-toggle="tooltip"
                                                    title="CW.Shift Hz: offset in Hz from the base frequency for FSKCW and DFCW. QRSS ignores this field."
                                                    value="5"
                                                    required />
                                                <div id="fsk-offset-hint" class="form-text mt-2">
                                                    Enter a positive shift in Hz for FSKCW or DFCW. QRSS ignores this field.
                                                </div>
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
                                                inputmode="decimal"
                                                aria-describedby="qrss-frequency-hint"
                                                data-bs-toggle="tooltip"
                                                title="CW.Base Frequency in Hz. QRSS uses this directly; FSKCW/DFCW add Shift Hz for the second tone."
                                                value="14096900.0"
                                                required />
                                            <div id="qrss-frequency-hint" class="form-text mt-2">
                                                Enter one positive base frequency with optional `Hz`, `kHz`, `MHz`, or `GHz` units.
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="ppm_cw" class="form-label mb-0 me-2 flex-shrink-0">Frequency calibration:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="ppm_cw"
                                                min="-200"
                                                max="200"
                                                step="0.000001"
                                                inputmode="decimal"
                                                aria-describedby="ppm-cw-hint"
                                                data-bs-toggle="tooltip"
                                                title="Calibration.PPM: frequency calibration offset applied to the transmitter clock." />
                                            <div id="ppm-cw-hint" class="form-text mt-2">
                                                Enter the transmitter frequency calibration offset, from -200.000000 through 200.000000 PPM.
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="tx_start_minute" class="form-label mb-0 me-2 flex-shrink-0">Start minute:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="tx_start_minute"
                                                min="0"
                                                max="59"
                                                step="1"
                                                inputmode="numeric"
                                                aria-describedby="tx-start-minute-hint"
                                                data-bs-toggle="tooltip"
                                                title="Start time in minutes after the hour (0-59)"
                                                value="0"
                                                required />
                                            <div id="tx-start-minute-hint" class="form-text mt-2">
                                                Enter the minute after the hour when CW transmissions start, from 0 through 59.
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="tx_repeat_every" class="form-label mb-0 me-2 flex-shrink-0">Repeat interval:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="tx_repeat_every"
                                                min="1"
                                                step="1"
                                                inputmode="numeric"
                                                aria-describedby="tx-repeat-hint"
                                                data-bs-toggle="tooltip"
                                                title="CW.Repeat Minutes: repeat interval in minutes"
                                                value="10"
                                                required />
                                            <div id="tx-repeat-hint" class="form-text mt-2">
                                                Enter the repeat interval in minutes. Minimum: 1 minute.
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row gx-2 gy-3 align-items-center mt-1">
                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="cw_intra_element_gap" class="form-label mb-0 me-2 flex-shrink-0">Intra-Element Gap:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="cw_intra_element_gap"
                                                min="0.000000001"
                                                step="any"
                                                inputmode="decimal"
                                                aria-describedby="cw-intra-gap-hint"
                                                data-bs-toggle="tooltip"
                                                title="CW.Intra Element Gap: positive timing multiplier between Morse elements within a character."
                                                value="1"
                                                required />
                                            <div id="cw-intra-gap-hint" class="form-text mt-2">
                                                Enter a positive timing multiplier for gaps between Morse elements within one character.
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="cw_inter_character_gap" class="form-label mb-0 me-2 flex-shrink-0">Inter-Character Gap:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="cw_inter_character_gap"
                                                min="0.000000001"
                                                step="any"
                                                inputmode="decimal"
                                                aria-describedby="cw-inter-character-gap-hint"
                                                data-bs-toggle="tooltip"
                                                title="CW.Inter Character Gap: positive timing multiplier between Morse characters."
                                                value="3"
                                                required />
                                            <div id="cw-inter-character-gap-hint" class="form-text mt-2">
                                                Enter a positive timing multiplier for gaps between Morse characters.
                                            </div>
                                        </div>

                                        <div class="col-12 col-lg-4 d-flex align-items-center">
                                            <label for="cw_inter_word_gap" class="form-label mb-0 me-2 flex-shrink-0">Inter-Word Gap:</label>
                                            <input
                                                type="number"
                                                class="form-control flex-grow-1"
                                                id="cw_inter_word_gap"
                                                min="0.000000001"
                                                step="any"
                                                inputmode="decimal"
                                                aria-describedby="cw-inter-word-gap-hint"
                                                data-bs-toggle="tooltip"
                                                title="CW.Inter Word Gap: positive timing multiplier between Morse words."
                                                value="7"
                                                required />
                                            <div id="cw-inter-word-gap-hint" class="form-text mt-2">
                                                Enter a positive timing multiplier for gaps between Morse words.
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset class="config-panel" id="qrss_message_set">
                                    <legend>CW Message</legend>
                                    <p class="config-panel__summary">
                                        Enter the message sent by QRSS, FSKCW, or DFCW with the current CW timing and tone settings.
                                    </p>
                                    <div class="row gx-2 gy-3 align-items-center mt-1">
                                        <div class="col-12 col-lg-12 d-flex align-items-center">
                                            <input
                                                type="text"
                                                class="form-control flex-grow-1"
                                                id="qrss_message"
                                                maxlength="59"
                                                autocapitalize="characters"
                                                autocomplete="off"
                                                spellcheck="false"
                                                aria-describedby="qrss-message-hint"
                                                step="1"
                                                data-bs-toggle="tooltip"
                                                title="CW.Message sent by QRSS, FSKCW, or DFCW"
                                                value="Hello"
                                                required />
                                            <div id="qrss-message-hint" class="form-text mt-2">
                                                Enter the exact CW message to send. This field cannot be empty.
                                            </div>
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
                            <div class="config-pane-intro">
                                <span class="config-pane-intro__label">Transmitter</span>
                                <p class="mb-0">
                                    Choose the RF output path, then fill in only the hardware settings for that backend.
                                </p>
                            </div>
                            <fieldset class="config-panel">
                                <legend>RF Output Path</legend>
                                <p class="config-panel__summary">
                                    Choose how the transmitter generates RF output, then review the settings for that hardware.
                                </p>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-4">
                                        <label for="transmit_backend" class="form-label">RF output path</label>
                                        <select
                                            id="transmit_backend"
                                            class="form-select"
                                            aria-describedby="backend-selector-hint backendPlatformHint"
                                            data-bs-toggle="tooltip"
                                            title="Choose the RF hardware backend used for transmission.">
                                            <option value="gpio">GPIO</option>
                                            <option value="si5351">Si5351</option>
                                        </select>
                                        <div id="backend-selector-hint" class="form-text mt-2">
                                            GPIO uses Raspberry Pi clock output pins directly. Si5351 uses an attached synthesizer on the configured I2C bus.
                                        </div>
                                        <div id="backendPlatformHint" class="form-text mt-2" aria-live="polite" aria-atomic="true" hidden></div>
                                    </div>
                                </div>
                                <div id="backendStatus" class="alert mt-3 mb-0" role="alert" aria-live="assertive" aria-atomic="true" hidden></div>
                            </fieldset>

                            <fieldset class="config-panel backend-settings-panel" id="gpio-backend-panel">
                                <legend>GPIO Output</legend>
                                <p class="config-panel__summary">
                                    Configure direct Raspberry Pi clock output, including the supported transmit pin and drive level.
                                </p>

                                <div class="row gx-3 gy-3 align-items-start">
                                    <div class="col-12 col-lg-4 d-flex align-items-center">
                                        <label for="tx_pin" class="form-label mb-0 me-2 flex-shrink-0">Transmit Pin:</label>
                                        <div class="flex-grow-1">
                                            <select
                                                id="tx_pin"
                                                class="form-select"
                                                aria-describedby="tx-pin-hint"
                                                data-bs-toggle="tooltip"
                                                title="Only GPIO4 and GPIO20 support GPCLK0 clock output on the 40-pin header.">
                                                <option value="4">GPIO4</option>
                                                <option value="20">GPIO20</option>
                                            </select>
                                            <div id="tx-pin-hint" class="form-text mt-2">
                                                Only GPIO4 and GPIO20 support GPCLK0 clock output on the 40-pin header.
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-12 col-lg-4">
                                        <label for="gpio-power-range" class="form-label">Power Level</label>
                                        <div class="config-range-control">
                                            <input
                                                type="range"
                                                id="gpio-power-range"
                                                class="form-range config-range-control__slider"
                                                min="0"
                                                max="7"
                                                step="1"
                                                value="7" />
                                            <label for="gpio-power-range" class="form-label small mb-0 config-range-control__value">
                                                <span id="gpio-power-range-value" class="small" aria-live="polite" aria-atomic="true"></span>
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            </fieldset>

                            <fieldset class="config-panel backend-settings-panel" id="si5351-backend-panel" hidden>
                                <legend>Si5351 Output</legend>
                                <p class="config-panel__summary">
                                    Configure the attached Si5351 synthesizer, including I2C details, reference frequency, and output power.
                                </p>

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
                                            aria-describedby="si5351-bus-hint"
                                            data-bs-toggle="tooltip"
                                            title="Linux I2C bus number for the Si5351 device." />
                                        <div id="si5351-bus-hint" class="form-text mt-2">
                                            Enter a Linux I2C bus number of 0 or greater.
                                        </div>
                                    </div>

                                    <div class="col-12 col-lg-3">
                                        <label for="si5351_i2c_address" class="form-label">I2C Address</label>
                                        <input
                                            type="text"
                                            id="si5351_i2c_address"
                                            class="form-control"
                                            maxlength="10"
                                            pattern="^(?:0[xX][0-9A-Fa-f]+|[0-9]+)$"
                                            inputmode="text"
                                            autocapitalize="off"
                                            autocomplete="off"
                                            spellcheck="false"
                                            aria-describedby="si5351-address-hint"
                                            data-bs-toggle="tooltip"
                                            title="Enter a decimal or 0x-prefixed hexadecimal I2C address." />
                                        <div id="si5351-address-hint" class="form-text mt-2">
                                            Use either decimal or `0x`-prefixed hexadecimal. Valid device addresses range from `0x03` through `0x77`.
                                        </div>
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
                                            aria-describedby="si5351-reference-hint"
                                            data-bs-toggle="tooltip"
                                            title="Reference oscillator frequency in Hz." />
                                        <div id="si5351-reference-hint" class="form-text mt-2">
                                            Enter the Si5351 reference oscillator frequency in Hz. The value must be greater than 0.
                                        </div>
                                    </div>

                                    <div class="col-12 col-lg-3">
                                        <label for="si5351-power-range" class="form-label">Power Level</label>
                                        <div class="config-range-control">
                                            <input
                                                type="range"
                                                id="si5351-power-range"
                                                class="form-range config-range-control__slider"
                                                min="1"
                                                max="4"
                                                step="1"
                                                value="1" />
                                            <label for="si5351-power-range" class="form-label small mb-0 config-range-control__value">
                                                <span id="si5351-power-range-value" class="small" aria-live="polite" aria-atomic="true"></span>
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
                            <div class="config-pane-intro">
                                <span class="config-pane-intro__label">Pi I/O</span>
                                <p class="mb-0">
                                    Configure optional Raspberry Pi indicators and control pins that support the transmitter without changing on-air planning.
                                </p>
                            </div>
                            <fieldset class="config-panel">
                                <legend>Pi Controls</legend>
                                <p class="config-panel__summary">
                                    Configure optional GPIO features such as a transmit LED, a shutdown button input, and per-band outputs.
                                </p>

                                <div class="row gx-2 gy-2 align-items-center mb-2">
                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_led">Transmit LED:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_led" aria-describedby="use-led-hint">
                                            </div>
                                        </div>
                                        <div id="use-led-hint" class="form-text mt-2">
                                            Enable a transmit LED, then choose the GPIO pin used for it.
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
                                                aria-describedby="led-pin-hint"
                                                title="GPIO18 (Pin 12 - TAPR LED)">
                                                <?= htmlspecialchars($defaultLedGpio) ?>
                                            </button>
                                            <?php include __DIR__ . '/../gpio_dropdown.php'; ?>
                                            <div id="led-pin-hint" class="form-text mt-2">
                                                Choose the GPIO pin used for the transmit LED output.
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-12 col-xxl-3 d-flex align-items-center">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="form-label mb-0" for="use_shutdown">Enable Shutdown:</label>
                                            <div class="form-check form-switch mb-0">
                                                <input class="form-check-input" type="checkbox" role="switch" id="use_shutdown" aria-describedby="use-shutdown-hint" title="Enable to shutdown system when a button is pushed">
                                            </div>
                                        </div>
                                        <div id="use-shutdown-hint" class="form-text mt-2">
                                            Enable shutdown by GPIO button, then choose the input pin used for it.
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
                                                aria-describedby="shutdown-pin-hint"
                                                title="GPIO19 (Pin 35 - TAPR Shutdown)">
                                                <?= htmlspecialchars($defaultShutdownGpio) ?>
                                            </button>
                                            <?php include __DIR__ . '/../gpio_dropdown.php'; ?>
                                            <div id="shutdown-pin-hint" class="form-text mt-2">
                                                Choose the GPIO pin monitored for the shutdown button input.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset class="config-panel">
                                <legend>Band GPIO</legend>
                                <p class="config-panel__summary">
                                    Assign optional GPIO outputs by band, including whether each output is enabled and whether it drives active-high.
                                </p>
                                <div id="band-gpio-hint" class="form-text mt-2 mb-3">
                                    Enable a band before choosing its GPIO pin and polarity. Disabled rows keep those controls unavailable. The header checkboxes toggle the full Enabled or Active High column.
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-sm align-middle mb-0" id="bandGpioTable" aria-describedby="band-gpio-hint">
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
                                                                aria-label="Toggle all Band GPIO enabled checkboxes"
                                                                aria-describedby="band-gpio-hint">
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
                                                                aria-label="Toggle all Band GPIO active high checkboxes"
                                                                aria-describedby="band-gpio-hint">
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
                                                                aria-label="Enable Band GPIO for <?= htmlspecialchars($band) ?>"
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
                                                        $selectAttributes = 'disabled aria-label="Band GPIO pin for ' . htmlspecialchars($band, ENT_QUOTES) . '"';
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
                                                                aria-label="Set Band GPIO active high for <?= htmlspecialchars($band) ?>"
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
                    aria-describedby="modeChangeGuardModalBody"
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
