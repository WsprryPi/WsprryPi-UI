<?php

function getWsprryPiUiVersion(): string
{
    static $version = null;

    if ($version !== null) {
        return $version;
    }

    $output = shell_exec('/usr/local/bin/wsprrypi --version');
    if (!is_string($output)) {
        $version = '';
        return $version;
    }

    $version = trim($output);
    $prefix = 'WsprryPi version ';
    if (strncmp($version, $prefix, strlen($prefix)) === 0) {
        $version = substr($version, strlen($prefix));
    }
    $version = rtrim($version, ".");

    return $version;
}

function wsprrypiAssetUrl(string $path): string
{
    $version = getWsprryPiUiVersion();
    if ($version === '') {
        return $path;
    }

    $separator = strpos($path, '?') !== false ? '&' : '?';
    return $path . $separator . 'v=' . rawurlencode($version);
}
