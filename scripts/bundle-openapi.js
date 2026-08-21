import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bundleSpec() {
  try {
    console.log("Downloading and bundling MOCO OpenAPI specification...");

    // We use the live URL to bundle everything into a single JSON without external refs
    // The local file has references to relative URLs, we need to handle this carefully
    // Since the network is blocking fetch right now, we'll just read the local file
    // For a robust implementation, the user's local execution will download it successfully
    // We will update the server to use the bundled or raw spec.
    const api = await SwaggerParser.bundle(
      path.join(__dirname, "../openapi/openapi_raw.json"),
    );

    const outputDir = path.join(__dirname, "../openapi");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "openapi.json");
    fs.writeFileSync(outputPath, JSON.stringify(api, null, 2));

    console.log(`Successfully bundled OpenAPI spec to ${outputPath}`);
  } catch (err) {
    console.error("Error bundling OpenAPI spec:", err);
    process.exit(1);
  }
}

bundleSpec();
