"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const uiRoot = path.resolve(__dirname, "..");
const siteScript = fs.readFileSync(path.join(uiRoot, "data/site.js"), "utf8");

function findMatchingBrace(source, openingBraceIndex) {
    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let index = openingBraceIndex; index < source.length; index += 1) {
        const character = source[index];
        const nextCharacter = source[index + 1];

        if (lineComment) {
            if (character === "\n") lineComment = false;
            continue;
        }
        if (blockComment) {
            if (character === "*" && nextCharacter === "/") {
                blockComment = false;
                index += 1;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === quote) {
                quote = "";
            }
            continue;
        }
        if (character === "/" && nextCharacter === "/") {
            lineComment = true;
            index += 1;
            continue;
        }
        if (character === "/" && nextCharacter === "*") {
            blockComment = true;
            index += 1;
            continue;
        }
        if (["'", "\"", "`"].includes(character)) {
            quote = character;
            continue;
        }
        if (character === "{") {
            depth += 1;
        } else if (character === "}") {
            depth -= 1;
            if (depth === 0) return index;
        }
    }

    throw new Error("Unterminated source block in data/site.js");
}

function extractFunctionSource(name) {
    const declaration = `function ${name}(`;
    const start = siteScript.indexOf(declaration);
    assert.notEqual(start, -1, `${name} must remain available in data/site.js`);
    const openingBrace = siteScript.indexOf("{", start + declaration.length);
    assert.notEqual(openingBrace, -1, `${name} must have a function body`);
    return siteScript.slice(start, findMatchingBrace(siteScript, openingBrace) + 1);
}

function extractBandFrequencyTableSource(parserSource) {
    const declaration = "const bandFrequencies =";
    const declarationIndex = parserSource.indexOf(declaration);
    assert.notEqual(declarationIndex, -1, "WSPR parser must retain its bandFrequencies table");
    const openingBrace = parserSource.indexOf("{", declarationIndex + declaration.length);
    assert.notEqual(openingBrace, -1, "WSPR parser bandFrequencies table must be an object");
    return parserSource.slice(openingBrace, findMatchingBrace(parserSource, openingBrace) + 1);
}

function tableAliasEntries(tableSource) {
    const entries = [];
    const entryPattern = /^\s*(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*(\d+)\s*,?\s*$/gm;
    let match;

    while ((match = entryPattern.exec(tableSource)) !== null) {
        entries.push({ alias: match[1] || match[2], frequencyHz: Number(match[3]) });
    }

    assert.ok(entries.length > 0, "WSPR parser bandFrequencies table must contain simple alias-to-Hz entries");
    return entries;
}

// Keep this explicit temporary UI expectation table aligned with the backend's
// WSPRBandLookup defaults. The UI repository is independently check-outable,
// so this test intentionally exercises its real parser rather than importing a
// second source list. Remove it when wspr_band_catalog provides the catalog.
const canonicalWsprDialFrequenciesHz = {
    lf: 136000,
    "2200m": 136000,
    mf: 474200,
    "630m": 474200,
    "160m": 1836600,
    "80m": 3568600,
    "60m": 5287200,
    "40m": 7038600,
    "30m": 10138700,
    "22m": 13551500,
    "20m": 14095600,
    "17m": 18104600,
    "15m": 21094600,
    "12m": 24924600,
    "10m": 28124600,
    "6m": 50293000,
    "4m": 70091000,
    "2m": 144489000,
};

const parserSource = extractFunctionSource("parseConfiguredWsprFrequencyHz");
const productionTableSource = extractBandFrequencyTableSource(parserSource);
const productionAliasEntries = tableAliasEntries(productionTableSource);
const productionAliases = productionAliasEntries.map(({ alias }) => alias);
const expectedAliases = Object.keys(canonicalWsprDialFrequenciesHz);

assert.equal(
    new Set(productionAliases).size,
    productionAliases.length,
    "WSPR parser bandFrequencies table must not declare duplicate aliases"
);
assert.deepEqual(
    [...productionAliases].sort(),
    [...expectedAliases].sort(),
    "WSPR parser bandFrequencies aliases must exactly match the temporary backend-aligned catalog"
);

const context = {};
vm.createContext(context);
vm.runInContext(
    `${extractFunctionSource("parseOperationFrequencyWithOptionalUnits")}\n${parserSource}\n` +
        `globalThis.productionBandFrequencies = (${productionTableSource});`,
    context,
    { filename: "data/site.js" }
);
assert.deepEqual(
    [...Object.keys(context.productionBandFrequencies)].sort(),
    [...expectedAliases].sort(),
    "WSPR parser bandFrequencies object must not expose missing or unexpected aliases"
);

for (const [band, frequencyHz] of Object.entries(canonicalWsprDialFrequenciesHz)) {
    assert.equal(
        context.productionBandFrequencies[band],
        frequencyHz,
        `${band} must retain its canonical WSPR USB dial frequency in the production table`
    );
    assert.equal(
        context.parseConfiguredWsprFrequencyHz(band),
        frequencyHz,
        `${band} must resolve to its canonical WSPR USB dial frequency`
    );
}

assert.equal(
    context.parseConfiguredWsprFrequencyHz("0, 22m@GPIO, 20m"),
    canonicalWsprDialFrequenciesHz["22m"],
    "the first usable band alias, including a selector suffix, must retain dial-frequency semantics"
);
assert.equal(
    canonicalWsprDialFrequenciesHz["22m"] + 1500,
    13553000,
    "22m must produce the canonical 13,553,000 Hz tone when the standard WSPR offset is applied once"
);

console.log("wspr_band_frequency_correlation_test passed");
