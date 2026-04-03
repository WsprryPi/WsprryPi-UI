<?php
$current = basename($_SERVER['PHP_SELF']);

$pageMetadata = [
    'index.php' => [
        'title' => 'Wsprry Pi Configuration',
    ],
    'view_logs.php' => [
        'title' => 'Wsprry Pi Log',
    ],
    'view_spots.php' => [
        'title' => 'Wsprry Pi Spots',
    ],
    'maintenance.php' => [
        'title' => 'Wsprry Pi Maintenance',
    ],
];

$defaultPageMetadata = [
    'title' => 'Wsprry Pi Configuration',
];

$currentPageMetadata = $pageMetadata[$current] ?? $defaultPageMetadata;
