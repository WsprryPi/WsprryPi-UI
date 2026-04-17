<?php
$cardTitleId = 'cardTitle';
$cardTitleText = 'Wsprry Pi Maintenance';
require __DIR__ . '/../card_header.php';
?>

            <div
                id="globalToastContainer"
                class="toast-container position-fixed start-50 translate-middle-x p-3">
            </div>

            <div class="card-body tab-content bg-body">
                <section class="maintenance-guidance mb-4" aria-label="Maintenance guidance">
                    <div class="maintenance-guidance__label">Before you continue</div>
                    <p class="mb-2">
                        Start with repair when the configuration is mostly correct and only needs cleanup.
                        Use reset only when you want to replace the current configuration with the stock baseline.
                    </p>
                    <p class="mb-0 text-body-secondary">
                        After either action, review the configuration page, confirm the transmit mode and hardware settings,
                        then save any changes you still need.
                    </p>
                </section>

                <section
                    id="maintenanceResult"
                    class="maintenance-result d-none mb-4"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true">
                    <div class="maintenance-result__label" id="maintenanceResultLabel">Maintenance update</div>
                    <div class="maintenance-result__title" id="maintenanceResultTitle"></div>
                    <p class="maintenance-result__body mb-0" id="maintenanceResultBody"></p>
                </section>

                <div class="maintenance-split">
                    <section class="maintenance-pane">
                        <div class="maintenance-pane__eyebrow">Safer first step</div>
                        <h5 class="mb-3">Repair configuration</h5>
                        <p class="mb-3">
                            Check the current configuration for missing or invalid
                            values and repair what can be repaired. This keeps as
                            much of your existing configuration as possible.
                        </p>
                        <ul class="maintenance-consequence-list">
                            <li>Keeps existing settings whenever they are still usable.</li>
                            <li>Best when the transmitter worked before and only needs cleanup.</li>
                            <li>Review the config page afterward to confirm the repaired values.</li>
                        </ul>
                        <div class="maintenance-action-copy">
                            What happens next:
                            A repaired configuration is written, then the UI reloads the latest settings so you can verify them.
                        </div>
                        <div class="d-flex justify-content-center mt-3">
                            <button
                                id="repairConfigButton"
                                type="button"
                                class="btn btn-warning">
                                Repair current configuration
                            </button>
                        </div>
                    </section>

                    <section class="maintenance-pane">
                        <div class="maintenance-pane__eyebrow maintenance-pane__eyebrow--danger">Use only when needed</div>
                        <h5 class="mb-3">Reset configuration</h5>
                        <p class="mb-3">
                            Replace the current configuration with the stock
                            defaults. Use this when you want to start over from
                            a clean baseline.
                        </p>
                        <ul class="maintenance-consequence-list">
                            <li>Replaces the current configuration with stock defaults.</li>
                            <li>Use this if the current settings are no longer trustworthy.</li>
                            <li>You will need to review and re-save station, mode, and hardware settings afterward.</li>
                        </ul>
                        <div class="maintenance-action-copy maintenance-action-copy--danger">
                            What happens next:
                            Stock defaults are written, then the UI reloads that baseline so you can rebuild the configuration safely.
                        </div>
                        <div class="d-flex justify-content-center mt-3">
                            <button
                                id="restoreConfigButton"
                                type="button"
                                class="btn btn-danger">
                                Reset to defaults
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <div id="maintenanceOverlay" class="maintenance-overlay d-none"></div>
