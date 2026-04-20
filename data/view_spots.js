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
        _cacheKey = "",
        _cacheTS = 0,
        _refreshTimer = null;

    function getSpotsBody() {
        return document.querySelector(".card-body.tab-content");
    }

    function renderState(title, body, actionLabel = "") {
        const container = getSpotsBody();
        if (!container) {
            return;
        }

        container.replaceChildren();

        const state = document.createElement("div");
        state.className = "spots-state py-5 px-3";
        state.setAttribute("role", "status");
        state.setAttribute("aria-live", "polite");

        const titleElement = document.createElement("div");
        titleElement.className = "spots-state__title fw-semibold mb-2";
        titleElement.textContent = title;

        const bodyElement = document.createElement("p");
        bodyElement.className = "spots-state__body text-body-secondary mb-0";
        bodyElement.textContent = body;

        state.append(titleElement, bodyElement);

        if (actionLabel) {
            const actionButton = document.createElement("button");
            actionButton.type = "button";
            actionButton.id = "spotsRetryButton";
            actionButton.className = "btn btn-outline-primary btn-sm mt-3";
            actionButton.textContent = actionLabel;
            state.appendChild(actionButton);
        }

        container.appendChild(state);
    }

    // Show a Bootstrap spinner in the card-body
    function renderLoading() {
        const container = getSpotsBody();
        if (!container) {
            return;
        }

        container.replaceChildren();

        const state = document.createElement("div");
        state.className = "spots-state py-5 px-3";
        state.setAttribute("role", "status");
        state.setAttribute("aria-live", "polite");

        const spinner = document.createElement("div");
        spinner.className = "spinner-border text-primary mb-3";
        spinner.setAttribute("role", "status");

        const hiddenLabel = document.createElement("span");
        hiddenLabel.className = "visually-hidden";
        hiddenLabel.textContent = "Loading…";
        spinner.appendChild(hiddenLabel);

        const title = document.createElement("div");
        title.className = "spots-state__title fw-semibold";
        title.textContent = "Loading recent spots";

        const body = document.createElement("p");
        body.className = "spots-state__body text-body-secondary mb-0";
        body.textContent = "Checking the last hour of WSPRNet spot reports for this transmitter.";

        state.append(spinner, title, body);
        container.appendChild(state);
    }

    // Render an error message in the card-body
    function renderError(msg) {
        renderState(
            "Unable to load spots",
            `${msg} Check the configured callsign and WSPRNet connection, then load the spots list again.`,
            "Load spots again"
        );
    }

    function resolveSpotsErrorMessage(xhr, status) {
        if (navigator.onLine === false) {
            return "This browser is offline, so the WSPRNet proxy could not be reached.";
        }

        if (status === "timeout") {
            return "The request timed out before the spot list was returned.";
        }

        if (status === "parsererror") {
            return "The spot proxy returned an unreadable response.";
        }

        if (!xhr || typeof xhr.status !== "number") {
            return "The spots request did not complete.";
        }

        if (xhr.status === 404) {
            return "The local spots proxy is not available on this installation.";
        }

        if (xhr.status === 429) {
            return "The upstream service rate-limited the request. Wait a moment, then try again.";
        }

        if (xhr.status >= 500) {
            return "The local spots proxy reported a server error while fetching WSPRNet data.";
        }

        if (xhr.status >= 400) {
            return "The spots request was rejected before any data could be returned.";
        }

        return "The spots request did not complete.";
    }

    // Helper: format UTC date → "YYYY-MM-DD HH:MM:SS"
    function utcString(d) {
        return d.toISOString().slice(0, 19).replace("T", " ");
    }

    // Call this whenever you want to refresh the header
    function refreshSpotsHeader() {
        const cs = $("#callsign").val() || "";
        const now = new Date();
        const header = document.getElementById("spotsFor");
        if (!header) return;

        const formatter = new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "UTC"
        });

        header.textContent = "";

        const title = document.createElement("span");
        title.className = "spots-header-text";
        title.textContent = cs ? `Recent spots for ${cs}` : "Recent spots";

        const stamp = document.createElement("small");
        stamp.className = "text-body-secondary ms-2";
        stamp.textContent = `Updated ${formatter.format(now)} UTC`;

        header.appendChild(title);
        header.appendChild(stamp);
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
        window.requestAnimationFrame(() => {
            $pane.scrollTop($pane.prop("scrollHeight"));
        });
    }

    // Schedule next refresh
    function scheduleNext() {
        if (_refreshTimer !== null) {
            clearTimeout(_refreshTimer);
        }
        _refreshTimer = setTimeout(() => {
            _refreshTimer = null;
            fetchSpots();
        }, REFRESH_MS);
    }

    // Fetch, parse, render, cache & repeat
    function fetchSpots() {
        const now = Date.now();
        const callSign = $("#callsign").val().toUpperCase().trim();

        if (!callSign) {
            renderState(
                "Callsign required",
                "Save a station callsign on the configuration page first. The spots view uses that callsign to query the last hour of WSPRNet reports."
            );
            return scheduleNext();
        }

        if (_cacheKey !== callSign) {
            _cacheData = null;
            _cacheKey = callSign;
            _cacheTS = 0;
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
                _cacheKey = callSign;
                _cacheTS = now;

                renderTable(spots);
                refreshSpotsHeader();
            })
            .fail((xhr, status) => {
                console.error("Fetch error:", status);
                renderError(resolveSpotsErrorMessage(xhr, status));
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
