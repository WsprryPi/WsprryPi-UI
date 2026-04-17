<?php

$viewMetadata = [
    'config' => [
        'title' => 'Wsprry Pi Configuration',
        'legacyScript' => 'index.php',
        'cardClass' => 'template-card',
        'bodyClass' => '',
        'htmlTheme' => 'auto',
        'css' => ['index.css'],
        'js' => ['index.js'],
        'partial' => __DIR__ . '/views/config.php',
    ],
    'logs' => [
        'title' => 'Wsprry Pi Log',
        'legacyScript' => 'view_logs.php',
        'cardClass' => 'logs-card',
        'bodyClass' => 'bg-body-tertiary',
        'htmlTheme' => 'auto',
        'css' => ['view_logs.css'],
        'js' => ['view_logs.js'],
        'partial' => __DIR__ . '/views/logs.php',
    ],
    'spots' => [
        'title' => 'Wsprry Pi Spots',
        'legacyScript' => 'view_spots.php',
        'cardClass' => 'spots-card',
        'bodyClass' => '',
        'htmlTheme' => 'auto',
        'css' => ['view_spots.css'],
        'js' => ['view_spots.js'],
        'partial' => __DIR__ . '/views/spots.php',
    ],
    'maintenance' => [
        'title' => 'Wsprry Pi Maintenance',
        'legacyScript' => 'maintenance.php',
        'cardClass' => 'template-card',
        'bodyClass' => '',
        'htmlTheme' => 'auto',
        'css' => ['maintenance.css'],
        'js' => ['maintenance.js'],
        'partial' => __DIR__ . '/views/maintenance.php',
    ],
];

$logPaneViews = ['journal', 'internal', 'both'];
$requestedPage = $_GET['page'] ?? null;

if ($requestedPage === null && isset($_GET['view']) && is_string($_GET['view']) && in_array($_GET['view'], $logPaneViews, true)) {
    $requestedPage = 'logs';
}

if (!is_string($requestedPage) || !array_key_exists($requestedPage, $viewMetadata)) {
    $requestedPage = 'config';
}

$activeView = $requestedPage;
$activeViewMetadata = $viewMetadata[$activeView];
$legacyCurrentPage = $activeViewMetadata['legacyScript'];
