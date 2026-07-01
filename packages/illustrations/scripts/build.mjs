#!/usr/bin/env node
/**
 * Validates illustration assets and ensures registry covers all SVG filenames.
 * Source SVGs use #ILLUSTRATION_PRIMARY / HIGHLIGHT / MUTED placeholders for reference.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../assets");
const registryPath = join(__dirname, "../src/registry.ts");

const registrySource = readFileSync(registryPath, "utf8");
const assetFiles = readdirSync(assetsDir).filter((file) => file.endsWith(".svg"));

for (const file of assetFiles) {
  const name = file.replace(/\.svg$/, "");
  const hasRegistryEntry =
    registrySource.includes(`"${name}"`) ||
    registrySource.includes(`${name}:`);
  if (!hasRegistryEntry) {
    console.warn(`[illustrations] asset ${file} has no registry entry`);
  }

  const svg = readFileSync(join(assetsDir, file), "utf8");
  for (const token of ["ILLUSTRATION_PRIMARY", "ILLUSTRATION_HIGHLIGHT", "ILLUSTRATION_MUTED"]) {
    if (!svg.includes(token)) {
      console.warn(`[illustrations] ${file} missing placeholder ${token}`);
    }
  }
}

console.log(`[illustrations] validated ${assetFiles.length} SVG assets`);
