#!/usr/bin/env node
/**
 * Patch oxc-parser to add a runtime check before attempting raw transfer.
 * oxc-parser's raw transfer requires a ~6GB ArrayBuffer (2GB buffer + 4GB alignment),
 * but V8's ArrayBuffer is limited to ~2GB, causing a crash on most systems.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MARKER = "// patched: runtime ArrayBuffer check";
const PATCH_TARGET = "function rawTransferRuntimeSupported() {\n  let global;";
const PATCH_REPLACEMENT = `function rawTransferRuntimeSupported() {\n  ${MARKER}\n  try { new ArrayBuffer(6 * 1024 * 1024 * 1024); } catch { return false; }\n\n  let global;`;

const filesToPatch = [
  join(__dirname, "../node_modules/oxc-parser/src-js/raw-transfer/supported.js"),
  join(__dirname, "../node_modules/knip/node_modules/oxc-parser/src-js/raw-transfer/supported.js"),
];

for (const file of filesToPatch) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (content.includes(MARKER)) {
    continue;
  }

  if (!content.includes(PATCH_TARGET)) {
    console.warn(`patch-oxc-parser: target not found in ${file}, skipping`);
    continue;
  }

  writeFileSync(file, content.replace(PATCH_TARGET, PATCH_REPLACEMENT));
  console.log(`patch-oxc-parser: patched ${file}`);
}
