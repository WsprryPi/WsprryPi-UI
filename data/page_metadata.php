<?php
require_once __DIR__ . '/app_state.php';

$current = $legacyCurrentPage;

$pageMetadata = [];
foreach ($viewMetadata as $viewKey => $metadata) {
    $pageMetadata[$metadata['legacyScript']] = [
        'title' => $metadata['title'],
        'view' => $viewKey,
    ];
}

$defaultPageMetadata = $pageMetadata['index.php'];
$currentPageMetadata = $pageMetadata[$current] ?? $defaultPageMetadata;
