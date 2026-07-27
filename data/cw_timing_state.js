(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.CwTimingState = api;
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const SPEEDS = Object.freeze({ QRSS1: 1, QRSS3: 3, QRSS6: 6 });
    const CONVENTIONAL_STANDARD = Object.freeze({
        intraElement: 1,
        interCharacter: 3,
        interWord: 7,
    });
    const DFCW_STANDARD = Object.freeze({
        intraElement: 0.333333,
        interCharacter: 1,
        interWord: 3,
    });

    function positiveFinite(value) {
        const text = typeof value === "string" ? value.trim() : value;
        const parsed = text === "" ? NaN : Number(text);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    function inferSpeed(value) {
        const parsed = positiveFinite(value);
        if (parsed === 1) return "QRSS1";
        if (parsed === 3) return "QRSS3";
        if (parsed === 6) return "QRSS6";
        return parsed === null ? "QRSS3" : "Advanced";
    }

    function activeGroup(mode) {
        return String(mode).toUpperCase() === "DFCW" ? "dfcw" : "conventional";
    }

    function standardForGroup(group) {
        return group === "dfcw" ? DFCW_STANDARD : CONVENTIONAL_STANDARD;
    }

    function tripletIsValid(triplet) {
        return !!triplet && ["intraElement", "interCharacter", "interWord"]
            .every((key) => positiveFinite(triplet[key]) !== null);
    }

    function inferSpacing(group, triplet) {
        if (!tripletIsValid(triplet)) return "Advanced";
        const standard = standardForGroup(group);
        return triplet.intraElement === standard.intraElement &&
            triplet.interCharacter === standard.interCharacter &&
            triplet.interWord === standard.interWord
            ? "Standard"
            : "Advanced";
    }

    function cloneTriplet(triplet) {
        return {
            intraElement: triplet.intraElement,
            interCharacter: triplet.interCharacter,
            interWord: triplet.interWord,
        };
    }

    function cloneState(state) {
        return {
            dotSeconds: state.dotSeconds,
            conventional: cloneTriplet(state.conventional),
            dfcw: cloneTriplet(state.dfcw),
        };
    }

    function applySpeed(state, speed) {
        const next = cloneState(state);
        if (Object.prototype.hasOwnProperty.call(SPEEDS, speed)) {
            next.dotSeconds = SPEEDS[speed];
        }
        return next;
    }

    function applySpacing(state, mode, spacing) {
        const next = cloneState(state);
        const group = activeGroup(mode);
        if (spacing === "Standard") {
            next[group] = cloneTriplet(standardForGroup(group));
        }
        return next;
    }

    function gapDurations(dotSeconds, triplet) {
        const dot = positiveFinite(dotSeconds);
        if (dot === null || !tripletIsValid(triplet)) return null;
        return {
            intraElement: dot * triplet.intraElement,
            interCharacter: dot * triplet.interCharacter,
            interWord: dot * triplet.interWord,
        };
    }

    function invalidFields(state) {
        const invalid = [];
        if (positiveFinite(state.dotSeconds) === null) invalid.push("dotSeconds");
        ["conventional", "dfcw"].forEach((group) => {
            ["intraElement", "interCharacter", "interWord"].forEach((key) => {
                if (positiveFinite(state[group][key]) === null) invalid.push(`${group}.${key}`);
            });
        });
        return invalid;
    }

    function isValid(state) {
        return invalidFields(state).length === 0;
    }

    function serialize(state) {
        return {
            "Dot Seconds": state.dotSeconds,
            "Intra Element Gap": state.conventional.intraElement,
            "Inter Character Gap": state.conventional.interCharacter,
            "Inter Word Gap": state.conventional.interWord,
            "DFCW Intra Element Gap": state.dfcw.intraElement,
            "DFCW Inter Character Gap": state.dfcw.interCharacter,
            "DFCW Inter Word Gap": state.dfcw.interWord,
        };
    }

    return Object.freeze({
        SPEEDS,
        CONVENTIONAL_STANDARD,
        DFCW_STANDARD,
        positiveFinite,
        inferSpeed,
        activeGroup,
        standardForGroup,
        tripletIsValid,
        inferSpacing,
        cloneState,
        applySpeed,
        applySpacing,
        gapDurations,
        invalidFields,
        isValid,
        serialize,
    });
}));
