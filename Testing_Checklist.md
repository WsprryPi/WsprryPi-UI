WsprryPi-UI unified shell browser test checklist

Preparation
- Start the UI the same way you normally do.
- Open browser dev tools.
- Keep Console and Network visible.
- Hard refresh before the first test.
- Record any JS errors, failed requests, redirect loops, or missing assets.

General pass
- Open data/index.php
- Confirm only one main card is visible.
- Confirm the page title matches the selected view.
- Confirm the navbar shows the current view as disabled/current.
- Confirm there are no obvious layout regressions.
- Confirm no unexpected console errors appear on initial load.

Configuration view
- Open data/index.php
- Confirm the Configuration card appears.
- Confirm the layout looks the same as before.
- Confirm the mode toggle works.
- Confirm the Radio, Transmitter Hardware, and Pi Hardware tabs switch correctly.
- Confirm config data loads into the form.
- Confirm Save works.
- Confirm Reset restores the saved state.
- Confirm Enable Transmit toggle behaves normally.
- Confirm Stop button behaves normally.
- Confirm Test Tone modal opens.
- Confirm Test Tone Start works as expected.
- Confirm Test Tone End works as expected.
- Confirm Test Tone Close closes the modal.
- Confirm tooltips still work where expected.
- Watch Console and Network for JS errors or failed requests.

Logs view
- Open data/index.php?view=logs
- Confirm only the Logs card is visible.
- Confirm Configuration controls are not present.
- Confirm Logs CSS styling looks correct.
- Confirm the status badge appears.
- Confirm Connect works.
- Confirm Reconnect works.
- Confirm Clear works.
- Confirm log lines stream in normally.
- Confirm Jump to bottom appears when expected and works.
- Navigate away to another view and back to Logs using the navbar.
- Confirm Logs still initializes correctly after returning.
- Watch Console and Network for SSE errors, duplicate connections, or JS errors.

Spots view
- Open data/index.php?view=spots
- Confirm only the Spots card is visible.
- Confirm Logs and Configuration controls are not present.
- Confirm the card title/header is correct.
- Confirm the callsign-driven spot lookup still runs.
- Confirm results render normally.
- Confirm refresh/update behavior still works.
- Navigate away and back using the navbar.
- Confirm Spots still initializes correctly after returning.
- Watch Console and Network for failed fetches or JS errors.

Maintenance view
- Open data/index.php?view=maintenance
- Confirm only the Maintenance card is visible.
- Confirm the two maintenance actions are present.
- Trigger Repair Configuration.
- Confirm toast behavior appears as expected.
- Confirm overlay behavior appears as expected.
- Confirm interaction is blocked while the overlay is meant to be active.
- Trigger Reset to Stock.
- Confirm toast behavior appears as expected.
- Confirm overlay behavior appears as expected.
- Navigate away and back using the navbar.
- Confirm Maintenance still initializes correctly after returning.
- Watch Console and Network for JS errors or failed requests.

Navbar and single-view behavior
- Starting from Configuration, use the navbar to go to Logs, Spots, Maintenance, then back to Configuration.
- At each step confirm only one main card is visible.
- Confirm no stale controls from a previous view remain on screen.
- Confirm the page title changes appropriately.
- Confirm the disabled/current navbar item updates appropriately.
- Repeat the sequence quickly once to catch any stale JS initialization issues.

Legacy wrapper redirects
- Open:
  - data/view_logs.php
  - data/view_spots.php
  - data/maintenance.php
- Confirm each redirects to index.php?view=...
- Then test with query strings, for example:
  - data/view_logs.php?foo=1&a=2&a=3&encoded=x%2By
  - data/view_spots.php?foo=1&a=2&a=3&encoded=x%2By
  - data/maintenance.php?foo=1&a=2&a=3&encoded=x%2By
- Confirm the redirect target keeps the original query string content and appends view=...
- Confirm there is no redirect loop.

Theme behavior
- Confirm Configuration initially starts with the same theme behavior it had before.
- Confirm Logs initially starts with the same theme behavior it had before.
- Confirm Spots initially starts with the same theme behavior it had before.
- Confirm Maintenance initially starts with the same theme behavior it had before.
- Confirm there is no flash of the wrong theme that is worse than before.

Final sanity check
- Reload each view directly by URL:
  - data/index.php
  - data/index.php?view=logs
  - data/index.php?view=spots
  - data/index.php?view=maintenance
- Confirm each loads correctly without requiring a prior visit to another view.
- Confirm there are no missing CSS or JS files in Network.
- Confirm there are no uncaught errors in Console.

Failure notes template
- URL tested:
- Action performed:
- Expected result:
- Actual result:
- Console errors:
- Network failures:
- Steps to reproduce again:
