// view_spots.js
(function ($) {
    "use strict";

    // Lookback window (minutes)
    const MINUTES = 60;

    // Client‐side cache TTL before hitting server‐proxy again (ms)
    const TTL_MS = 2 * 60 * 1000; // 2 minutes

    // Auto-refresh interval (ms)
    const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

    // Columns to show
    const COLUMNS = [
        "time",
        "tx_sign",
        "frequency",
        "snr",
        "drift",
        "tx_loc",
        "power",
        "rx_sign",
        "rx_loc",
        "distance",
        "code",
        "version",
    ];

    // Map numeric codes → human modes
    const CODE_MAP = {
        1: "WSPR-2",
        2: "WSPR-15",
        3: "FST4W-120",
        4: "FST4W-300",
        5: "FST4W-900",
        8: "FST4W-1800",
    };

    // Column header names
    const HEADERS = {
        time: "Timestamp (UTC)",
        tx_sign: "Transmitter",
        frequency: "Freq (Hz)",
        snr: "SNR (dB)",
        drift: "Drift (Hz)",
        tx_loc: "TX Grid",
        power: "Power (dBm)",
        rx_sign: "Receiver",
        rx_loc: "RX Grid",
        distance: "Distance (km)",
        code: "Type",
        version: "Decoder Ver.",
    };

    let _cacheData = null,
        _cacheTS = 0;

    function renderState(title, body, actionLabel = "") {
        const actionMarkup = actionLabel
            ? `<button type="button" class="btn btn-outline-primary btn-sm mt-3" id="spotsRetryButton">${actionLabel}</button>`
            : "";

        $(".card-body.tab-content").html(`
            <div class="py-5 px-3 text-center" role="status" aria-live="polite">
                <div class="fw-semibold mb-2">${title}</div>
                <p class="text-body-secondary mb-0">${body}</p>
                ${actionMarkup}
            </div>
        `);
    }

    // Show a Bootstrap spinner in the card-body
    function renderLoading() {
        $(".card-body.tab-content").html(`
            <div class="py-5 px-3 text-center" role="status" aria-live="polite">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading…</span>
                </div>
                <div class="fw-semibold">Loading recent spots</div>
                <p class="text-body-secondary mb-0">Checking the last hour of WSPRNet spot reports for this transmitter.</p>
            </div>
        `);
    }

    // Render an error message in the card-body
    function renderError(msg) {
        renderState(
            "Unable to load spots",
            `${msg} Check the configured callsign and WSPRNet connection, then load the spots list again.`,
            "Load spots again"
        );
    }

    // Helper: format UTC date → "YYYY-MM-DD HH:MM:SS"
    function utcString(d) {
        return d.toISOString().slice(0, 19).replace("T", " ");
    }

    // Call this whenever you want to refresh the header
    function refreshSpotsHeader() {
        const cs = $("#callsign").val() || "";
        const now = new Date();
        // use UTC string rather than local
        const ts = now.toUTCString();
        $("#spotsFor").html(
            `Recent spots for ${cs}
         <small class="text-muted ms-2">Updated ${ts} UTC</small>`
        );
    }

    // Render the table of spots and scroll to bottom
    function renderTable(spots) {
        const $c = $(".card-body.tab-content").empty();
        if (!Array.isArray(spots) || spots.length === 0) {
            return renderState(
                "No recent spots",
                "No spot reports were found in the last hour. This can be normal if the station has not transmitted recently or if propagation is poor."
            );
        }

        const $wrap = $("<div>").addClass("table-responsive");
        const $tbl = $("<table>").addClass("table table-hover table-sm align-middle");
        const $thead = $("<thead>").addClass("table-light");
        const $hrow = $("<tr>");
        COLUMNS.forEach(col => {
            $("<th>").attr("scope", "col").text(HEADERS[col] || col).appendTo($hrow);
        });
        $thead.append($hrow);
        $tbl.append($thead);

        const $tbody = $("<tbody>");
        spots.forEach(spot => {
            const $tr = $("<tr>");
            COLUMNS.forEach(col => {
                let val = spot[col];
                if (col === "code") val = CODE_MAP[val] || val;
                $("<td>").text(val).appendTo($tr);
            });
            $tbody.append($tr);
        });
        $tbl.append($tbody);
        $wrap.append($tbl);
        $c.append($wrap);

        // Scroll to bottom
        const $pane = $(".spots-card .table-responsive");
        setTimeout(() => $pane.scrollTop($pane.prop("scrollHeight")), 0);
    }

    // Schedule next refresh
    function scheduleNext() {
        setTimeout(fetchSpots, REFRESH_MS);
    }

    // Fetch, parse, render, cache & repeat
    function fetchSpots() {
        const now = Date.now();
        const callSign = $("#callsign").val().toUpperCase().trim();

        if (!callSign) {
            renderError("Please enter a callsign.");
            return scheduleNext();
        }

        // client cache
        if (_cacheData && (now - _cacheTS) < TTL_MS) {
            renderTable(_cacheData);
            refreshSpotsHeader();
            return scheduleNext();
        }

        if (!_cacheData) renderLoading();

        // time window
        const endDate = new Date(now);
        const startDate = new Date(now - MINUTES * 60 * 1000);

        $.ajax({
            url: "fetch_spots.php",      // YOUR proxy
            dataType: "json",            // parse JSON for us
            cache: false,
            data: {
                tx_sign: callSign,
                start: utcString(startDate),
                end: utcString(endDate),
                format: "JSON"          // full JSON envelope
            }
        })
            .done((response) => {
                // response.data is the array of spot‐objects
                let spots = Array.isArray(response.data) ? response.data : [];
                // drop anything older than 2 h
                const cutoff = now - 2 * 3600 * 1000;
                spots = spots.filter(s => {
                    const ts = Date.parse(s.time + "Z");
                    return !isNaN(ts) && ts >= cutoff;
                });

                _cacheData = spots;
                _cacheTS = now;

                renderTable(spots);
                refreshSpotsHeader();
            })
            .fail((xhr, status) => {
                console.error("Fetch error:", status);
                renderError("Error loading spots.");
            })
            .always(() => {
                scheduleNext();
            });
    }

    // Expose for external callers
    window.fetchSpots = fetchSpots;
    window.refreshSpotsHeader = refreshSpotsHeader;

    $(document).on("click", "#spotsRetryButton", fetchSpots);

})(jQuery);
