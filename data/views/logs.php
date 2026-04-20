<?php
$cardTitleId = 'cardTitle';
$cardTitleText = 'Wsprry Pi Log';
require __DIR__ . '/../card_header.php';
?>

            <div class="card-body" style="position: relative;">
                <div
                    id="sse-status-badge"
                    class="sse-disconnected logs-overlay"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    title="Log stream disconnected">Disconnected</div>

                <div id="logs-overlay-controls" role="toolbar" aria-label="Log controls" class="logs-overlay">
                    <button id="btn-clear"
                        class="btn btn-outline-warning btn-sm glass-btn glass-clear btn-soft"
                        type="button">Clear</button>

                    <button id="btn-reconnect"
                        class="btn btn-outline-primary btn-sm glass-btn glass-reconnect btn-soft"
                        type="button">Start stream</button>
                </div>

                <button id="btn-jump-bottom" type="button" class="btn btn-sm btn-primary" style="display:none; position:absolute; right:12px; bottom:12px; z-index:10;">Jump to newest</button>
                <div id="log-scroll">
                    <div id="logsTabContent">
                        <div id="all"></div>
                        <div id="internal" style="display:none;"></div>
                    </div>
                </div>
            </div>
