<!DOCTYPE html>
<html lang="en" data-bs-theme="auto">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- Boilerplate css -->
    <link rel="stylesheet" href="maintenance.css" />
</head>

<?php
$cardClass = 'template-card';
require_once 'page_shell_start.php';
?>
            <?php
            $cardTitleId = 'cardTitle';
            $cardTitleText = 'Wsprry Pi Maintenance';
            require_once 'card_header.php';
            ?>

            <div
                id="globalToastContainer"
                class="toast-container position-fixed start-50 translate-middle-x p-3">
            </div>

            <!-- Card Body -->
            <div class="card-body tab-content bg-body">

                <div class="maintenance-split">
                    <section class="maintenance-pane">
                        <h5 class="mb-3">Repair Configuration</h5>
                        <p class="mb-3">
                            Repairs the current configuration using stock values
                            as a reference. This is intended to correct missing
                            or invalid settings while preserving as much of your
                            existing configuration as possible.
                        </p>
                        <div class="d-flex justify-content-center mt-3">
                            <button
                                id="repairConfigButton"
                                type="button"
                                class="btn btn-warning">
                                Repair Configuration
                            </button>
                        </div>
                    </section>

                    <section class="maintenance-pane">
                        <h5 class="mb-3">Reset Configuration</h5>
                        <p class="mb-3">
                            Resets the configuration to defaults. This
                            replaces the current configuration and should be used
                            when you want a clean baseline.
                        </p>
                        <div class="d-flex justify-content-center mt-3">
                            <button
                                id="restoreConfigButton"
                                type="button"
                                class="btn btn-danger">
                                Reset to Stock
                            </button>
                        </div>
                    </section>
                </div>
            </div>
<?php require_once 'page_shell_end.php'; ?>

    <div id="maintenanceOverlay" class="maintenance-overlay d-none"></div>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- Maintenance JavaScript -->
    <script src="maintenance.js"></script>
</body>

</html>
