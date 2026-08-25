#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printUsage() {
  console.error(
    [
      "Usage: node scripts/bundle-openapi.js <source>",
      "   or: MOCO_OPENAPI_SOURCE=<source> node scripts/bundle-openapi.js",
      "",
      "<source> can be a URL to the MOCO OpenAPI spec or a local file path.",
      "The spec is fully dereferenced (all $ref resolved) and written to openapi/openapi.json.",
    ].join("\n"),
  );
}

async function bundleSpec(source) {
  console.log(`Fetching and dereferencing MOCO OpenAPI spec from: ${source}`);

  // dereference (not bundle) resolves every $ref inline, matching what
  // src/index.ts expects: a fully self-contained spec with no $ref left.
  const api = await SwaggerParser.dereference(source);

  const outputDir = path.join(__dirname, "../openapi");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(api, null, 2));

  console.log(`Successfully wrote dereferenced OpenAPI spec to ${outputPath}`);
}

const source = process.argv[2] || process.env.MOCO_OPENAPI_SOURCE;

if (!source) {
  printUsage();
  process.exit(1);
}

bundleSpec(source).catch((err) => {
  console.error("Error bundling OpenAPI spec:", err);
  process.exit(1);
});
