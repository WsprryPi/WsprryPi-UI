const overlay = document.getElementById("maintenanceOverlay");

function lockUI() {
    overlay.classList.remove("d-none");
}

function unlockUI() {
    overlay.classList.add("d-none");
}

document.addEventListener("DOMContentLoaded", () => {
    const repairButton = document.getElementById("repairConfigButton");
    const restoreButton = document.getElementById("restoreConfigButton");
    const globalToastContainer =
        document.getElementById("globalToastContainer");

    /**
     * Removes any existing toasts from the global container.
     *
     * @returns {void}
     */
    function clearToasts() {
        globalToastContainer.innerHTML = "";
    }

    /**
     * Builds and shows a Bootstrap toast in the global container.
     *
     * The toast includes a centered OK button and auto-hides after
     * 10 seconds.
     *
     * @param {string} message Toast message text
     * @param {string} type Bootstrap semantic type
     * @returns {void}
     */
    function showToast(message, type) {
        clearToasts();

        const typeMap = {
            success: "border-success text-success",
            danger: "border-danger text-danger",
            warning: "border-warning text-warning",
            info: "border-info text-info"
        };

        const classes = typeMap[type] || typeMap.info;

        const toastWrapper = document.createElement("div");

        toastWrapper.innerHTML = `
            <div class="toast ${classes} border shadow-sm bg-white"
                 role="alert"
                 aria-live="assertive"
                 aria-atomic="true">
                <div class="toast-body text-center">
                    <div class="mb-3">${message}</div>

                    <div class="d-flex justify-content-center">
                        <button type="button"
                                class="btn btn-sm btn-outline-secondary maintenance-toast-ok">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `.trim();

        const toastElement = toastWrapper.firstElementChild;
        globalToastContainer.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 10000
        });

        toastElement
            .querySelector(".maintenance-toast-ok")
            .addEventListener("click", () => {
                toast.hide();
            });

        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove();
            unlockUI();
        });

        lockUI();
        toast.show();
    }

    /**
     * Sets both maintenance buttons enabled or disabled.
     *
     * @param {boolean} disabled True to disable buttons
     * @returns {void}
     */
    function setButtonsDisabled(disabled) {
        repairButton.disabled = disabled;
        restoreButton.disabled = disabled;
    }

    /**
     * Sets a temporary working label on the active button.
     *
     * @param {HTMLButtonElement} button Button being acted on
     * @param {string} text Temporary text
     * @returns {void}
     */
    function setButtonWorkingState(button, text) {
        button.dataset.originalText = button.textContent;
        button.textContent = text;
    }

    /**
     * Restores the original label on the provided button.
     *
     * @param {HTMLButtonElement} button Button to restore
     * @returns {void}
     */
    function restoreButtonText(button) {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }

    /**
     * Attempts to reload the current configuration from the backend.
     *
     * @returns {Promise<boolean>} True if reload succeeded
     */
    async function refreshConfig() { 
        try {
            const response = await fetch(SETTINGS_URL, {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                return false;
            }

            await response.json();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sends a repair or restore request to the backend.
     *
     * @param {string} verb Requested backend verb
     * @param {HTMLButtonElement} button Button that initiated the request
     * @returns {Promise<void>}
     */
    async function postRepairVerb(verb, button) {
        const isRepair = verb === "repair";

        const workingText = isRepair
            ? "Repairing Configuration..."
            : "Restoring to Stock...";

        const successText = isRepair
            ? "Configuration repaired successfully."
            : "Configuration restored to stock successfully.";

        const fallbackFailureText = isRepair
            ? "Configuration repair failed."
            : "Configuration restore failed.";

        showToast("Processing request...", "info");
        setButtonWorkingState(button, workingText);

        try {
            const response = await fetch(REPAIR_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ verb })
            });

            let data = null;

            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                const message =
                    data && data.message
                        ? data.message
                        : fallbackFailureText;

                showToast(message, "danger");
                return;
            }

            const configReloaded = await refreshConfig();

            if (configReloaded) {
                showToast(successText, "success");
            } else {
                showToast(
                    `${successText} The updated configuration could not be reloaded.`,
                    "warning"
                );
            }
        } catch {
            showToast(
                "Unable to contact the server for the configuration operation.",
                "danger"
            );
        } finally {
            restoreButtonText(button);
        }
    }

    repairButton.addEventListener("click", () => {
        postRepairVerb("repair", repairButton);
    });

    restoreButton.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Restore configuration to stock defaults? This will replace the current configuration."
        );

        if (confirmed) {
            postRepairVerb("restore", restoreButton);
        }
    });
});
