<!doctype html>
<html lang="en">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- Local Stylesheet -->
    <link rel="stylesheet" href="view_logs.css" />
</head>

<body class="bg-body-tertiary">
    <!-- Fixed Navbar -->
    <?php require_once 'navbar.php'; ?>

    <div class="container my-5">
        <div class="card shadow-sm logs-card mt-5">

            <div class="card-header d-flex flex-wrap justify-content-between align-items-center">
                <!-- Card Title -->
                <span id="cardTitle">Wsprry Pi Log</span>

                <!-- Reboot, Shutdown and Clocks -->
                <?php require_once 'clock_and_reboot.php'; ?>
            </div>

            <div class="card-body" style="position: relative;">
                <div id="sse-status-badge" class="sse-disconnected logs-overlay" title="Disconnected">Disconnected</div>

                <div id="logs-overlay-controls" aria-label="Log controls" class="logs-overlay">
                    <button id="btn-clear" class="btn btn-outline-danger btn-sm glass-btn" type="button">Clear</button>
                    <button id="btn-reconnect" class="btn btn-outline-success btn-sm glass-btn" type="button">Connect</button>
                </div>

                <button id="btn-jump-bottom" type="button" class="btn btn-sm btn-primary" style="display:none; position:absolute; right:12px; bottom:12px; z-index:10;">Jump to bottom</button>
                <div id="log-scroll">
                    <div id="logsTabContent">
                        <div id="all"></div>
                        <div id="internal" style="display:none;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- View log js -->
    <script src="view_logs.js"></script>

</body>

</html>