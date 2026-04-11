<?php require_once 'page_metadata.php'; ?>

<!-- Fixed Navbar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
    <div class="container">
        <span class="navbar-brand">
            <i
                id="connIcon"
                data-bs-toggle="tooltip"
                data-bs-original-title="Disconnected."
                class="fa-solid fa-tower-broadcast"></i>
            <?= htmlspecialchars($currentPageMetadata['title']) ?>
        </span>
        <button
            class="navbar-toggler ms-auto"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse align-items-center" id="mainNav">
            <!-- Navbar List Items -->
            <ul class="navbar-nav flex-wrap align-items-center align-items-lg ms-lg-auto">
                <!-- Wsprry Pi UI Choice -->
                <li class="nav-item dropdown">
                    <a
                        class="nav-link dropdown-toggle"
                        href="#"
                        id="wsprpiDropdown"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="fa-solid fa-tower-broadcast me-2"></i>
                        Wsprry Pi Application
                    </a>
                    <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="wsprpiDropdown">
                        <li>
                            <a
                                class="dropdown-item <?= $current === 'index.php' ? 'disabled' : '' ?>"
                                href="index.php"
                                <?= $current === 'index.php' ? 'tabindex=\"-1\" aria-disabled=\"true\"' : '' ?>>
                                Configuration
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item <?= $current === 'view_logs.php' ? 'disabled' : '' ?>"
                                href="view_logs.php"
                                <?= $current === 'view_logs.php' ? 'tabindex=\"-1\" aria-disabled=\"true\"' : '' ?>>
                                Logs
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item <?= $current === 'view_spots.php' ? 'disabled' : '' ?>"
                                href="view_spots.php"
                                <?= $current === 'view_spots.php' ? 'tabindex=\"-1\" aria-disabled=\"true\"' : '' ?>>
                                Spots
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item <?= $current === 'maintenance.php' ? 'disabled' : '' ?>"
                                href="maintenance.php"
                                <?= $current === 'maintenance.php' ? 'tabindex=\"-1\" aria-disabled=\"true\"' : '' ?>>
                                Maintenance
                            </a>
                        </li>
                    </ul>
                </li>

                <!-- Wsprry Pi Links Dropdown -->
                <li class="nav-item dropdown align-items-center">
                    <a
                        class="nav-link dropdown-toggle"
                        href="#"
                        id="wsprlinksDropdown"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="fa-solid fa-link me-2"></i>
                        Wsprry Pi Links
                    </a>
                    <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="wsprlinksDropdown">
                        <li>
                            <a
                                class="dropdown-item"
                                href="https://wsprry-pi.readthedocs.io/en/stable/"
                                target="_blank"
                                rel="noopener">
                                Documentation
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item"
                                href="https://github.com/WsprryPi/"
                                target="_blank"
                                rel="noopener">
                                GitHub
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item"
                                href="https://tapr.org/"
                                target="_blank"
                                rel="noopener">
                                TAPR
                            </a>
                        </li>
                        <li>
                            <a
                                class="dropdown-item"
                                href="https://www.wsprnet.org/olddb?mode=html&band=all&limit=50&findreporter=&sort=date&findcall="
                                target="_blank"
                                rel="noopener">
                                WSPRNet Database
                            </a>
                        </li>
                    </ul>
                </li>

                <!-- Theme dark/light toggle -->
                <li class="nav-item ms-lg-3 d-flex align-items-center">
                    <div
                        class="form-check form-switch d-inline-flex align-items-center mb-0 text-white">
                        <label
                            class="form-check-label mb-0 toggle-text"
                            for="themeToggle"
                            id="themeToggleLabel"
                            data-bs-toggle="tooltip"
                            title="Change Theme">Dark</label>
                        <input
                            class="form-check-input"
                            type="checkbox"
                            id="themeToggle"
                            data-bs-toggle="tooltip"
                            title="Change Theme">
                    </div>
                </li>
            </ul>
        </div>

    </div>
</nav>
