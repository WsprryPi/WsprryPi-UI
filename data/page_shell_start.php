<?php
if (!isset($bodyClass)) {
    $bodyClass = '';
}

if (!isset($cardClass)) {
    $cardClass = 'template-card';
}
?>
<body<?= $bodyClass !== '' ? ' class="' . htmlspecialchars($bodyClass) . '"' : '' ?>>
    <?php require_once 'connection_alert.php'; ?>

    <!-- Fixed Navbar -->
    <?php require_once 'navbar.php'; ?>

    <!-- Main Content -->
    <div class="container my-5">
        <div class="card shadow-sm <?= htmlspecialchars($cardClass) ?> mt-5">
