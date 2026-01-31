<!DOCTYPE html>
<html lang="en" data-bs-theme="auto">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- Site css -->
    <link rel="stylesheet" href="site.css" />

    <!-- Template css -->
    <!-- TODO: Add page-specific CSS here -->
</head>

<body>
    <!-- Fixed Navbar -->
    <?php require_once 'navbar.php'; ?>

    <!-- Main Content -->
    <div class="container my-5">
        <div class="card shadow-sm template-card mt-5">

            <div class="card-header d-flex flex-wrap justify-content-between align-items-center">
                <!-- Card Title -->
                <span id="cardTitle">Card Title</span>

                <!-- Reboot, Shutdown and Clocks -->
                <?php require_once 'clock_and_reboot.php'; ?>
            </div>

            <!-- Card Body -->
            <div class="card-body tab-content bg-body">
                <!-- Card body goes here -->
            </div>
        </div>
    </div>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- Template JavaScript -->
    <!-- TODO: Add page-specific JS here -->
</body>

</html>