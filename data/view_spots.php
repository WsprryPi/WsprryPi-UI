<!DOCTYPE html>
<html lang="en" data-bs-theme="auto">

<head>
    <!-- Bootswatch, Boostrap, and Fontawesome, included here: -->
    <?php require_once 'header.php'; ?>

    <!-- This page's css -->
    <link rel="stylesheet" href="view_spots.css" />
</head>

<?php
$cardClass = 'spots-card';
require_once 'page_shell_start.php';
?>
            <?php
            $cardTitleId = 'spotsFor';
            $cardTitleText = 'Recent spots for: ';
            require_once 'card_header.php';
            ?>

            <!-- Card Body -->
            <div class="card-body tab-content bg-body">
                <!-- JavaScript will inject a <div class="table-responsive"><table>…</table></div> here -->
            </div>

            <!-- Hidden fieldset to hold settings -->
            <div id="server-settings" class="d-none">
                <input type="text" id="callsign" name="callsign" value="" />
            </div>
<?php require_once 'page_shell_end.php'; ?>

    <!-- Static page footer -->
    <?php require_once 'footer.php'; ?>

    <!-- Index JavaScript -->
    <script src="view_spots.js"></script>
</body>

</html>
