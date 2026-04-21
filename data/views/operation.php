<?php
$cardTitleId = 'operationPageTitle';
$cardTitleText = 'Wsprry Pi Operation';
require __DIR__ . '/../card_header.php';
?>

            <div class="card-body operation-card-body">
                <section class="operation-hero" aria-labelledby="operationPageTitle">
                    <div class="operation-hero__status">
                        <p class="operation-hero__eyebrow mb-0">Primary landing view</p>
                        <div class="operation-hero__headline">
                            <div class="operation-hero__state">
                                <span class="operation-hero__state-label">Current state</span>
                                <span id="operationCurrentState" class="operation-hero__state-value">Loading runtime state</span>
                            </div>
                            <p id="operationStateDetail" class="operation-hero__detail mb-0">
                                Connecting to the controller and loading the latest operating values.
                            </p>
                        </div>
                    </div>

                    <div class="operation-hero__controls" aria-label="Runtime controls">
                        <div class="operation-runtime-toggle">
                            <div class="form-check form-switch mb-0">
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

                        <div id="operationControlHint" class="form-text mb-0">
                            Use this page for live runtime control. Open Setup only when you need to change saved values.
                        </div>

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

                    <article class="operation-panel">
                        <div class="operation-panel__label">Operator guidance</div>
                        <div id="operationNextActionHint" class="operation-panel__value operation-panel__value--hint">
                            Review live state here. Open Setup or Maintenance only when intervention is needed.
                        </div>
                    </article>
                </section>

                <div id="backendStatus" class="alert mt-4 mb-0" role="alert" aria-live="assertive" aria-atomic="true" hidden></div>

                <section class="operation-nav-panel mt-4" aria-label="Secondary destinations">
                    <div class="operation-nav-panel__copy">
                        <p class="operation-nav-panel__eyebrow mb-0">When changes are needed</p>
                        <h2 class="operation-nav-panel__title mb-0 h5">Secondary pages</h2>
                        <p class="operation-nav-panel__body mb-0">
                            Open Setup to change saved station and hardware values. Open Maintenance only for repair, reset, or remedial actions.
                        </p>
                    </div>
                    <div class="operation-nav-panel__actions">
                        <a class="btn btn-outline-primary operation-nav-panel__action" href="index.php?page=config">Open Setup</a>
                        <a class="btn btn-outline-secondary operation-nav-panel__action" href="index.php?page=maintenance">Open Maintenance</a>
                    </div>
                </section>
            </div>
