<?php
require_once 'page_metadata.php';

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

<title><?= htmlspecialchars($currentPageMetadata['title']) ?></title>

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

<!-- FontAwesome Icons -->
<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
    integrity="sha384-/o6I2CkkWC//PSjvWC/eYN7l3xM3tJm8ZzVkCOfp//W05QcE3mlGskpoHB6XqI+B"
    crossorigin="anonymous">

<!-- Local Stylesheet -->
<link rel="stylesheet" href="site.css" />
