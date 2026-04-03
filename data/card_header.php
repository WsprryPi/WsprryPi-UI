<div class="card-header d-flex flex-wrap justify-content-between align-items-center">
    <!-- Card Title -->
    <span id="<?= htmlspecialchars($cardTitleId) ?>"><?= htmlspecialchars($cardTitleText) ?></span>

    <!-- Reboot, Shutdown and Clocks -->
    <?php require_once 'clock_and_reboot.php'; ?>
</div>
