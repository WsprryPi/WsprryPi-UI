<?php
$cardTitleId = 'operationPageTitle';
$cardTitleText = 'Wsprry Pi Operation';
require __DIR__ . '/../card_header.php';
?>

            <div class="card-body operation-card-body">
                <section class="operation-hero" aria-labelledby="operationPageTitle">
                    <div class="operation-hero__status">
                        <div
                            id="operationStatusAnnouncement"
                            class="operation-hero__headline"
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            aria-relevant="text">
                            <div class="operation-hero__state">
                                <span class="operation-hero__state-label">Current state</span>
                                <span id="operationCurrentState" class="operation-hero__state-value">Loading runtime state</span>
                            </div>
                            <p id="operationStateDetail" class="operation-hero__detail">
                                Connecting to the controller and loading the latest operating values.
                            </p>
                        </div>
                    </div>

                    <div class="operation-hero__controls" aria-label="Runtime controls">
                        <div class="operation-runtime-toggle">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="transmit" aria-describedby="transmitAvailabilityHint operationControlHint">
                                <label class="form-check-label" for="transmit">Transmit enabled</label>
                            </div>
                            <div id="transmitAvailabilityHint" class="form-text mt-2" aria-live="polite" aria-atomic="true" hidden></div>
                        </div>

                        <button
                            type="button"
                            class="btn btn-danger operation-stop-button"
                            id="stop_transmit"
                            aria-describedby="operationControlHint"
                            disabled>
                            Stop transmission
                        </button>

                        <div id="operationRecoveryActions" class="operation-recovery" hidden>
                            <div class="operation-recovery__actions">
                                <button type="button" class="btn btn-outline-primary operation-recovery__action" id="operationRetryButton">
                                    Retry now
                                </button>
                                <a class="btn btn-outline-secondary operation-recovery__action" id="operationSetupButton" href="index.php?page=config" hidden>
                                    Open Setup
                                </a>
                            </div>
                            <div id="operationRecoveryHint" class="operation-recovery__hint" aria-live="polite" aria-atomic="true"></div>
                        </div>
                    </div>
                </section>

                <section class="operation-summary-grid" aria-label="Runtime summary">
                    <article class="operation-panel operation-panel--primary">
                        <div class="operation-panel__label">Current mode</div>
                        <div class="operation-panel__value">
                            <span id="runtime_mode_value" aria-live="polite" aria-atomic="true">Unknown</span>
                        </div>
                    </article>

                    <article class="operation-panel operation-panel--wide">
                        <div class="operation-panel__label" id="runtime_plan_label">Current WSPR plan</div>
                        <div class="operation-panel__value operation-panel__value--wrap" id="runtime_wspr_plan_value" aria-live="polite" aria-atomic="true">
                            Not available
                        </div>
                    </article>
                </section>

                <div id="backendStatus" class="alert operation-backend-status" role="alert" aria-live="assertive" aria-atomic="true" hidden></div>
            </div>
