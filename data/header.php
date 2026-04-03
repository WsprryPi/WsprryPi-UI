<?php
// Determine the current page (just the filename)
$current = basename($_SERVER['PHP_SELF']); // e.g. "index.php" or "view_logs.php"

// Decide what the page title should be
if ($current === 'index.php') {
    $pageTitle  = 'Wsprry Pi Configuration';
} elseif ($current === 'view_logs.php') {
    $pageTitle  = 'Wsprry Pi Logs';
} elseif ($current === 'view_spots.php') {
    $pageTitle  = 'Wsprry Pi Spots';
} else {
    $pageTitle  = 'Wsprry Pi Configuration'; // Fallback
}

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
if ($basePath === '/' || $basePath === '.') {
    $basePath = '';
}

$pathConfig = [
    'basePath' => $basePath,
    'configPath' => $basePath . '/config',
    'versionPath' => $basePath . '/version',
    'repairPath' => $basePath . '/config/repair',
    'socketPath' => $basePath . '/socket',
    'logStreamPath' => $basePath . '/log_stream.php',
];
?>

<script>
    window.currentPage = <?= json_encode(basename($_SERVER['SCRIPT_NAME'])) ?>;
    window.WSPRRYPI_PATHS = <?= json_encode($pathConfig, JSON_UNESCAPED_SLASHES) ?>;
</script>

<meta charset="UTF-8" />

<title><?= htmlspecialchars($pageTitle) ?></title>

<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="manifest" href="site.webmanifest">
<link rel="icon" type="image/x-icon" href="favicon.ico">

<!-- Bootswatch Zephyr CSS -->
<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/bootswatch/5.3.8/zephyr/bootstrap.min.css"
    integrity="sha384-0qFVRx98HJem0F2omOB5o37vVaRuuesFrDqe5Q292oSriOauZU47Cz7anAMHnYnf"
    crossorigin="anonymous"
>

<!-- Bootstrap Icons -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
    integrity="sha384-tViUnnbYAV00FLIhhi3v/dWt3Jxw4gZQcNoSCxCIFNJVCx7/D55/wXsrNIRANwdD"
    crossorigin="anonymous">

<!-- Font Awesome Icons -->
<script
    src="https://kit.fontawesome.com/fdd3893553.js"
    crossorigin="anonymous"
    referrerpolicy="no-referrer">
</script>

<!-- Local Stylesheet -->
<link rel="stylesheet" href="site.css" />
