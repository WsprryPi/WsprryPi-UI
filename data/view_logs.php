<!DOCTYPE html>
<html lang="en" data-bs-theme="light">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- This page's css -->
    <link rel="stylesheet" href="site.css" />

    <!-- This page's css -->
    <link rel="stylesheet" href="view_logs.css" />
</head>

<body>
    <!-- Fixed Navbar -->
    <?php require_once 'navbar.php'; ?>

    <!-- Main Content -->
    <div class="container my-5">
        <div class="card shadow-sm logs-card mt-5">

            <div class="card-header d-flex flex-wrap justify-content-between align-items-center">
                <!-- Card Title -->
                <span>Logs for: <?php echo gethostname(); ?></span>

                <!-- Reboot, Shutdown and Clocks -->
                <?php require_once 'clock_and_reboot.php'; ?>
            </div>

            <!-- Card Body -->
            <div class="card-body tab-content">
                <!-- Jump to bottom button (overlays the log area) -->
                <button
                    type="button"
                    id="jumpToBottomBtn"
                    class="jump-to-bottom"
                    aria-label="Jump to bottom">
                    Jump to bottom
                </button>

                <div
                    id="info-pane"
                    class="tab-pane fade show active"
                    role="tabpanel"
                    aria-labelledby="info-tab">
                    <div id="info" class="pane info">
                        <!-- live INFO logs append here -->
                    </div>
                </div>

                <!-- Hidden fieldset to hold settings -->
                <div id="server-settings" class="d-none">
                    <input type="text" id="callsign" name="callsign" value="" />
                </div>
            </div>
        </div>
    </div>

    <!-- System action modal -->
    <?php require_once 'system_action_modal.php'; ?>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- jQuery and Bootswatch -->
    <?php require_once 'site.js.includes.php'; ?>

    <!-- Main JavaScript -->
    <script src="site.js"></script>

    <!-- Index JavaScript -->
    <script src="view_logs.js"></script>
</body>

</html>