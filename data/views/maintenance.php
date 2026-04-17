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

                <div class="maintenance-split">
                    <section class="maintenance-pane">
                        <h5 class="mb-3">Repair configuration</h5>
                        <p class="mb-3">
                            Check the current configuration for missing or invalid
                            values and repair what can be repaired. This keeps as
                            much of your existing configuration as possible.
                        </p>
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
                        <h5 class="mb-3">Reset configuration</h5>
                        <p class="mb-3">
                            Replace the current configuration with the stock
                            defaults. Use this when you want to start over from
                            a clean baseline.
                        </p>
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
