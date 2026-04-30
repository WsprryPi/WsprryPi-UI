<?php
require_once __DIR__ . '/ui_version.php';

header("Content-Type: application/json"); // Set response type to JSON

$output = getWsprryPiUiVersion();

// Send JSON response
echo json_encode(["wspr_version" => $output, "ui_version" => $output]);
