"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const WebSocket = require("ws");

const UI_ROOT = path.resolve(__dirname, "..");

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            server.close((error) => error ? reject(error) : resolve(port));
        });
    });
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => {
                try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
            });
        }).on("error", reject);
    });
}

function getStatus(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            response.resume();
            response.on("end", () => resolve(response.statusCode));
        }).on("error", reject);
    });
}

async function waitFor(check, description, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const value = await check();
            if (value) return value;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

async function terminate(child) {
    if (!child || child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise((resolve) => {
        child.once("exit", resolve);
        setTimeout(resolve, 2000);
    });
}

class CdpClient {
    constructor(url) {
        this.socket = new WebSocket(url);
        this.nextId = 1;
        this.pending = new Map();
        this.socket.on("message", (raw) => {
            const message = JSON.parse(raw);
            if (!message.id || !this.pending.has(message.id)) return;
            const { resolve, reject } = this.pending.get(message.id);
            this.pending.delete(message.id);
            if (message.error) reject(new Error(message.error.message));
            else resolve(message.result);
        });
    }
    async open() {
        if (this.socket.readyState === WebSocket.OPEN) return;
        await new Promise((resolve, reject) => {
            this.socket.once("open", resolve);
            this.socket.once("error", reject);
        });
    }
    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
    close() { this.socket.close(); }
}

async function captureConflictScreenshot(client, outputPath, tabId, selector) {
    await client.send("Runtime.evaluate", {
        expression: `(() => {
            document.getElementById("transmit_backend").value = "gpio";
            document.getElementById("tx_pin").value = "4";
            setLEDPin(4);
            document.getElementById("use_led").checked = true;
            refreshGpioConflictOptions();
            validateGpioConflictFields();
            const tab = document.getElementById(${JSON.stringify(tabId)});
            document.querySelectorAll("#configTabs .nav-link").forEach((item) => {
                item.classList.toggle("active", item === tab);
                item.setAttribute("aria-selected", item === tab ? "true" : "false");
            });
            document.querySelectorAll("#configTabsContent > .tab-pane").forEach((pane) => {
                const selected = "#" + pane.id === tab.getAttribute("data-bs-target");
                pane.classList.toggle("active", selected);
                pane.classList.toggle("show", selected);
            });
            document.querySelectorAll(".toast.show").forEach((toast) => toast.classList.remove("show"));
        })()`,
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await client.send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
    const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
    });
    fs.writeFileSync(outputPath, screenshot.data, "base64");
}

async function browserTest() {
    const fail = (message) => { throw new Error(message); };
    const equal = (actual, expected, message) => {
        if (actual !== expected) fail(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    };
    const ok = (condition, message) => { if (!condition) fail(message); };

    class FakeClock {
        constructor() { this.now = 0; this.nextId = 1; this.tasks = new Map(); }
        setTimeout(callback, delay = 0) {
            const id = this.nextId++;
            this.tasks.set(id, { callback, due: this.now + Number(delay || 0) });
            return id;
        }
        clearTimeout(id) { this.tasks.delete(id); }
        tick(milliseconds) {
            const end = this.now + milliseconds;
            while (true) {
                const ready = [...this.tasks.entries()]
                    .filter(([, task]) => task.due <= end)
                    .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
                if (!ready) break;
                const [id, task] = ready;
                this.tasks.delete(id);
                this.now = task.due;
                task.callback();
            }
            this.now = end;
        }
        reset() { this.now = 0; this.tasks.clear(); }
    }

    class ResolvedDeferred {
        done(callback) { callback(); return this; }
        fail() { return this; }
        always(callback) { callback(); return this; }
    }

    const clock = new FakeClock();
    window.setTimeout = clock.setTimeout.bind(clock);
    window.clearTimeout = clock.clearTimeout.bind(clock);
    const patches = [];
    ajaxWithEndpointFallback = (endpoint, options) => {
        patches.push({ endpoint, options });
        return new ResolvedDeferred();
    };
    showBackendStatus = () => {};
    clearBackendStatus = () => {};
    persistLocalConfigDraftIfPossible = () => {};
    removePersistedConfigDraft = () => {};

    const field = (id) => document.getElementById(id);
    const roles = ["band", "led", "shutdown", "amp"];
    const bandRow = () => document.querySelector('#bandGpioTable tr[data-band="20m"]');

    const reset = (backend, txPin, transmit) => {
        clock.reset();
        patches.length = 0;
        configAutosaveTimer = null;
        configSaveStatusClearTimer = null;
        configAutosaveSuspended = false;
        configAutosaveInFlight = false;
        configAutosavePendingAfterFlight = false;
        configAutosaveDirty = false;
        lastSavedConfigPayload = "";
        lastFailedConfigPayload = "";
        lastFailedConfigMessage = "";
        field("transmit_backend").value = backend;
        field("tx_pin").value = String(txPin);
        field("tx_pin").disabled = false;
        window.conditionalGpioTestTransmitState = transmit;
        field("use_led").checked = false;
        field("ledDropdownButton").disabled = false;
        setLEDPin(18);
        field("use_shutdown").checked = false;
        field("shutdownDropdownButton").disabled = false;
        setShutdownPin(19);
        setUseAmp(false);
        setAmpPin(-1);
        populateBandGpioForm({});
        refreshGpioConflictOptions();
        validateGpioConflictFields();
    };

    const assignRole = (role, pin, enabled) => {
        if (role === "band") {
            const row = bandRow();
            const option = row.querySelector(`.band-gpio-input option[value="${pin}"]`);
            option.disabled = false;
            option.hidden = false;
            row.querySelector(".band-gpio-input").value = String(pin);
            row.querySelector(".band-gpio-enabled").checked = enabled;
            row.querySelector(".band-gpio-active-high").checked = true;
            setBandGpioRowState($(row), enabled);
        } else if (role === "led") {
            setLEDPin(pin);
            field("use_led").checked = enabled;
        } else if (role === "shutdown") {
            setShutdownPin(pin);
            field("use_shutdown").checked = enabled;
        } else {
            setAmpPin(pin);
            setUseAmp(enabled);
            field("ampDropdownButton").disabled = !enabled;
        }
        refreshGpioConflictOptions();
    };

    const roleField = (role) => {
        if (role === "band") return bandRow().querySelector(".band-gpio-input");
        if (role === "led") return field("ledDropdownButton");
        if (role === "shutdown") return field("shutdownDropdownButton");
        return field("ampDropdownButton");
    };
    const validationMessage = (control) =>
        control.dataset.validationMessage || control.validationMessage;

    const ordinaryOption = (role, pin) => {
        if (role === "band") {
            return bandRow().querySelector(`.band-gpio-input option[value="${pin}"]`);
        }
        const buttonId = role === "led"
            ? "ledDropdownButton"
            : role === "shutdown" ? "shutdownDropdownButton" : "ampDropdownButton";
        return document.querySelector(`[aria-labelledby="${buttonId}"] [data-val="GPIO${pin}"]`);
    };

    validatePage = () => validateGpioConflictFields();

    let matrixCases = 0;
    for (const transmit of [false, true]) {
        for (const txPin of [4, 20]) {
            const availablePin = txPin === 4 ? 20 : 4;
            for (const role of roles) {
                reset("gpio", txPin, transmit);
                ok(ordinaryOption(role, txPin).disabled, `${role}: selected RF pin must be unavailable for new selection`);
                ok(!ordinaryOption(role, availablePin).disabled, `${role}: other GPCLK0 pin must remain available`);

                assignRole(role, txPin, true);
                const message = `GPIO${txPin} is reserved by GPIO RF Output.`;
                ok(!validateGpioConflictFields(), `${role}: retained RF conflict must be invalid`);
                equal(
                    validationMessage(roleField(role)),
                    message,
                    `${role}: exact ordinary-field message (led=${getLEDPin()}, useLed=${field("use_led").checked}, rf=${getReservedGpioRfOutputPin()}, disabled=${roleField(role).disabled})`
                );
                equal(roleField(role).getAttribute("aria-invalid"), "true", `${role}: ordinary aria-invalid`);
                equal(field("tx_pin").validationMessage, message, `${role}: exact transmit-pin message`);
                equal(field("tx_pin").getAttribute("aria-invalid"), "true", `${role}: transmit aria-invalid`);
                equal(field("tx-pin-error").textContent, message, `${role}: visible transmit-pin error`);
                ok(!field("tx-pin-error").hidden, `${role}: transmit-pin error must be visible`);
                const roleError = role === "band"
                    ? field("band-gpio-gpio-20m-error")
                    : field(`${role}-pin-error`);
                equal(roleError.textContent, message, `${role}: visible ordinary-field error`);
                ok(!roleError.hidden, `${role}: ordinary-field error must be visible`);
                ok(!ordinaryOption(role, txPin).hidden, `${role}: retained invalid option must remain visible`);

                assignRole(role, txPin, false);
                ok(validateGpioConflictFields(), `${role}: disabled retained ordinary role must recover`);
                matrixCases++;
            }
        }
    }

    for (const retainedPin of [4, 20]) {
        for (const ordinaryPin of [4, 20]) {
            for (const role of roles) {
                reset("si5351", retainedPin, false);
                ok(!ordinaryOption(role, ordinaryPin).disabled, `${role}: Si5351 must leave GPIO${ordinaryPin} available`);
                assignRole(role, ordinaryPin, true);
                ok(validateGpioConflictFields(), `${role}: Si5351 retained TX pin must not conflict`);
                matrixCases++;
            }
        }
    }

    reset("gpio", 20, false);
    assignRole("led", 4, true);
    refreshTransmitGpioOptions();
    ok(field("tx_pin").querySelector('option[value="4"]').disabled,
        "ordinary assignment first must make that RF transmit choice unavailable");
    field("tx_pin").querySelector('option[value="4"]').disabled = false;
    field("tx_pin").value = "4";
    refreshGpioConflictOptions();
    ok(!validateGpioConflictFields(), "programmatically retained reverse-direction conflict must remain visible and invalid");

    scheduleAutosave();
    clock.tick(800);
    equal(patches.length, 0, "invalid GPIO ownership must block autosave");
    equal(field("configSaveStatus").textContent, "Invalid - not saved", "invalid ownership status");
    field("transmit_backend").value = "si5351";
    clickTransmitBackend();
    clock.tick(800);
    equal(patches.length, 1, "changing to Si5351 must recover and resume autosave");
    ok(field("tx_pin").getAttribute("aria-invalid") !== "true", "recovery must clear transmit aria-invalid");
    equal(field("ledDropdownButton").getAttribute("aria-invalid"), "false", "recovery must clear ordinary aria-invalid");

    reset("gpio", 4, false);
    const sharedRows = ["20m", "40m"].map((band) =>
        document.querySelector(`#bandGpioTable tr[data-band="${band}"]`));
    sharedRows.forEach((row) => {
        row.querySelector(".band-gpio-input").value = "20";
        row.querySelector(".band-gpio-enabled").checked = true;
        row.querySelector(".band-gpio-active-high").checked = true;
        setBandGpioRowState($(row), true);
    });
    ok(validateGpioConflictFields(), "same-pin Band GPIO sharing with matching polarity must remain valid");
    sharedRows[1].querySelector(".band-gpio-active-high").checked = false;
    ok(!validateGpioConflictFields(), "same-pin Band GPIO sharing with conflicting polarity must remain invalid");

    return { matrixCases, patches: patches.length, assertions: "passed" };
}

async function main() {
    const phpPort = await freePort();
    const debugPort = await freePort();
    const php = spawn("php", ["-S", `127.0.0.1:${phpPort}`, "-t", "data"], {
        cwd: UI_ROOT,
        stdio: "ignore",
    });
    const profileDir = `/tmp/wsprrypi-conditional-gpio-test-${process.pid}`;
    let chromium;
    let client;
    try {
        await waitFor(async () => await getStatus(
            `http://127.0.0.1:${phpPort}/index.php?page=config`) === 200,
        "local PHP fixture");
        chromium = spawn("chromium", [
            "--headless", "--no-sandbox", "--disable-gpu",
            `--remote-debugging-port=${debugPort}`,
            `--user-data-dir=${profileDir}`,
            `http://127.0.0.1:${phpPort}/index.php?page=config`,
        ], { stdio: "ignore" });

        const page = await waitFor(async () => {
            const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
            return pages.find((item) => item.type === "page");
        }, "Setup page in Chromium");
        client = new CdpClient(page.webSocketDebuggerUrl);
        await client.open();
        await waitFor(async () => {
            const result = await client.send("Runtime.evaluate", {
                expression: "typeof refreshGpioConflictOptions === 'function' && document.readyState === 'complete'",
                returnByValue: true,
            });
            return result.result.value === true;
        }, "GPIO configuration scripts");

        const result = await client.send("Runtime.evaluate", {
            expression: `(${browserTest.toString()})()`,
            awaitPromise: true,
            returnByValue: true,
        });
        if (result.exceptionDetails) {
            const detail = result.exceptionDetails.exception && result.exceptionDetails.exception.description;
            throw new Error(detail || result.exceptionDetails.text || "Browser test failed");
        }
        assert.deepEqual(result.result.value, {
            matrixCases: 32,
            patches: 0,
            assertions: "passed",
        });
        if (process.env.WSPRRYPI_CONDITIONAL_GPIO_SCREENSHOT_DIR) {
            const screenshotDir = process.env.WSPRRYPI_CONDITIONAL_GPIO_SCREENSHOT_DIR;
            fs.mkdirSync(screenshotDir, { recursive: true });
            await client.send("Emulation.setDeviceMetricsOverride", {
                width: 1440,
                height: 1200,
                deviceScaleFactor: 1,
                mobile: false,
            });
            await captureConflictScreenshot(
                client,
                path.join(screenshotDir, "GPIO_RF_Conflict.png"),
                "transmitter-hardware-tab",
                "#gpio-backend-panel"
            );
            await captureConflictScreenshot(
                client,
                path.join(screenshotDir, "TX_LED_RF_Conflict.png"),
                "pi-hardware-tab",
                "#pi-hardware-pane > fieldset:first-of-type"
            );
        }
        console.log("conditional_transmit_gpio_integration_test passed");
    } finally {
        if (client) client.close();
        await terminate(chromium);
        await terminate(php);
        fs.rmSync(profileDir, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
