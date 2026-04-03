<?php

/**
 * gpio_dropdown.php
 *
 * Renders a Bootstrap dropdown menu of GPIO pins.
 *
 * Required:
 *   $dropdownId   string  The id of the toggle button this menu belongs to
 *
 * Optional:
 *   $defaultGpio  string  e.g. "GPIO18" to mark as initially selected
 */

// Define GPIO pins
$gpio_pins = [
    "GPIO0"  => "Pin 27",
    "GPIO1"  => "Pin 28",
    "GPIO2"  => "Pin 3",
    "GPIO3"  => "Pin 5",
    "GPIO5"  => "Pin 29",
    "GPIO6"  => "Pin 31",
    "GPIO7"  => "Pin 26",
    "GPIO8"  => "Pin 24",
    "GPIO9"  => "Pin 21",
    "GPIO10" => "Pin 19",
    "GPIO11" => "Pin 23",
    "GPIO12" => "Pin 32",
    "GPIO13" => "Pin 33",
    "GPIO14" => "Pin 8",
    "GPIO15" => "Pin 10",
    "GPIO16" => "Pin 36",
    "GPIO17" => "Pin 11",
    "GPIO18" => "Pin 12 - TAPR LED",
    "GPIO19" => "Pin 35 - TAPR Shutdown",
    "GPIO20" => "Pin 38",
    "GPIO21" => "Pin 40",
    "GPIO22" => "Pin 15",
    "GPIO23" => "Pin 16",
    "GPIO24" => "Pin 18",
    "GPIO25" => "Pin 22",
];

$dropdownId  = isset($dropdownId) ? (string)$dropdownId : 'gpioDropdownButton';
$defaultGpio = isset($defaultGpio) ? (string)$defaultGpio : '';
?>

<ul class="dropdown-menu bg-body text-body" aria-labelledby="<?= htmlspecialchars($dropdownId) ?>">
    <?php foreach ($gpio_pins as $gpio => $pinText): ?>
        <li>
            <button
                type="button"
                class="dropdown-item<?= ($defaultGpio === $gpio ? ' active' : '') ?>"
                data-val="<?= htmlspecialchars($gpio) ?>">
                <?= htmlspecialchars($gpio) ?> (<?= htmlspecialchars($pinText) ?>)
            </button>
        </li>
    <?php endforeach; ?>
</ul>
