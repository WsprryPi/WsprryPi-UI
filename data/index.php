<!DOCTYPE html>
<html lang="en" data-bs-theme="light">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- This page's css -->
    <link rel="stylesheet" href="site.css" />

    <!-- This page's css -->
    <link rel="stylesheet" href="index.css" />
</head>

<body>
    <!-- Fixed Navbar -->
    <?php require_once 'navbar.php'; ?>

    <?php
    $defaultLedGpio = 'GPIO18';
    $defaultShutdownGpio = 'GPIO19';
    ?>

    <!-- Main Content -->
    <div class="container my-5">
        <div class="card shadow-sm logs-card mt-5">

            <div class="card-header d-flex flex-wrap justify-content-between align-items-center">
                <!-- Mode Toggle and Hostname -->
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <!--
                    <div class="btn-group" role="group" aria-label="Mode Toggle">
                        <input type="radio" class="btn-check" name="mode_toggle" id="wspr_mode" value="WSPR" autocomplete="off" checked>
                        <label class="btn btn-outline-primary" for="wspr_mode">WSPR</label>

                        <input type="radio" class="btn-check" name="mode_toggle" id="qrss_mode" value="QRSS" autocomplete="off">
                        <label class="btn btn-outline-primary" for="qrss_mode">QRSS</label>
                    </div>
                    -->
                    <span>Configuration for: <?php echo gethostname(); ?></span>
                </div>

                <!-- Reboot, Shutdown and Clocks -->
                <?php require_once 'clock_and_reboot.php'; ?>
            </div>

            <div class="card-body">

                <div id="backendStatus" class="alert alert-warning d-none" role="alert">
                    WsprryPi service is unavailable. Please ensure the backend is running and try again.
                </div>

                <form id="wsprform" class="needs-validation" novalidate>

                    <!-- Section 1: Hardware Control -->
                    <fieldset class="mb-4">
                        <legend>Hardware Control</legend>

                        <!-- Enable Transmit -->
                        <div class="row gx-2 gy-2 align-items-center mb-3">
                            <div class="col-12 col-xxl-3 d-flex align-items-center">
                                <div class="d-flex align-items-center gap-2">
                                    <label class="form-label mb-0" for="transmit">Enable Transmit:</label>
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" role="switch" id="transmit">
                                    </div>
                                </div>
                            </div>
                        </div>

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

                    <div id="wspr_config">
                        <!-- Section 2: Operator Information -->
                        <fieldset class="mb-4" id="op_info">
                            <legend>Operator Information</legend>
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
                                            minlength="3"
                                            maxlength="6"
                                            data-bs-toggle="tooltip"
                                            title="1-3 letters/digits, then one digit (0-9), then 1-4 letters/digits.  Max 6 characters"
                                            pattern="^[A-Za-z0-9]{1,3}[0-9][A-Za-z0-9]{1,4}$"
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
                                            title="Enter exactly 2 letters followed by 2 digits (e.g. FN20)"
                                            pattern="^[A-Za-z]{2}[0-9]{2}$"
                                            required />
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        <!-- Section 3: Transmitter Information -->
                        <fieldset class="mb-4" id="tx_info">
                            <legend>Transmitter Information</legend>
                            <div class="row gx-2 align-items-center">
                                <!-- Left column: TX dBm -->
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

                                <!-- Right column: Frequencies and Randomize -->
                                <div class="col-md-8 mb-3 d-flex flex-column flex-md-row align-items-start align-items-md-center">
                                    <div class="d-flex flex-grow-1 align-items-center">
                                        <label for="frequencies" class="form-label mb-0 me-2 flex-shrink-0">
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

                                    <div class="col-auto d-flex align-items-center mt-2 mt-md-0 ms-md-3">
                                        <div class="form-check form-switch form-check-reverse mb-0">
                                            <label class="form-check-label mb-0 me-2 flex-shrink-0" for="useoffset">
                                                Randomize:
                                            </label>
                                            <input
                                                class="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                data-bs-toggle="tooltip"
                                                title="Add a random offset to frequencies"
                                                id="useoffset" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    <div id="qrss_config" style="display: none;">
                        <!-- Section 4: QRSS Control -->
                        <fieldset class="mb-4" id="qrss_control">
                            <legend>QRSS Control</legend>

                            <!-- First Row -->
                            <div class="row gx-2 gy-3 align-items-center">

                                <!-- QRSS Mode -->
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

                                <!-- Dot Length -->
                                <div class="col-12 col-lg-4 d-flex align-items-center">
                                    <label for="dot_length" class="form-label mb-0 me-2 flex-shrink-0">Dot Length:</label>
                                    <div class="flex-grow-1">
                                        <input
                                            type="number"
                                            class="form-control flex-grow-1"
                                            id="dot_length"
                                            min="1"
                                            max="60"
                                            step="1"
                                            data-bs-toggle="tooltip"
                                            title="QRSS dot length in seconds"
                                            value="3"
                                            required />
                                    </div>
                                </div>

                                <!-- FSK Offset -->
                                <div class="col-12 col-lg-4 d-flex align-items-center">
                                    <label for="fsk_offset" class="form-label mb-0 me-2 flex-shrink-0">FSK Offset:</label>
                                    <div class="flex-grow-1">
                                        <input
                                            type="number"
                                            class="form-control flex-grow-1"
                                            id="fsk_offset"
                                            min="0"
                                            max="1000"
                                            step="0.01"
                                            data-bs-toggle="tooltip"
                                            title="FSK offset in Hz (used with FSKCW and DFCW)"
                                            value="0"
                                            required />
                                    </div>
                                </div>
                            </div>

                            <!-- Second Row -->
                            <div class="row gx-2 gy-3 align-items-center mt-1">

                                <!-- Transmit Frequency -->
                                <div class="col-12 col-lg-4 d-flex align-items-center">
                                    <label for="qrss_frequency" class="form-label mb-0 me-2 flex-shrink-0">Transmit Frequency:</label>
                                    <input
                                        type="text"
                                        class="form-control flex-grow-1"
                                        id="qrss_frequency"
                                        data-bs-toggle="tooltip"
                                        title="Enter frequency in Hz, kHz, or MHz (e.g. 7040000.0 for 7.040 MHz)"
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
                                        min="0"
                                        max="60"
                                        step="1"
                                        data-bs-toggle="tooltip"
                                        title="Repeat every N minutes (0 = continuous)"
                                        value="10"
                                        required />
                                </div>
                            </div>
                        </fieldset>

                        <!-- Section 5: QRSS Messaging -->
                        <fieldset class="mb-4" id="qrss_message_set">
                            <legend>QRSS Message</legend>
                            <div class="row gx-2 gy-3 align-items-center mt-1">
                                <!-- Start Time -->
                                <div class="col-12 col-lg-12 d-flex align-items-center">
                                    <input
                                        type="text"
                                        class="form-control flex-grow-1"
                                        id="qrss_message"
                                        minlength="3"
                                        maxlength="59"
                                        step="1"
                                        data-bs-toggle="tooltip"
                                        title="Message to be sent"
                                        value="Hello"
                                        required />
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    <!-- Section 6: Frequency Calibration -->
                    <fieldset class="mb-4">
                        <legend>Frequency Calibration</legend>
                        <div class="row gx-2 align-items-center">
                            <div class="col-md-1 mb-3 d-flex align-items-center"></div>
                            <!-- Use NTP -->
                            <div class="col-md-5 mb-3 d-flex align-items-center">
                                <div class="form-check form-switch form-check-reverse mb-0">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        data-bs-toggle="tooltip"
                                        title="Use NTP for frequency calibration"
                                        id="use_ntp" />
                                    <label
                                        class="form-check-label mb-0"
                                        for="use_ntp">
                                        Use NTP
                                    </label>
                                </div>
                            </div>

                            <!-- PPM Offset -->
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
                                    <!-- <div class="valid-feedback">Ok</div>
                                        <div class="invalid-feedback">Invalid</div> -->
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <!-- Section 7: Transmit Power -->
                    <fieldset class="mb-4">
                        <legend>Transmit Power</legend>
                        <div class="d-flex justify-content-center align-items-center">
                            <input
                                type="range"
                                id="tx-power-range"
                                class="form-range me-3"
                                style="width: 60%;"
                                min="0"
                                max="7"
                                step="1"
                                value="0" />
                            <label for="tx-power-range" class="form-label small mb-0">
                                <span id="tx-power-range-value" class="small"></span>
                            </label>
                        </div>
                    </fieldset>

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
        </div>
    </div>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- Index JavaScript -->
    <script src="index.js"></script>
</body>

</html>
